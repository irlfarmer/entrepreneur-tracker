"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, calculateProfitMargin } from "@/lib/utils"
import { Product } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline"

interface ProductListProps {
  userId: string
  searchParams: {
    search?: string
    category?: string
    lowStock?: string
  }
}

export default function ProductList({ userId, searchParams }: ProductListProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (searchParams.search) params.set('search', searchParams.search)
        if (searchParams.category) params.set('category', searchParams.category)
        if (searchParams.lowStock) params.set('lowStock', searchParams.lowStock)

        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setProducts(data.data)
        } else {
          setError(data.error || 'Failed to fetch products')
        }
      } catch (err) {
        setError('Failed to fetch products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchParams])

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setProducts(products.filter(p => p._id?.toString() !== productId))
      } else {
        alert(data.error || 'Failed to delete product')
      }
    } catch (err) {
      alert('Failed to delete product')
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
            <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="h-16 w-16 bg-gray-200 rounded-lg"></div>
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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Products ({products.length})
        </h3>
      </div>

      {products.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(searchParams).length > 0 
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first product to inventory."
            }
          </p>
          <Link
            href="/inventory/add"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Product
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {products.map((product) => {
            const profitMargin = calculateProfitMargin(product.salePrice, product.costPrice)
            const isLowStock = product.currentStock <= 5
            
            return (
              <div key={product._id?.toString()} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Product placeholder image */}
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-400">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {product.name}
                        </h4>
                        {isLowStock && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" title="Low Stock" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      {product.sku && (
                        <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          Stock: <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-900'}>{product.currentStock}</span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Profit: <span className={profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>{profitMargin.toFixed(1)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and actions */}
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(product.salePrice, currencyCode)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Cost: {formatCurrency(product.costPrice, currencyCode)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/inventory/${product._id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/inventory/${product._id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Product"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id!.toString())}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Product"
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