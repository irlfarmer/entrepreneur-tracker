"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, XMarkIcon, CogIcon } from "@heroicons/react/24/outline"
import { Product } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"

interface ProductFormProps {
  product?: Product
  isEditing?: boolean
  duplicateData?: any
}

interface CustomField {
  name: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

const defaultCategories = [
  "Electronics",
  "Clothing",
  "Books",
  "Home & Garden",
  "Sports",
  "Toys",
  "Health & Beauty",
  "Automotive",
  "Other"
]

export default function ProductForm({ product, isEditing = false, duplicateData }: ProductFormProps) {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const { currentBusiness } = useBusiness()
  const { showModal } = useModal()
  const [loading, setLoading] = useState(false)
  const [userCategories, setUserCategories] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [showFieldManager, setShowFieldManager] = useState(false)
  const [newField, setNewField] = useState<CustomField>({ name: "", type: "text" })
  const [newFieldOption, setNewFieldOption] = useState("")

  const getInitialFormData = () => {
    if (duplicateData) {
      return {
        name: duplicateData.name || "",
        category: duplicateData.category || "",
        type: duplicateData.type || "",
        size: duplicateData.size || "",
        color: duplicateData.color || "",
        sku: duplicateData.sku || "",
        costPrice: duplicateData.costPrice?.toString() || "",
        salePrice: duplicateData.salePrice?.toString() || "",
        currentStock: duplicateData.currentStock?.toString() || "",
        customFieldValues: duplicateData.customFields || {}
      }
    } else if (product) {
      return {
        name: product.name || "",

        category: product.category || "",
        type: product.type || "",
        // productType removed as now we have separate Services entity
        size: product.size || "",
        color: product.color || "",
        sku: product.sku || "",
        costPrice: product.costPrice?.toString() || "",
        salePrice: product.salePrice?.toString() || "",
        currentStock: product.currentStock?.toString() || "",
        customFieldValues: (product as any)?.customFieldValues || {}
      }
    } else {
      return {
        name: "",
        category: "",
        type: "",
        productType: "physical",
        size: "",
        color: "",
        sku: "",
        costPrice: "",
        salePrice: "",
        currentStock: "",
        customFieldValues: {}
      }
    }
  }

  const [formData, setFormData] = useState(getInitialFormData())

  useEffect(() => {
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      if (data.success) {
        const customCategories = data.data.settings?.customProductCategories || []
        const userCustomFields = data.data.settings?.customProductFields || []
        setUserCategories([...defaultCategories, ...customCategories])
        setCustomFields(userCustomFields)
      } else {
        setUserCategories(defaultCategories)
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
      setUserCategories(defaultCategories)
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
          type: 'product',
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

  const addCustomField = async () => {
    if (!newField.name.trim()) return

    try {
      const response = await fetch('/api/user/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: newField
        })
      })

      const data = await response.json()
      if (data.success) {
        setCustomFields([...customFields, newField])
        setNewField({ name: "", type: "text" })
        setShowFieldManager(false)
        setNewField({ name: "", type: "text" })
        setShowFieldManager(false)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to add custom field', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to add custom field', type: 'error' })
    }
  }

  const addFieldOption = () => {
    if (!newFieldOption.trim()) return

    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), newFieldOption.trim()]
    }))
    setNewFieldOption("")
  }

  const removeFieldOption = (optionToRemove: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter(option => option !== optionToRemove) || []
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
      const url = isEditing ? `/api/products/${product?._id}` : '/api/products'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          businessId: currentBusiness.id,
          // If service, cost price defaults to 0 if not set (or effectively 0 since hidden)
          costPrice: formData.productType === 'service' ? 0 : formData.costPrice,
          // If service, set default stock to 999999 to avoid low stock alerts
          currentStock: formData.productType === 'service' ? 999999 : formData.currentStock
        })
      })

      const data = await response.json()

      if (data.success) {
        router.push('/inventory')
        router.refresh()
        router.push('/inventory')
        router.refresh()
      } else {
        showModal({ title: 'Error', message: data.error || `Failed to ${isEditing ? 'update' : 'create'} product`, type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: `Failed to ${isEditing ? 'update' : 'create'} product`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const profitMargin = formData.costPrice && formData.salePrice
    ? ((parseFloat(formData.salePrice) - parseFloat(formData.costPrice)) / parseFloat(formData.salePrice) * 100)
    : 0

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product name"
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
              {userCategories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
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
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., T-shirt, Novel"
              />
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Stock Keeping Unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                Size
              </label>
              <input
                type="text"
                id="size"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Medium, 12 oz"
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="text"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Blue, Red"
              />
            </div>
          </div>

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold text-gray-900">Custom Fields</h4>
                <button
                  type="button"
                  onClick={() => setShowFieldManager(true)}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <CogIcon className="h-4 w-4 mr-1" />
                  Manage Fields
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field: CustomField, index: number) => (
                  <div key={index}>
                    <label htmlFor={`custom_${field.name}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.name}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        id={`custom_${field.name}`}
                        value={formData.customFieldValues[field.name] || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customFieldValues: {
                            ...prev.customFieldValues,
                            [field.name]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        id={`custom_${field.name}`}
                        value={formData.customFieldValues[field.name] || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customFieldValues: {
                            ...prev.customFieldValues,
                            [field.name]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}

                    {field.type === 'select' && field.options && (
                      <select
                        id={`custom_${field.name}`}
                        value={formData.customFieldValues[field.name] || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customFieldValues: {
                            ...prev.customFieldValues,
                            [field.name]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select {field.name.toLowerCase()}</option>
                        {field.options.map((option: string) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Fields Button */}
          {!showFieldManager && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowFieldManager(true)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add custom field
              </button>
            </div>
          )}
        </div>

        {/* Pricing and Stock */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pricing & Stock</h3>

          {formData.productType !== 'service' && (
            <div>
              <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                <input
                  type="number"
                  id="costPrice"
                  name="costPrice"
                  required
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">What you paid for this product</p>
            </div>
          )}

          <div>
            <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
              <input
                type="number"
                id="salePrice"
                name="salePrice"
                required
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={handleInputChange}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">What you sell this product for</p>
          </div>

          {/* Profit Margin Display */}
          {formData.costPrice && formData.salePrice && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Profit Margin:</span>
                <span className={`text-sm font-semibold ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">Profit per unit:</span>
                <span className={`text-xs font-medium ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currencySymbol}{(parseFloat(formData.salePrice || '0') - parseFloat(formData.costPrice || '0')).toFixed(2)}
                </span>
              </div>
            </div>
          )}



          {formData.productType !== 'service' && (
            <div>
              <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700 mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                id="currentStock"
                name="currentStock"
                required
                min="0"
                step="1"
                value={formData.currentStock}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Number of units in stock</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
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
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}
        </button>
      </div>

      {/* Field Manager Modal */}
      {
        showFieldManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Field</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Brand, Material, Weight"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type
                  </label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField(prev => ({
                      ...prev,
                      type: e.target.value as 'text' | 'number' | 'select',
                      options: e.target.value === 'select' ? [] : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown</option>
                  </select>
                </div>

                {newField.type === 'select' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options
                    </label>
                    <div className="space-y-2">
                      {newField.options && newField.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="flex-1 px-3 py-1 bg-gray-100 rounded text-sm text-gray-900">
                            {option}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFieldOption(option)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newFieldOption}
                          onChange={(e) => setNewFieldOption(e.target.value)}
                          placeholder="Add option"
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && addFieldOption()}
                        />
                        <button
                          type="button"
                          onClick={addFieldOption}
                          disabled={!newFieldOption.trim()}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldManager(false)
                    setNewField({ name: "", type: "text" })
                    setNewFieldOption("")
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addCustomField}
                  disabled={!newField.name.trim() || (newField.type === 'select' && (!newField.options || newField.options.length === 0))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )
      }
    </form >
  )
} 