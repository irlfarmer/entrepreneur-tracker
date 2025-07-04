"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, FunnelIcon } from "@heroicons/react/24/outline"

export default function SalesFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
  const [productId, setProductId] = useState(searchParams.get('productId') || '')
  const [products, setProducts] = useState<any[]>([])

  // Fetch products for filter dropdown
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        if (data.success) {
          setProducts(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      }
    }
    fetchProducts()
  }, [])

  const updateFilters = (newStartDate?: string, newEndDate?: string, newProductId?: string) => {
    const params = new URLSearchParams()
    
    const startDateValue = newStartDate !== undefined ? newStartDate : startDate
    const endDateValue = newEndDate !== undefined ? newEndDate : endDate
    const productIdValue = newProductId !== undefined ? newProductId : productId
    
    if (startDateValue) params.set('startDate', startDateValue)
    if (endDateValue) params.set('endDate', endDateValue)
    if (productIdValue && productIdValue !== 'all') params.set('productId', productIdValue)

    router.push(`/sales?${params.toString()}`)
  }

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    updateFilters(value)
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
    updateFilters(undefined, value)
  }

  const handleProductChange = (value: string) => {
    setProductId(value)
    updateFilters(undefined, undefined, value)
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setProductId('')
    router.push('/sales')
  }

  const hasActiveFilters = startDate || endDate || productId

  // Quick date presets
  const setQuickDate = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    const startDateStr = start.toISOString().split('T')[0]
    const endDateStr = end.toISOString().split('T')[0]
    
    setStartDate(startDateStr)
    setEndDate(endDateStr)
    updateFilters(startDateStr, endDateStr)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Date Range */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="border border-gray-400 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Start date"
            />
            <span className="text-gray-800 font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="border border-gray-400 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="End date"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex space-x-2">
            <button
              onClick={() => setQuickDate(7)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setQuickDate(30)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setQuickDate(90)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Last 90 days
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Product Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="border border-gray-400 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {startDate && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              From: {new Date(startDate).toLocaleDateString()}
              <button
                onClick={() => handleStartDateChange('')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {endDate && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              To: {new Date(endDate).toLocaleDateString()}
              <button
                onClick={() => handleEndDateChange('')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {productId && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Product: {products.find(p => p._id === productId)?.name || 'Unknown'}
              <button
                onClick={() => handleProductChange('')}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
} 