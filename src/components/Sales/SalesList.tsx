"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Sale } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import Link from "next/link"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon
} from "@heroicons/react/24/outline"

interface SalesListProps {
  userId: string
  searchParams: {
    startDate?: string
    endDate?: string
    productId?: string
  }
}

export default function SalesList({ userId, searchParams }: SalesListProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSales() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (searchParams.startDate) params.set('startDate', searchParams.startDate)
        if (searchParams.endDate) params.set('endDate', searchParams.endDate)
        if (searchParams.productId) params.set('productId', searchParams.productId)

        const response = await fetch(`/api/sales?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setSales(data.data)
        } else {
          setError(data.error || 'Failed to fetch sales')
        }
      } catch (err) {
        setError('Failed to fetch sales')
      } finally {
        setLoading(false)
      }
    }

    fetchSales()
  }, [searchParams])

  const handleDelete = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return

    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setSales(sales.filter(s => s._id?.toString() !== saleId))
      } else {
        alert(data.error || 'Failed to delete sale')
      }
    } catch (err) {
      alert('Failed to delete sale')
    }
  }

  if (loading || currencyLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  const totalRevenue = sales.reduce((sum, s) => sum + (s.quantity * s.unitSalePrice), 0)
  const totalProfit = sales.reduce((sum, s) => sum + s.totalProfit, 0)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Sales ({sales.length})
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Total Revenue: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue, currencyCode)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Total Profit: <span className="font-semibold text-green-600">{formatCurrency(totalProfit, currencyCode)}</span>
            </p>
          </div>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(searchParams).length > 0 
              ? "Try adjusting your filters or date range."
              : "Start recording your sales to see them here."
            }
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {sales.map((sale) => (
            <div key={sale._id?.toString()} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {sale.productName}
                      </h4>
                      
                      {/* Product attributes as badges */}
                      <div className="flex items-center space-x-2 mt-2">
                        {sale.product?.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                            {sale.product.category}
                          </span>
                        )}
                        {sale.product?.type && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                            {sale.product.type}
                          </span>
                        )}
                        {sale.product?.size && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                            Size: {sale.product.size}
                          </span>
                        )}
                        {sale.product?.color && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs font-medium">
                            {sale.product.color}
                          </span>
                        )}
                        {sale.product?.sku && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium">
                            SKU: {sale.product.sku}
                          </span>
                        )}
                      </div>

                      {/* Custom fields preview */}
                      {sale.product?.customFields && Object.keys(sale.product.customFields).length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          {Object.entries(sale.product.customFields)
                            .slice(0, 2)
                            .map(([key, value]) => (
                              <span 
                                key={key}
                                className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                              >
                                {key}: {value}
                              </span>
                            ))}
                          {Object.keys(sale.product.customFields).length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                              +{Object.keys(sale.product.customFields).length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                        <span>Qty: {sale.quantity}</span>
                        <span>@{formatCurrency(sale.unitSalePrice, currencyCode)}</span>
                        <span>•</span>
                        <span>{formatDate(sale.saleDate)}</span>
                      </div>
                      {sale.notes && (
                        <p className="text-sm text-gray-500 mt-1">{sale.notes}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Revenue and actions */}
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(sale.quantity * sale.unitSalePrice, currencyCode)}
                    </p>
                    <p className="text-sm text-green-600">
                      Profit: {formatCurrency(sale.totalProfit, currencyCode)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/sales/${sale._id?.toString()}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/sales/${sale._id?.toString()}/edit`}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Edit Sale"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(sale._id!.toString())}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Sale"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 