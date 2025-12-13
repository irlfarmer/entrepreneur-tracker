"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  TagIcon,
  ShoppingBagIcon
} from "@heroicons/react/24/outline"

interface FinanceOverviewProps {
  userId: string
}

interface FinanceData {
  totalSales: number
  totalCogs: number
  saleRelatedExpenses: number
  businessExpenses: number
  grossProfit: number
  netProfit: number
  topCategory: { name: string; revenue: number; profit: number } | null
  topProduct: { name: string; revenue: number; profit: number; quantity: number } | null
  monthlyData: Array<{
    month: string
    year: number
    sales: number
    cogs: number
    saleExpenses: number
    businessExpenses: number
    grossProfit: number
    netProfit: number
  }>
}

export default function FinanceOverview({ userId }: FinanceOverviewProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const { currentBusiness } = useBusiness()
  const [loading, setLoading] = useState(true)
  const [financeData, setFinanceData] = useState<FinanceData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [viewType, setViewType] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchFinanceData()
  }, [userId, selectedMonth, selectedYear, viewType, currentBusiness])

  const fetchFinanceData = async () => {
    try {
      const params = new URLSearchParams({
        userId,
        businessId: currentBusiness.id,
        month: selectedMonth,
        year: selectedYear.toString(),
        viewType
      })

      // Add timeout to prevent hanging
      const response = await Promise.race([
        fetch(`/api/finance?${params}`),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ])

      const data = await response.json()

      if (data.success) {
        setFinanceData(data.data)
      } else {
        console.error('Finance API error:', data.error)
        // Set empty data as fallback
        setFinanceData({
          totalSales: 0,
          totalCogs: 0,
          saleRelatedExpenses: 0,
          businessExpenses: 0,
          grossProfit: 0,
          netProfit: 0,
          topCategory: null,
          topProduct: null,
          monthlyData: []
        })
      }
    } catch (error) {
      console.error('Error fetching finance data:', error)
      // Set empty data as fallback
      setFinanceData({
        totalSales: 0,
        totalCogs: 0,
        saleRelatedExpenses: 0,
        businessExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        topCategory: null,
        topProduct: null,
        monthlyData: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || currencyLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!financeData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No financial data available</p>
      </div>
    )
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const profitMargin = financeData.totalSales > 0 ? (financeData.netProfit / financeData.totalSales) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setViewType('monthly')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewType === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewType('yearly')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewType === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {viewType === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {months.map((month, index) => (
                  <option key={index} value={index.toString()}>
                    {month}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-50">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financeData.totalSales, currencyCode)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-red-50">
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">Total COGS</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financeData.totalCogs, currencyCode)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-50">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">Gross Profit</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financeData.grossProfit, currencyCode)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${financeData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <ChartBarIcon className={`h-6 w-6 ${financeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">Net Profit</h3>
              <p className={`text-2xl font-semibold ${financeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financeData.netProfit, currencyCode)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Sales Revenue</span>
              <span className="font-medium text-green-600">
                {formatCurrency(financeData.totalSales, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Less: Cost of Goods Sold</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(financeData.totalCogs, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Less: Sale-Related Expenses</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(financeData.saleRelatedExpenses, currencyCode)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Gross Profit</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(financeData.grossProfit, currencyCode)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Less: Business Expenses</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(financeData.businessExpenses, currencyCode)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Net Profit</span>
                <span className={`font-bold text-lg ${financeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financeData.netProfit, currencyCode)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Category</h3>
          {financeData.topCategory ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-50">
                  <TagIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {financeData.topCategory.name}
                  </h4>
                  <p className="text-sm text-gray-600">Best performing category</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(financeData.topCategory.revenue, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(financeData.topCategory.profit, currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TagIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Product</h3>
          {financeData.topProduct ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <ShoppingBagIcon className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {financeData.topProduct.name}
                  </h4>
                  <p className="text-sm text-gray-600">Best performing product</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(financeData.topProduct.revenue, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(financeData.topProduct.profit, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Units Sold</span>
                  <span className="font-medium text-blue-600">
                    {financeData.topProduct.quantity}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingBagIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance Trends</h3>
        <div className="space-y-4">
          {financeData.monthlyData.length > 0 ? (
            <div className="space-y-4">
              {financeData.monthlyData.map((monthData, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      {months[new Date(monthData.year, parseInt(monthData.month) - 1).getMonth()]} {monthData.year}
                    </h4>
                    <span className={`font-medium ${monthData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(monthData.netProfit, currencyCode)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sales</span>
                      <p className="font-medium text-gray-900">{formatCurrency(monthData.sales, currencyCode)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">COGS</span>
                      <p className="font-medium text-gray-900">{formatCurrency(monthData.cogs, currencyCode)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Expenses</span>
                      <p className="font-medium text-gray-900">{formatCurrency(monthData.businessExpenses + monthData.saleExpenses, currencyCode)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Profit</span>
                      <p className={`font-medium ${monthData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(monthData.netProfit, currencyCode)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No monthly data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 