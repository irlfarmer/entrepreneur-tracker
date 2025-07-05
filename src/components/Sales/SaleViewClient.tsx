"use client"

import { formatCurrency, formatDate, getSaleQuantity, getSaleRevenue, getSaleProfit, getSaleProductName, getSaleProductNames, isMultiProductSale } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { ArrowLeftIcon, PencilIcon, ShoppingBagIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

interface SerializedSale {
  _id?: string
  userId: string
  // Legacy fields
  productId?: string
  productName?: string
  quantity?: number
  unitSalePrice?: number
  unitCostPrice?: number
  // Multi-product fields
  items?: Array<{
    productId: string
    productName: string
    quantity: number
    unitSalePrice: number
    unitCostPrice: number
    lineTotal: number
    lineProfit: number
    productDetails?: {
      category?: string
      type?: string
      size?: string
      color?: string
      sku?: string
      customFields?: Record<string, any>
    }
  }>
  customerName?: string
  saleDate: string
  saleExpenses: number
  totalSales?: number
  totalCogs?: number
  totalProfit: number
  notes?: string
  createdAt: string
  // Aggregated product data (from API joins)
  product?: {
    category?: string
    type?: string
    size?: string
    color?: string
    sku?: string
    customFields?: Record<string, any>
  }
}

interface SaleViewClientProps {
  sale: SerializedSale
}

export default function SaleViewClient({ sale }: SaleViewClientProps) {
  const { code: currencyCode } = useCurrency()
  
  const totalRevenue = getSaleRevenue(sale)
  const totalCogs = sale.totalCogs || (isMultiProductSale(sale) 
    ? sale.items?.reduce((sum, item) => sum + (item.quantity * item.unitCostPrice), 0) || 0
    : ((sale.quantity || 0) * (sale.unitCostPrice || 0)))
  const grossProfit = totalRevenue - totalCogs
  const netProfit = grossProfit - sale.saleExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/sales"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Back to Sales"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold text-gray-900">Sale Details</h1>
              {isMultiProductSale(sale) && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                  <ShoppingBagIcon className="h-4 w-4 mr-1" />
                  Multi-product
                </span>
              )}
            </div>
            <p className="text-gray-600">{getSaleProductName(sale)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/sales/${sale._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Sale
          </Link>
        </div>
      </div>

      {/* Sale Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sale Date:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(sale.saleDate))}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{sale.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Quantity:</span>
              <span className="font-medium text-gray-900">{getSaleQuantity(sale)} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(sale.createdAt))}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Revenue:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalRevenue, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total COGS:</span>
              <span className="font-medium text-gray-900">{formatCurrency(totalCogs, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Gross Profit:</span>
              <span className={`font-medium ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sale Expenses:</span>
              <span className="font-medium text-red-600">{formatCurrency(sale.saleExpenses, currencyCode)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-900">Net Profit:</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-600">Profit Margin:</span>
                <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
        
        {isMultiProductSale(sale) ? (
          <div className="space-y-4">
            {sale.items?.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.productName}</h4>
                    
                    {/* Product Details */}
                    {item.productDetails && (
                      <div className="mt-2 space-y-2">
                        {/* Product attributes as badges */}
                        <div className="flex items-center space-x-2">
                          {item.productDetails.category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                              {item.productDetails.category}
                            </span>
                          )}
                          {item.productDetails.type && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                              {item.productDetails.type}
                            </span>
                          )}
                          {item.productDetails.size && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                              Size: {item.productDetails.size}
                            </span>
                          )}
                          {item.productDetails.color && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs font-medium">
                              {item.productDetails.color}
                            </span>
                          )}
                          {item.productDetails.sku && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium">
                              SKU: {item.productDetails.sku}
                            </span>
                          )}
                        </div>
                        
                        {/* Custom fields */}
                        {item.productDetails.customFields && Object.keys(item.productDetails.customFields).length > 0 && (
                          <div className="flex items-center space-x-2">
                            {Object.entries(item.productDetails.customFields).map(([key, value]) => (
                              <span 
                                key={key}
                                className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium text-gray-900 ml-2">{item.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="font-medium text-gray-900 ml-2">{formatCurrency(item.unitSalePrice, currencyCode)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Cost:</span>
                        <span className="font-medium text-gray-900 ml-2">{formatCurrency(item.unitCostPrice, currencyCode)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Line Total:</span>
                        <span className="font-medium text-green-600 ml-2">{formatCurrency(item.lineTotal, currencyCode)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Line Profit</div>
                    <div className={`font-semibold ${item.lineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.lineProfit, currencyCode)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{sale.productName}</h4>
                
                {/* Product Details for single-product sales */}
                {sale.product && (
                  <div className="mt-2 space-y-2">
                    {/* Product attributes as badges */}
                    <div className="flex items-center space-x-2">
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
                    
                    {/* Custom fields */}
                    {sale.product.customFields && Object.keys(sale.product.customFields).length > 0 && (
                      <div className="flex items-center space-x-2">
                        {Object.entries(sale.product.customFields).map(([key, value]) => (
                          <span 
                            key={key}
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-gray-900 ml-2">{sale.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium text-gray-900 ml-2">{formatCurrency(sale.unitSalePrice || 0, currencyCode)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Unit Cost:</span>
                    <span className="font-medium text-gray-900 ml-2">{formatCurrency(sale.unitCostPrice || 0, currencyCode)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-green-600 ml-2">{formatCurrency(totalRevenue, currencyCode)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Profit</div>
                <div className={`font-semibold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(grossProfit, currencyCode)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {sale.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
        </div>
      )}
    </div>
  )
} 