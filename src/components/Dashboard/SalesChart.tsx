"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDate, getSaleQuantity, getSaleRevenue, getSaleProfit } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { ChartBarIcon } from "@heroicons/react/24/outline"

interface ChartData {
  date: string
  sales: number
  profit: number
}

interface SalesChartProps {
  userId: string
}

export default function SalesChart({ userId }: SalesChartProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const { currentBusiness } = useBusiness()
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSalesData() {
      try {
        // Get last 7 days of sales
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const sales = await fetch(`/api/sales?userId=${userId}&businessId=${currentBusiness.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
          .then(res => res.json())

        // Process data for chart
        const dailyData: { [key: string]: { sales: number; profit: number } } = {}

        // Initialize with zeros for last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          dailyData[dateStr] = { sales: 0, profit: 0 }
        }

        // Aggregate actual sales data
        if (sales.success && sales.data) {
          sales.data.forEach((sale: any) => {
            const dateStr = new Date(sale.saleDate).toISOString().split('T')[0]
            if (dailyData[dateStr]) {
              dailyData[dateStr].sales += getSaleRevenue(sale)
              dailyData[dateStr].profit += getSaleProfit(sale)
            }
          })
        }

        const processedData = Object.entries(dailyData).map(([date, data]) => ({
          date: formatDate(new Date(date), 'short'),
          sales: data.sales,
          profit: data.profit
        }))

        setChartData(processedData)
      } catch (error) {
        console.error('Error fetching sales data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesData()
  }, [userId, currentBusiness.id])

  if (loading || currencyLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const maxSales = Math.max(...chartData.map(d => d.sales), 1)

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-4">
        <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Sales This Week</h3>
      </div>

      <div className="space-y-4">
        {chartData.map((day, index) => (
          <div key={day.date} className="flex items-center space-x-4">
            <div className="w-12 text-sm text-gray-500 font-medium">
              {day.date}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${(day.sales / maxSales) * 100}%` }}
                  ></div>
                </div>
                <div className="w-20 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(day.sales, currencyCode)}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Profit: {formatCurrency(day.profit, currencyCode)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {chartData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No sales data available</p>
        </div>
      )}
    </div>
  )
} 