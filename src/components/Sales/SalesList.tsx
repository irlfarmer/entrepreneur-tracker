"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDate, getSaleQuantity, getSaleRevenue, getSaleProfit, getSaleProductName, getSaleProductNames, isMultiProductSale } from "@/lib/utils"
import { Sale } from "@/lib/types"

import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"
import Link from "next/link"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShoppingBagIcon
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
  const { currentBusiness } = useBusiness()
  const { showModal } = useModal()
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
        params.set('businessId', currentBusiness.id)

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
  }, [searchParams, currentBusiness.id])

  const handleDelete = (saleId: string) => {
    showModal({
      title: 'Delete Sale',
      message: 'Are you sure you want to delete this sale? This action cannot be undone.',
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/sales/${saleId}`, {
            method: 'DELETE'
          })
          const data = await response.json()

          if (data.success) {
            setSales(prev => prev.filter(s => s._id?.toString() !== saleId))
            showModal({ title: 'Success', message: 'Sale deleted successfully', type: 'success' })
          } else {
            showModal({ title: 'Error', message: data.error || 'Failed to delete sale', type: 'error' })
          }
        } catch (err) {
          showModal({ title: 'Error', message: 'Failed to delete sale', type: 'error' })
        }
      }
    })
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

  const totalRevenue = sales.reduce((sum, s) => sum + getSaleRevenue(s), 0)
  const totalProfit = sales.reduce((sum, s) => sum + getSaleProfit(s), 0)

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
              Total Profit: <span className={`font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalProfit, currencyCode)}</span>
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
          {sales.map((saleItem) => {
            const sale = saleItem as any
            return (
              <div key={sale._id?.toString()} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {getSaleProductName(saleItem)}
                          </h4>
                          {isMultiProductSale(saleItem) && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                              <ShoppingBagIcon className="h-3 w-3 mr-1" />
                              Multi-product
                            </span>
                          )}
                        </div>

                        {/* Show product names for multi-product sales */}
                        {isMultiProductSale(saleItem) && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Products:</p>
                            <div className="space-y-2 mt-1">
                              {saleItem.items?.map((item: any, index: number) => (
                                <div key={index} className="flex flex-wrap gap-1 items-center">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                    {item.productName} (x{item.quantity})
                                  </span>

                                  {/* Product details for each item */}
                                  {item.productDetails && (
                                    <>
                                      {item.productDetails.category && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                          {item.productDetails.category}
                                        </span>
                                      )}
                                      {item.productDetails.type && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                                          {item.productDetails.type}
                                        </span>
                                      )}
                                      {item.productDetails.size && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">
                                          {item.productDetails.size}
                                        </span>
                                      )}
                                      {item.productDetails.color && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs">
                                          {item.productDetails.color}
                                        </span>
                                      )}
                                      {item.productDetails.sku && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
                                          {item.productDetails.sku}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Product attributes as badges - only for single product sales with product details */}
                        {!isMultiProductSale(saleItem) && sale.product && (
                          <div className="flex items-center space-x-2 mt-2">
                            {sale.product.category && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                {sale.product.category}
                              </span>
                            )}
                            {sale.product.type && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                                {sale.product.type}
                              </span>
                            )}
                            {sale.product.size && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                                Size: {sale.product.size}
                              </span>
                            )}
                            {sale.product.color && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs font-medium">
                                {sale.product.color}
                              </span>
                            )}
                            {sale.product.sku && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium">
                                SKU: {sale.product.sku}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Custom fields preview - only for single product sales */}
                        {!isMultiProductSale(saleItem) && sale.product?.customFields && Object.keys(sale.product.customFields).length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            {Object.entries(sale.product.customFields)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                                >
                                  {key}: {String(value)}
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
                          <span>Qty: {getSaleQuantity(sale)}</span>
                          {!isMultiProductSale(sale) && sale.unitSalePrice && (
                            <>
                              <span>@{formatCurrency(sale.unitSalePrice, currencyCode)}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatDate(sale.saleDate)}</span>
                          {sale.customerName && (
                            <>
                              <span>•</span>
                              <span>Customer: {sale.customerName}</span>
                            </>
                          )}
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
                        {formatCurrency(getSaleRevenue(saleItem), currencyCode)}
                      </p>
                      <p className={`text-sm ${getSaleProfit(saleItem) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Profit: {formatCurrency(getSaleProfit(saleItem), currencyCode)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/sales/${saleItem._id?.toString()}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/sales/${saleItem._id?.toString()}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Sale"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete((saleItem._id!).toString())}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Sale"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 