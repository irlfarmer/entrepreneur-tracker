"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/hooks/useCurrency"
import { Product } from "@/lib/types"
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline"

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

export default function SaleForm({ userId, sale, isEditing = false }: SaleFormProps) {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [saleExpenseCategories, setSaleExpenseCategories] = useState<string[]>([])
  const [saleExpenses, setSaleExpenses] = useState<SaleExpense[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [formData, setFormData] = useState({
    productId: sale?.productId || "",
    customerName: "", // Note: We don't store customer name in the current schema
    quantity: sale?.quantity?.toString() || "1",
    unitPrice: sale?.unitSalePrice?.toString() || "",
    notes: sale?.notes || ""
  })

  // Fetch products and sale expense categories
  useEffect(() => {
    fetchProducts()
    fetchSaleExpenseCategories()
  }, [])

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

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value
    const selectedProduct = products.find(p => p._id?.toString() === productId)
    
    setFormData(prev => ({
      ...prev,
      productId,
      unitPrice: selectedProduct?.salePrice?.toString() || ""
    }))
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
      const totalSaleExpenses = saleExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      
      const url = isEditing ? `/api/sales/${sale?._id}` : '/api/sales'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: formData.productId,
          productName: selectedProduct?.name || sale?.productName || "",
          quantitySold: parseInt(formData.quantity),
          unitPrice: parseFloat(formData.unitPrice),
          customerName: formData.customerName,
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

  const selectedProduct = products.find(p => p._id?.toString() === formData.productId)
  const totalAmount = formData.quantity && formData.unitPrice 
    ? (parseInt(formData.quantity) * parseFloat(formData.unitPrice))
    : 0
  const totalSaleExpenses = saleExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const grossProfit = selectedProduct 
    ? ((parseFloat(formData.unitPrice || '0') - (selectedProduct.costPrice || 0)) * parseInt(formData.quantity || '1'))
    : 0
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
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
              Product *
            </label>
            <select
              id="productId"
              name="productId"
              required
              value={formData.productId}
              onChange={handleProductChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a product</option>
              {products.map(product => (
                <option key={product._id?.toString()} value={product._id?.toString()}>
                  {product.name} - Stock: {product.currentStock}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900">{selectedProduct.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-medium text-gray-900">{selectedProduct.currentStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggested Price:</span>
                  <span className="font-medium text-gray-900">{currencySymbol}{selectedProduct.salePrice}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                required
                min="1"
                max={selectedProduct?.currentStock || 999}
                value={formData.quantity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
              />
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                <input
                  type="number"
                  id="unitPrice"
                  name="unitPrice"
                  required
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

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

          {/* Sale-Related Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Sale-Related Expenses
              </label>
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
            <div className="mt-2">
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
        </div>

        {/* Sale Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Sale Summary</h3>
          
          {totalAmount > 0 && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quantity:</span>
                <span className="font-medium text-gray-900">{formData.quantity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unit Price:</span>
                <span className="font-medium text-gray-900">{currencySymbol}{formData.unitPrice}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Revenue:</span>
                  <span className="text-lg font-bold text-green-600">{currencySymbol}{totalAmount.toFixed(2)}</span>
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

              {/* Profit Calculations */}
              {selectedProduct && (
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Gross Profit:</span>
                    <span className={`font-medium ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currencySymbol}{grossProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Net Profit:</span>
                    <span className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currencySymbol}{netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes about this sale..."
            />
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.productId || !formData.quantity || !formData.unitPrice}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (isEditing ? "Updating..." : "Recording...") : (isEditing ? "Update Sale" : "Record Sale")}
        </button>
      </div>
    </form>
  )
} 