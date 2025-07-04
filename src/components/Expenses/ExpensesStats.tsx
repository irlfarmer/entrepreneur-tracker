"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TagIcon
} from "@heroicons/react/24/outline"

interface ExpensesStatsProps {
  userId: string
}

export default function ExpensesStats({ userId }: ExpensesStatsProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpenses()
  }, [userId])

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setExpenses(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || currencyLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const todayExpenses = expenses.filter(e => new Date(e.expenseDate) >= today)
  const weekExpenses = expenses.filter(e => new Date(e.expenseDate) >= weekAgo)
  const monthExpenses = expenses.filter(e => new Date(e.expenseDate) >= monthAgo)

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0)
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const allTimeTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Category breakdown
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]

  const avgMonthlyExpense = expenses.length > 0 ? monthTotal / Math.max(1, monthExpenses.length) : 0

  const stats = [
    {
      title: "Today's Expenses",
      value: formatCurrency(todayTotal, currencyCode),
      subtitle: `${todayExpenses.length} transactions`,
      icon: CurrencyDollarIcon,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Weekly Total",
      value: formatCurrency(weekTotal, currencyCode),
      subtitle: `${weekExpenses.length} expenses`,
      icon: CalendarDaysIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Monthly Total",
      value: formatCurrency(monthTotal, currencyCode),
      subtitle: `${monthExpenses.length} this month`,
      icon: ChartBarIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Top Category",
      value: topCategory ? topCategory[0] : "None",
      subtitle: topCategory ? formatCurrency(topCategory[1] as number, currencyCode) : "No expenses",
      icon: TagIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 