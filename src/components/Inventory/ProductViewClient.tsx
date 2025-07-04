"use client"

import { formatCurrency, calculateProfitMargin, formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { SerializedProduct } from "@/lib/types"
import { ExclamationTriangleIcon, PencilIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

interface ProductViewClientProps {
  product: SerializedProduct
}

export default function ProductViewClient({ product }: ProductViewClientProps) {
  const { code: currencyCode } = useCurrency()
  
  const profitMargin = calculateProfitMargin(product.salePrice, product.costPrice)
  const isLowStock = product.currentStock <= 5
  // Note: This is potential profit per unit without sale expenses
  // Actual profit will vary based on sale-related expenses for each transaction
  const profitPerUnit = product.salePrice - product.costPrice

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/inventory"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Back to Inventory"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">{product.category}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/inventory/${product._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Product
          </Link>
        </div>
      </div>

      {/* Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Product Name:</span>
              <span className="font-medium text-gray-900">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Category:</span>
              <span className="font-medium text-gray-900">{product.category}</span>
            </div>
            {product.type && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="font-medium text-gray-900">{product.type}</span>
              </div>
            )}
            {product.size && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Size:</span>
                <span className="font-medium text-gray-900">{product.size}</span>
              </div>
            )}
            {product.color && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Color:</span>
                <span className="font-medium text-gray-900">{product.color}</span>
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">SKU:</span>
                <span className="font-medium text-gray-900">{product.sku}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(product.createdAt))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Updated:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(product.updatedAt))}</span>
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sale Price:</span>
              <span className="font-medium text-gray-900">{formatCurrency(product.salePrice, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cost Price:</span>
              <span className="font-medium text-gray-900">{formatCurrency(product.costPrice, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Profit per Unit:</span>
              <span className={`font-medium ${profitPerUnit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitPerUnit, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Profit Margin:</span>
              <span className={`font-medium ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Stock:</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.currentStock}
                  </span>
                  {isLowStock && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" title="Low Stock Warning" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Stock Value:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(product.currentStock * product.salePrice, currencyCode)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      {product.customFields && Object.keys(product.customFields).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(product.customFields).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-sm text-gray-600">{key}:</span>
                <span className="font-medium text-gray-900">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Warning */}
      {isLowStock && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Low Stock Warning</h4>
              <p className="text-sm text-red-700">
                This product has {product.currentStock} units remaining. Consider restocking soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 