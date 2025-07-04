"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CubeIcon,
  ShoppingBagIcon,
  PencilIcon
} from "@heroicons/react/24/outline"

interface ProfileViewProps {
  userId: string
}

interface UserStats {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  totalExpenses: number
}

export default function ProfileView({ userId }: ProfileViewProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    fetchUserData()
    fetchUserStats()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      if (data.success) {
        setUserData(data.data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      const [productsRes, salesRes, expensesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/expenses')
      ])

      const [productsData, salesData, expensesData] = await Promise.all([
        productsRes.json(),
        salesRes.json(),
        expensesRes.json()
      ])

      const totalRevenue = salesData.success 
        ? salesData.data.reduce((sum: number, sale: any) => sum + (sale.quantity * sale.unitSalePrice), 0)
        : 0

      const totalExpenses = expensesData.success
        ? expensesData.data.reduce((sum: number, expense: any) => sum + expense.amount, 0)
        : 0

      setUserStats({
        totalProducts: productsData.success ? productsData.data.length : 0,
        totalSales: salesData.success ? salesData.data.length : 0,
        totalRevenue,
        totalExpenses
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  const currency = userData?.settings?.currency || 'USD'
  const currencySymbol = getCurrencySymbol(currency)

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-3 rounded-full">
              <UserIcon className="h-12 w-12 text-blue-600" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{userData?.companyName || 'Company Name'}</h2>
              <p className="text-blue-100">{session?.user?.email}</p>
              <p className="text-blue-100 text-sm">{userData?.businessType || 'General Business'}</p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t">
          <Link
            href="/settings"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 mr-2" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <p className="mt-1 text-gray-900">{userData?.companyName || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Type</label>
              <p className="mt-1 text-gray-900">{userData?.businessType || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{session?.user?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <p className="mt-1 text-gray-900">{currencySymbol} {currency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <p className="mt-1 text-gray-900">{userData?.settings?.timezone || 'UTC'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="mt-1 text-gray-900 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Business Overview
        </h3>
        
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <CubeIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <ShoppingBagIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalSales}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{userStats.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{userStats.totalExpenses.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory/add"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Add Product
            </Link>
            <Link
              href="/sales/add"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Record Sale
            </Link>
            <Link
              href="/expenses/add"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Add Expense
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get currency symbol
function getCurrencySymbol(currencyCode: string): string {
  const currencyMap: { [key: string]: string } = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CHF: "CHF", CAD: "C$", MXN: "$",
    BRL: "R$", ARS: "$", CLP: "$", COP: "$", PEN: "S/", UYU: "$", VES: "Bs",
    NOK: "kr", SEK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
    RON: "lei", BGN: "лв", HRK: "kn", RSD: "дин", TRY: "₺", RUB: "₽", UAH: "₴",
    CNY: "¥", KRW: "₩", INR: "₹", SGD: "S$", HKD: "HK$", TWD: "NT$", THB: "฿",
    MYR: "RM", IDR: "Rp", PHP: "₱", VND: "₫", LAK: "₭", KHR: "៛", MMK: "K",
    AUD: "A$", NZD: "NZ$", FJD: "FJ$", AED: "د.إ", SAR: "﷼", QAR: "﷼",
    KWD: "د.ك", BHD: ".د.ب", OMR: "﷼", JOD: "د.ا", LBP: "£", ILS: "₪",
    IRR: "﷼", IQD: "ع.د", NGN: "₦", ZAR: "R", EGP: "£", KES: "KSh",
    UGX: "USh", TZS: "TSh", GHS: "₵", XOF: "CFA", XAF: "FCFA", ETB: "Br",
    BWP: "P", NAD: "N$", ZWL: "Z$", MUR: "₨", MAD: "د.م.", TND: "د.ت",
    DZD: "د.ج", LYD: "ل.د", PKR: "₨", BDT: "৳", LKR: "₨", NPR: "₨",
    AFN: "؋", KZT: "₸", UZS: "so'm", KGS: "лв", TJS: "SM", TMT: "T",
    MNT: "₮", ISK: "kr"
  }
  return currencyMap[currencyCode] || "$"
} 