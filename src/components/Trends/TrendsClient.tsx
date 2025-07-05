"use client"

import { useState, useEffect } from "react"
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ChartOptions
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { format } from 'date-fns'
import { useCurrency } from "@/hooks/useCurrency"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface TrendData {
  salesTrends: Array<{
    period: string
    year: number
    month: number
    totalRevenue: number
    totalProfit: number
    totalExpenses: number
    totalCOGS: number
    salesCount: number
    totalUnits: number
    averageOrderValue: number
    profitMargin: number
  }>
  expensesTrends: Array<{
    period: string
    year: number
    month: number
    totalExpenses: number
    expenseCount: number
  }>
  productTrends: Array<{
    period: string
    year: number
    month: number
    productId: string
    productName: string
    totalQuantity: number
    totalRevenue: number
  }>
  inventory: {
    totalProducts: number
    totalInventoryValue: number
    lowStockProducts: number
  }
}

export default function TrendsClient() {
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(12) // Default to 12 months
  const { symbol: currencySymbol } = useCurrency()

  useEffect(() => {
    fetchTrendData()
  }, [timeRange])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trends?months=${timeRange}`)
      const data = await response.json()
      if (data.success) {
        setTrendData(data.data)
      }
    } catch (error) {
      console.error('Error fetching trend data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPeriodLabel = (period: string) => {
    const [year, month] = period.split('-')
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy')
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            if (label.includes('Revenue') || label.includes('Profit') || label.includes('Expenses') || label.includes('COGS')) {
              return `${label}: ${currencySymbol}${context.parsed.y.toFixed(2)}`
            }
            return `${label}: ${context.parsed.y}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (typeof value === 'number') {
              return currencySymbol + value.toFixed(0)
            }
            return value
          }
        }
      }
    }
  }

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            if (label.includes('Revenue') || label.includes('Value')) {
              return `${label}: ${currencySymbol}${context.parsed.y.toFixed(2)}`
            }
            return `${label}: ${context.parsed.y}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (typeof value === 'number') {
              return currencySymbol + value.toFixed(0)
            }
            return value
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!trendData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No trend data available</p>
      </div>
    )
  }

  // Prepare chart data
  const periods = trendData.salesTrends.map(item => formatPeriodLabel(item.period))
  
  const revenueVsProfitData = {
    labels: periods,
    datasets: [
      {
        label: 'Revenue',
        data: trendData.salesTrends.map(item => item.totalRevenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
      },
      {
        label: 'Profit',
        data: trendData.salesTrends.map(item => item.totalProfit),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      },
      {
        label: 'COGS',
        data: trendData.salesTrends.map(item => item.totalCOGS),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1
      }
    ]
  }

  const salesVolumeData = {
    labels: periods,
    datasets: [
      {
        label: 'Number of Sales',
        data: trendData.salesTrends.map(item => item.salesCount),
        backgroundColor: 'rgba(168, 85, 247, 0.6)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1
      },
      {
        label: 'Units Sold',
        data: trendData.salesTrends.map(item => item.totalUnits),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }
    ]
  }

  const expensesData = {
    labels: periods,
    datasets: [
      {
        label: 'Sale Expenses',
        data: trendData.salesTrends.map(item => item.totalExpenses),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1
      },
      {
        label: 'Business Expenses',
        data: periods.map(period => {
          const expenseData = trendData.expensesTrends.find(item => formatPeriodLabel(item.period) === period)
          return expenseData ? expenseData.totalExpenses : 0
        }),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.1
      }
    ]
  }

  const profitMarginData = {
    labels: periods,
    datasets: [
      {
        label: 'Profit Margin (%)',
        data: trendData.salesTrends.map(item => item.profitMargin),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1
      }
    ]
  }

  const averageOrderValueData = {
    labels: periods,
    datasets: [
      {
        label: 'Average Order Value',
        data: trendData.salesTrends.map(item => item.averageOrderValue),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Performance Trends</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
            <option value={36}>Last 36 months</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue vs Profit Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Profit vs COGS</h3>
          <div className="h-80">
            <Line data={revenueVsProfitData} options={chartOptions} />
          </div>
        </div>

        {/* Sales Volume Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Volume</h3>
          <div className="h-80">
            <Bar data={salesVolumeData} options={barChartOptions} />
          </div>
        </div>

        {/* Expenses Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses Trends</h3>
          <div className="h-80">
            <Line data={expensesData} options={chartOptions} />
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Margin Trend</h3>
          <div className="h-80">
            <Line 
              data={profitMarginData} 
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value + '%'
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Order Value</h3>
          <div className="h-80">
            <Bar data={averageOrderValueData} options={barChartOptions} />
          </div>
        </div>

        {/* Current Inventory Overview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Inventory Overview</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Products</span>
                  <span className="text-xl font-semibold text-blue-600">
                    {trendData.inventory.totalProducts}
                  </span>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Inventory Value</span>
                  <span className="text-xl font-semibold text-green-600">
                    {currencySymbol}{trendData.inventory.totalInventoryValue.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Low Stock Products</span>
                  <span className="text-xl font-semibold text-red-600">
                    {trendData.inventory.lowStockProducts}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {currencySymbol}{trendData.salesTrends.reduce((sum, item) => sum + item.totalRevenue, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currencySymbol}{trendData.salesTrends.reduce((sum, item) => sum + item.totalProfit, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Profit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {trendData.salesTrends.reduce((sum, item) => sum + item.salesCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Sales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {trendData.salesTrends.reduce((sum, item) => sum + item.totalUnits, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Units Sold</div>
          </div>
        </div>
      </div>
    </div>
  )
} 