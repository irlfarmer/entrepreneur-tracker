"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDate, getSaleQuantity, getSaleRevenue, getSaleProductName } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CubeIcon,
  ClockIcon
} from "@heroicons/react/24/outline"

interface RecentActivityProps {
  userId: string
}

interface ActivityItem {
  id: string
  type: 'sale' | 'expense' | 'product'
  title: string
  description: string
  amount?: number
  timestamp: Date
  icon: any
  color: string
}

export default function RecentActivity({ userId }: RecentActivityProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        // Fetch recent sales, expenses, and products
        const [salesRes, expensesRes] = await Promise.all([
          fetch(`/api/sales?userId=${userId}&limit=5`),
          fetch(`/api/expenses?userId=${userId}&limit=5`)
        ])

        const sales = await salesRes.json()
        const expenses = await expensesRes.json()

        const allActivities: ActivityItem[] = []

        // Add sales
        if (sales.success && sales.data) {
          sales.data.forEach((sale: any) => {
            const productName = getSaleProductName(sale)
            const quantity = getSaleQuantity(sale)
            const revenue = getSaleRevenue(sale)
            
            allActivities.push({
              id: sale._id,
              type: 'sale',
              title: `Sale: ${productName}`,
              description: `${quantity} units sold`,
              amount: revenue,
              timestamp: new Date(sale.saleDate),
              icon: CurrencyDollarIcon,
              color: 'text-green-600'
            })
          })
        }

        // Add expenses
        if (expenses.success && expenses.data) {
          expenses.data.forEach((expense: any) => {
            allActivities.push({
              id: expense._id,
              type: 'expense',
              title: `Expense: ${expense.category}`,
              description: expense.description,
              amount: expense.amount,
              timestamp: new Date(expense.expenseDate),
              icon: DocumentTextIcon,
              color: 'text-red-600'
            })
          })
        }

        // Sort by timestamp (most recent first) and take top 10
        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setActivities(allActivities.slice(0, 10))

      } catch (error) {
        console.error('Error fetching recent activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentActivity()
  }, [userId])

  if (loading || currencyLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-4">
        <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>

      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <activity.icon className={`h-4 w-4 ${activity.color}`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  {activity.amount && (
                    <p className={`text-sm font-medium ${activity.color}`}>
                      {activity.type === 'expense' ? '-' : '+'}
                      {formatCurrency(activity.amount, currencyCode)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(activity.timestamp, 'medium')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Start by adding products or recording sales</p>
          </div>
        )}
      </div>
    </div>
  )
} 