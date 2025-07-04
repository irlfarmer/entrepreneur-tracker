"use client"

import { useState, useEffect } from "react"
import { formatCurrency, calculateProfitMargin } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline"

interface InventoryStatsProps {
  userId: string
}

export default function InventoryStats({ userId }: InventoryStatsProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [userId])

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
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
  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.currentStock <= 5).length
  const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.salePrice), 0)
  const totalCost = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0)
  const totalProfit = totalValue - totalCost
  const avgProfitMargin = products.length > 0 
    ? products.reduce((sum, p) => sum + calculateProfitMargin(p.salePrice, p.costPrice), 0) / products.length 
    : 0

  const stats = [
    {
      title: "Total Products",
      value: totalProducts.toString(),
      subtitle: `${products.filter(p => p.currentStock > 0).length} in stock`,
      icon: CubeIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Low Stock Alert",
      value: lowStockProducts.toString(),
      subtitle: lowStockProducts > 0 ? "Need restocking" : "All stocked",
      icon: ExclamationTriangleIcon,
      color: lowStockProducts > 0 ? "text-red-600" : "text-green-600",
      bgColor: lowStockProducts > 0 ? "bg-red-50" : "bg-green-50"
    },
    {
      title: "Inventory Value",
      value: formatCurrency(totalValue, currencyCode),
      subtitle: `Cost: ${formatCurrency(totalCost, currencyCode)}`,
      icon: CurrencyDollarIcon,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Avg Profit Margin",
      value: `${avgProfitMargin.toFixed(1)}%`,
      subtitle: `Potential: ${formatCurrency(totalProfit, currencyCode)}`,
      icon: ArrowTrendingUpIcon,
      color: avgProfitMargin > 0 ? "text-purple-600" : "text-gray-600",
      bgColor: avgProfitMargin > 0 ? "bg-purple-50" : "bg-gray-50"
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
              <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600 mt-1">{stat.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 