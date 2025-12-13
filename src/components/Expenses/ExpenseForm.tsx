"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useCurrency } from "@/hooks/useCurrency"
import { useModal } from "@/context/ModalContext"
import { Expense } from "@/lib/types"

interface ExpenseFormProps {
  userId: string
  expense?: Expense
  isEditing?: boolean
}

const defaultExpenseCategories = [
  "Office Supplies",
  "Marketing",
  "Equipment",
  "Travel",
  "Utilities",
  "Rent",
  "Insurance",
  "Professional Services",
  "Software",
  "Inventory",
  "Shipping",
  "Other"
]

export default function ExpenseForm({ userId, expense, isEditing = false }: ExpenseFormProps) {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const { showModal } = useModal()
  const [loading, setLoading] = useState(false)
  const [userCategories, setUserCategories] = useState<string[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [formData, setFormData] = useState({
    description: expense?.description || "",
    amount: expense?.amount?.toString() || "",
    category: expense?.category || "",
    date: expense?.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: expense?.notes || ""
  })

  useEffect(() => {
    fetchUserCategories()
  }, [])

  const fetchUserCategories = async () => {
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      if (data.success) {
        const customCategories = data.data.settings?.customExpenseCategories || []
        setUserCategories([...defaultExpenseCategories, ...customCategories])
      } else {
        setUserCategories(defaultExpenseCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setUserCategories(defaultExpenseCategories)
    }
  }

  const addNewCategory = async () => {
    if (!newCategory.trim()) return

    try {
      const response = await fetch('/api/user/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'expense',
          category: newCategory.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        setUserCategories([...userCategories, newCategory.trim()])
        setFormData(prev => ({ ...prev, category: newCategory.trim() }))
        setNewCategory("")
        setShowAddCategory(false)
        setNewCategory("")
        setShowAddCategory(false)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to add category', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to add category', type: 'error' })
    }
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
      const url = isEditing ? `/api/expenses/${expense?._id}` : '/api/expenses'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          expenseDate: new Date(formData.date)
        })
      })

      const data = await response.json()

      if (data.success) {
        if (isEditing) {
          router.push(`/expenses/${expense?._id}`)
        } else {
          router.push('/expenses')
        }
        router.refresh()
        router.refresh()
      } else {
        showModal({ title: 'Error', message: data.error || `Failed to ${isEditing ? 'update' : 'add'} expense`, type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: `Failed to ${isEditing ? 'update' : 'add'} expense`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Expense Details</h3>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What was this expense for?"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              name="category"
              required
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {userCategories.map((category: string) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Add Category Button */}
            <div className="mt-2">
              {!showAddCategory ? (
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add new category
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-3 py-1 border border-gray-300 rounded text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                  />
                  <button
                    type="button"
                    onClick={addNewCategory}
                    disabled={!newCategory.trim()}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false)
                      setNewCategory("")
                    }}
                    className="px-2 py-1 text-gray-600 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={6}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional details, receipt numbers, or notes about this expense..."
            />
          </div>

          {/* Expense Summary */}
          {formData.amount && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Expense Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{currencySymbol}{parseFloat(formData.amount || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900">{formData.category || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {formData.date ? new Date(formData.date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Category Tips */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Category Tips</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Office Supplies:</strong> Pens, paper, printer ink</p>
              <p><strong>Marketing:</strong> Ads, promotional materials</p>
              <p><strong>Equipment:</strong> Tools, machinery, computers</p>
              <p><strong>Professional Services:</strong> Legal, accounting</p>
              <p><strong>Inventory:</strong> Products for resale</p>
            </div>
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
          disabled={loading || !formData.description || !formData.amount || !formData.category}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Adding..." : "Add Expense"}
        </button>
      </div>
    </form>
  )
} 