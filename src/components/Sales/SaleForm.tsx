"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/hooks/useCurrency"
import { Product } from "@/lib/types"
import { PlusIcon, XMarkIcon, ShoppingCartIcon } from "@heroicons/react/24/outline"

interface SerializedSale {
  _id?: string
  userId: string
  // Legacy fields
  productId?: string
  productName?: string
  quantity?: number
  unitSalePrice?: number
  unitCostPrice?: number
  // New fields
  items?: Array<{
    productId: string
    productName: string
    quantity: number
    unitSalePrice: number
    unitCostPrice: number
    lineTotal: number
    lineProfit: number
  }>
  customerName?: string
  saleDate: string
  saleExpenses: number
  totalSales?: number
  totalCogs?: number
  totalProfit: number
  notes?: string
  createdAt: string
}

interface SaleFormProps {
  userId: string
  sale?: SerializedSale
  isEditing?: boolean
}

interface SaleExpense {
  id: string
  category: string
  amount: number
  description: string
}

interface SaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitSalePrice: number
  unitCostPrice: number
  lineTotal: number
  lineProfit: number
  product?: Product
}

export default function SaleForm({ userId, sale, isEditing = false }: SaleFormProps) {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [saleExpenseCategories, setSaleExpenseCategories] = useState<string[]>([])
  const [saleExpenses, setSaleExpenses] = useState<SaleExpense[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [formData, setFormData] = useState({
    customerName: sale?.customerName || "",
    saleDate: sale?.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: sale?.notes || ""
  })

  // Initialize sale items from existing sale data
  useEffect(() => {
    if (sale) {
      if (sale.items && sale.items.length > 0) {
        // Multi-product sale
        const initialItems: SaleItem[] = sale.items.map((item, index) => ({
          id: `item-${index}`,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitSalePrice: item.unitSalePrice,
          unitCostPrice: item.unitCostPrice,
          lineTotal: item.lineTotal,
          lineProfit: item.lineProfit
        }))
        setSaleItems(initialItems)
      } else if (sale.productId) {
        // Legacy single-product sale
        const legacyItem: SaleItem = {
          id: 'legacy-item',
          productId: sale.productId,
          productName: sale.productName || '',
          quantity: sale.quantity || 1,
          unitSalePrice: sale.unitSalePrice || 0,
          unitCostPrice: sale.unitCostPrice || 0,
          lineTotal: (sale.quantity || 1) * (sale.unitSalePrice || 0),
          lineProfit: ((sale.quantity || 1) * (sale.unitSalePrice || 0)) - ((sale.quantity || 1) * (sale.unitCostPrice || 0))
        }
        setSaleItems([legacyItem])
      }
    }
  }, [sale])

  // Fetch products and sale expense categories
  useEffect(() => {
    fetchProducts()
    fetchSaleExpenseCategories()
  }, [])

  // Update product references when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      setSaleItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          product: products.find(p => p._id?.toString() === item.productId)
        }))
      )
    }
  }, [products])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchSaleExpenseCategories = async () => {
    try {
      const response = await fetch('/api/user/sale-categories')
      const data = await response.json()
      if (data.success) {
        setSaleExpenseCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching sale expense categories:', error)
    }
  }

  const addSaleExpenseCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/user/sale-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategoryName.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setSaleExpenseCategories(data.data)
        setNewCategoryName("")
        setShowAddCategory(false)
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const addSaleExpense = () => {
    const newExpense: SaleExpense = {
      id: Date.now().toString(),
      category: saleExpenseCategories[0] || 'Other',
      amount: 0,
      description: ''
    }
    setSaleExpenses([...saleExpenses, newExpense])
  }

  const updateSaleExpense = (id: string, field: keyof SaleExpense, value: string | number) => {
    setSaleExpenses(saleExpenses.map(expense =>
      expense.id === id ? { ...expense, [field]: value } : expense
    ))
  }

  const removeSaleExpense = (id: string) => {
    setSaleExpenses(saleExpenses.filter(expense => expense.id !== id))
  }

  const addSaleItem = () => {
    if (products.length === 0) return

    const newItem: SaleItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 1,
      unitSalePrice: 0,
      unitCostPrice: 0,
      lineTotal: 0,
      lineProfit: 0
    }
    setSaleItems([...saleItems, newItem])
  }

  const updateSaleItem = (id: string, field: keyof SaleItem, value: string | number) => {
    setSaleItems(saleItems.map(item => {
      if (item.id !== id) return item

      const updatedItem = { ...item, [field]: value }

      // If product is changed, update related fields
      if (field === 'productId') {
        const product = products.find(p => p._id?.toString() === value)
        if (product) {
          updatedItem.productName = product.name
          updatedItem.unitCostPrice = product.costPrice || 0
          updatedItem.unitSalePrice = product.salePrice || 0
          updatedItem.product = product
        }
      }

      // Recalculate line totals
      if (field === 'quantity' || field === 'unitSalePrice' || field === 'productId') {
        const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity
        const unitPrice = field === 'unitSalePrice' ? Number(value) : updatedItem.unitSalePrice
        const costPrice = updatedItem.unitCostPrice

        updatedItem.lineTotal = quantity * unitPrice
        updatedItem.lineProfit = (quantity * unitPrice) - (quantity * costPrice)
      }

      return updatedItem
    }))
  }

  const removeSaleItem = (id: string) => {
    setSaleItems(saleItems.filter(item => item.id !== id))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate that we have at least one item
      if (saleItems.length === 0) {
        alert('Please add at least one product to the sale')
        setLoading(false)
        return
      }

      // Validate all items have required fields
      for (const item of saleItems) {
        if (!item.productId || item.quantity <= 0 || item.unitSalePrice <= 0) {
          alert('Please fill in all required fields for each product')
          setLoading(false)
          return
        }
      }

      const totalSaleExpenses = saleExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      
      const url = isEditing ? `/api/sales/${sale?._id}` : '/api/sales'
      const method = isEditing ? 'PUT' : 'POST'
      
      // Prepare items for API
      const items = saleItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitSalePrice: item.unitSalePrice
      }))

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          customerName: formData.customerName,
          saleDate: formData.saleDate,
          notes: formData.notes,
          saleExpenses: totalSaleExpenses,
          saleExpenseDetails: saleExpenses
        })
      })

      const data = await response.json()

      if (data.success) {
        if (isEditing) {
          router.push(`/sales/${sale?._id}`)
        } else {
          router.push('/sales')
        }
        router.refresh()
      } else {
        alert(data.error || `Failed to ${isEditing ? 'update' : 'record'} sale`)
      }
    } catch (error) {
      alert(`Failed to ${isEditing ? 'update' : 'record'} sale`)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalSales = saleItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const totalCogs = saleItems.reduce((sum, item) => sum + (item.quantity * item.unitCostPrice), 0)
  const totalSaleExpenses = saleExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const grossProfit = totalSales - totalCogs
  const netProfit = grossProfit - totalSaleExpenses

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Sale Details' : 'Sale Details'}
          </h3>
          
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700 mb-1">
              Sale Date
            </label>
            <input
              type="date"
              id="saleDate"
              name="saleDate"
              value={formData.saleDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes about this sale..."
            />
          </div>
        </div>

        {/* Sale Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Sale Summary</h3>
          
          <div className="p-4 bg-green-50 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Items:</span>
              <span className="font-medium text-gray-900">{saleItems.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Revenue:</span>
              <span className="font-medium text-green-600">{currencySymbol}{totalSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total COGS:</span>
              <span className="font-medium text-red-600">{currencySymbol}{totalCogs.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Gross Profit:</span>
                <span className="font-semibold text-blue-600">{currencySymbol}{grossProfit.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Sale Expenses */}
            {totalSaleExpenses > 0 && (
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Sale Expenses:</span>
                  <span className="font-medium text-red-600">
                    -{currencySymbol}{totalSaleExpenses.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Net Profit:</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currencySymbol}{netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Products</h3>
          <button
            type="button"
            onClick={addSaleItem}
            className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>

        {saleItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No products added yet</p>
            <button
              type="button"
              onClick={addSaleItem}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {saleItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Product {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeSaleItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product *
                    </label>
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateSaleItem(item.id, 'productId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a product</option>
                      {products.map(product => {
                        const productDetails = []
                        if (product.category) productDetails.push(product.category)
                        if (product.type) productDetails.push(product.type)
                        if (product.size) productDetails.push(`Size: ${product.size}`)
                        if (product.color) productDetails.push(`Color: ${product.color}`)
                        if (product.sku) productDetails.push(`SKU: ${product.sku}`)
                        
                        const detailsText = productDetails.length > 0 ? ` (${productDetails.join(', ')})` : ''
                        const stockText = product.currentStock > 0 ? ` - Stock: ${product.currentStock}` : ' - Out of Stock'
                        
                        return (
                          <option 
                            key={product._id?.toString()} 
                            value={product._id?.toString()}
                            disabled={product.currentStock === 0}
                          >
                            {product.name}{detailsText}{stockText}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={item.product?.currentStock || 999}
                      value={item.quantity}
                      onChange={(e) => updateSaleItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unitSalePrice}
                        onChange={(e) => updateSaleItem(item.id, 'unitSalePrice', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Total
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                      {currencySymbol}{item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale-Related Expenses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Sale-Related Expenses</h3>
          <button
            type="button"
            onClick={addSaleExpense}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Expense
          </button>
        </div>

        {saleExpenses.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No sale-related expenses added</p>
        ) : (
          <div className="space-y-3">
            {saleExpenses.map(expense => (
              <div key={expense.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <select
                    value={expense.category}
                    onChange={(e) => updateSaleExpense(expense.id, 'category', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {saleExpenseCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expense.amount}
                      onChange={(e) => updateSaleExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => updateSaleExpense(expense.id, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Description"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeSaleExpense(expense.id)}
                    className="w-full h-full flex items-center justify-center text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Category */}
        <div className="mt-4">
          {showAddCategory ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addSaleExpenseCategory}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(false)
                  setNewCategoryName("")
                }}
                className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add New Category
            </button>
          )}
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || saleItems.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (isEditing ? "Updating..." : "Recording...") : (isEditing ? "Update Sale" : "Record Sale")}
        </button>
      </div>
    </form>
  )
} 