"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline"

interface MetricsCardsProps {
  userId: string
}

interface Metrics {
  todaySales: number
  todayProfit: number
  weekSales: number
  weekProfit: number
  monthSales: number
  monthProfit: number
  lowStockProducts: any[]
}

export default function MetricsCards({ userId }: MetricsCardsProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [userId])

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/dashboard/metrics?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setMetrics(data.data)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || currencyLoading || !metrics) {
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

  const cards = [
    {
      title: "Today's Sales",
      value: formatCurrency(metrics.todaySales, currencyCode),
      subtitle: `Profit: ${formatCurrency(metrics.todayProfit, currencyCode)}`,
      icon: CurrencyDollarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "This Week",
      value: formatCurrency(metrics.weekSales, currencyCode),
      subtitle: `Profit: ${formatCurrency(metrics.weekProfit, currencyCode)}`,
      icon: CalendarDaysIcon,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "This Month",
      value: formatCurrency(metrics.monthSales, currencyCode),
      subtitle: `Profit: ${formatCurrency(metrics.monthProfit, currencyCode)}`,
      icon: ChartBarIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Low Stock Alert",
      value: metrics.lowStockProducts.length.toString(),
      subtitle: metrics.lowStockProducts.length > 0 ? "Products need restocking" : "All products in stock",
      icon: ExclamationTriangleIcon,
      color: metrics.lowStockProducts.length > 0 ? "text-red-600" : "text-green-600",
      bgColor: metrics.lowStockProducts.length > 0 ? "bg-red-50" : "bg-green-50"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 