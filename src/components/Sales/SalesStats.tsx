"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalculatorIcon
} from "@heroicons/react/24/outline"

interface SalesStatsProps {
  userId: string
}

export default function SalesStats({ userId }: SalesStatsProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [userId])

  const fetchSales = async () => {
    try {
      const response = await fetch(`/api/sales?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setSales(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
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
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const todaySales = sales.filter(s => new Date(s.saleDate) >= today)
  const yesterdaySales = sales.filter(s => new Date(s.saleDate) >= yesterday && new Date(s.saleDate) < today)
  const weekSales = sales.filter(s => new Date(s.saleDate) >= weekAgo)
  const monthSales = sales.filter(s => new Date(s.saleDate) >= monthAgo)

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.quantity * s.unitSalePrice), 0)
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + (s.quantity * s.unitSalePrice), 0)
  const weekRevenue = weekSales.reduce((sum, s) => sum + (s.quantity * s.unitSalePrice), 0)
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.quantity * s.unitSalePrice), 0)

  const todayProfit = todaySales.reduce((sum, s) => sum + s.totalProfit, 0)
  const weekProfit = weekSales.reduce((sum, s) => sum + s.totalProfit, 0)

  const totalQuantitySold = sales.reduce((sum, s) => sum + s.quantity, 0)
  const avgOrderValue = sales.length > 0 ? monthRevenue / sales.length : 0

  const todayGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0

  const stats = [
    {
      title: "Today's Sales",
      value: formatCurrency(todayRevenue, currencyCode),
      subtitle: `${todaySales.length} transactions`,
      icon: CurrencyDollarIcon,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: todayGrowth > 0 ? `+${todayGrowth.toFixed(1)}%` : `${todayGrowth.toFixed(1)}%`,
      changeColor: todayGrowth > 0 ? "text-green-600" : "text-red-600"
    },
    {
      title: "Weekly Revenue",
      value: formatCurrency(weekRevenue, currencyCode),
      subtitle: `${weekSales.length} sales this week`,
      icon: ChartBarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Weekly Profit",
      value: formatCurrency(weekProfit, currencyCode),
      subtitle: `${(weekRevenue > 0 ? (weekProfit / weekRevenue * 100) : 0).toFixed(1)}% margin`,
      icon: ArrowTrendingUpIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(avgOrderValue, currencyCode),
      subtitle: `${totalQuantitySold} items sold`,
      icon: CalculatorIcon,
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
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
                {stat.change && (
                  <span className={`text-xs font-medium ${stat.changeColor}`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 