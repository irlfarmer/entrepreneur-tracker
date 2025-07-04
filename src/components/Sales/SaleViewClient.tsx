"use client"

import { formatCurrency, formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

interface SerializedSale {
  _id?: string
  userId: string
  productId: string
  productName: string
  saleDate: string
  quantity: number
  unitSalePrice: number
  unitCostPrice: number
  saleExpenses: number
  totalProfit: number
  notes?: string
  createdAt: string
}

interface SaleViewClientProps {
  sale: SerializedSale
}

export default function SaleViewClient({ sale }: SaleViewClientProps) {
  const { code: currencyCode } = useCurrency()
  
  const totalRevenue = sale.quantity * sale.unitSalePrice
  const totalCogs = sale.quantity * sale.unitCostPrice
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
            <h1 className="text-3xl font-bold text-gray-900">Sale Details</h1>
            <p className="text-gray-600">{sale.productName}</p>
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
              <span className="text-sm text-gray-600">Product Name:</span>
              <span className="font-medium text-gray-900">{sale.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sale Date:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(sale.saleDate))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Quantity Sold:</span>
              <span className="font-medium text-gray-900">{sale.quantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Unit Price:</span>
              <span className="font-medium text-gray-900">{formatCurrency(sale.unitSalePrice, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Unit Cost:</span>
              <span className="font-medium text-gray-900">{formatCurrency(sale.unitCostPrice, currencyCode)}</span>
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
                <span className="text-sm text-gray-600">Net Profit:</span>
                <span className={`font-semibold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

        {/* Notes */}
        {sale.notes && (
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
} 