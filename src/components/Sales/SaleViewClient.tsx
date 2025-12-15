"use client"

import { useRef, useState } from 'react';
import { formatCurrency, formatDate, getSaleQuantity, getSaleRevenue, getSaleProfit, getSaleProductName, getSaleProductNames, isMultiProductSale } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { ArrowLeftIcon, PencilIcon, ShoppingBagIcon, PrinterIcon, XMarkIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { useReactToPrint } from 'react-to-print';
import PrintableReceipt from './PrintableReceipt';
import { useBusiness } from '@/context/BusinessContext';

interface SerializedSale {
  _id?: string
  userId: string
  businessId?: string
  // Legacy fields
  productId?: string
  productName?: string
  quantity?: number
  unitSalePrice?: number
  unitCostPrice?: number
  // Multi-product fields
  items?: Array<{
    productId?: string
    productName?: string
    itemId?: string
    itemType?: 'Product' | 'Service'
    name?: string
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
  saleExpenseDetails?: Array<{
    category: string
    amount: number
    description: string
  }>
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
  const { availableBusinesses, currentBusiness } = useBusiness();
  const [receiptStyle, setReceiptStyle] = useState<'standard' | 'compact' | 'a4-invoice'>('standard');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadReceipt = async () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) {
      console.error('Receipt element not found');
      return;
    }

    try {
      // Use dom-to-image instead of html2canvas
      const domToImage = (await import('dom-to-image')).default;
      
      // Get the actual receipt content inside the modal
      const receiptContent = receiptElement.firstElementChild;
      if (!receiptContent) {
        throw new Error('Receipt content not found');
      }

      // Create a temporary container for the receipt
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      try {
        // Clone the receipt content to avoid modifying the original
        const clone = receiptContent.cloneNode(true) as HTMLElement;
        tempContainer.appendChild(clone);

        // Generate the image
        const dataUrl = await domToImage.toPng(clone, {
          quality: 1,
          bgcolor: '#ffffff'
        });

        // Create and trigger download
        const link = document.createElement('a');
        link.download = `receipt-${sale._id}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        // Clean up
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('Error generating receipt image:', error);
      alert('Failed to generate receipt. Please try again or contact support.');
    }
  };

  const businessProfile = availableBusinesses.find(b => b.id === (sale.businessId || currentBusiness.id));

  const totalRevenue = getSaleRevenue(sale)
  const totalCogs = sale.totalCogs || (isMultiProductSale(sale)
    ? sale.items?.reduce((sum, item) => sum + (item.quantity * item.unitCostPrice), 0) || 0
    : ((sale.quantity || 0) * (sale.unitCostPrice || 0)))
  const grossProfit = totalRevenue - totalCogs
  const netProfit = grossProfit - sale.saleExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

  // Normalize sale data to handle both legacy single-product and new multi-product sales structures
  const saleItems = sale.items && sale.items.length > 0
    ? sale.items
    : [
        {
          productName: sale.productName,
          name: sale.productName,
          quantity: sale.quantity,
          unitSalePrice: sale.unitSalePrice,
          unitCostPrice: sale.unitCostPrice,
          lineTotal: totalRevenue,
          lineProfit: grossProfit,
          productDetails: sale.product,
        } as any,
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
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
          <div className="flex items-center space-x-2">
            <select 
              value={receiptStyle} 
              onChange={(e) => setReceiptStyle(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="standard">Standard Receipt</option>
              <option value="compact">Compact Receipt</option>
              <option value="a4-invoice">A4 Invoice</option>
            </select>
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              View Receipt
            </button>
          </div>
          <Link
            href={`/sales/${sale._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Sale
          </Link>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {isReceiptOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadReceipt}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  <PrinterIcon className="h-4 w-4 mr-1.5" />
                  Download
                </button>
                <button 
                  onClick={() => setIsReceiptOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div ref={receiptRef} className="bg-white p-6">
                <PrintableReceipt 
                  sale={sale as any} 
                  businessProfile={businessProfile as any} 
                  receiptStyle={receiptStyle} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
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
      <div className="bg-white rounded-lg shadow p-6 no-print">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
        <div className="space-y-4">
          {saleItems.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name || item.productName}</h4>
                  {item.productDetails && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2 flex-wrap">
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
                      {item.productDetails.customFields && Object.keys(item.productDetails.customFields).length > 0 && (
                        <div className="flex items-center space-x-2 flex-wrap mt-2">
                          {Object.entries(item.productDetails.customFields).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs"
                            >
                              {key}: {String(value)}
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
                      <span className="font-medium text-blue-600 ml-2">{formatCurrency(item.unitSalePrice || 0, currencyCode)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Cost:</span>
                      <span className="font-medium text-gray-900 ml-2">{formatCurrency(item.unitCostPrice || 0, currencyCode)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Line Total:</span>
                      <span className="font-medium text-green-600 ml-2">{formatCurrency(item.lineTotal || 0, currencyCode)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Line Profit</div>
                  <div className={`font-semibold ${item.lineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(item.lineProfit || 0, currencyCode)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      {sale.notes && (
        <div className="bg-white rounded-lg shadow p-6 no-print">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
        </div>
      )}
    </div>
  )
} 