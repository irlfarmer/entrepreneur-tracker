"use client"

import { useState, useEffect } from "react"
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  XMarkIcon,
  CheckIcon,
  TagIcon,
  Cog6ToothIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline"

interface CustomField {
  name: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

export default function CategoryFieldManager() {
  const [customProductCategories, setCustomProductCategories] = useState<string[]>([])
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'product-categories' | 'expense-categories' | 'fields'>('product-categories')
  
  // Category management state
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  
  // Field management state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editFieldValue, setEditFieldValue] = useState<CustomField>({ name: "", type: "text" })
  const [newField, setNewField] = useState<CustomField>({ name: "", type: "text" })
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldOption, setNewFieldOption] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      
      if (data.success) {
        setCustomProductCategories(data.data.settings?.customProductCategories || [])
        setCustomExpenseCategories(data.data.settings?.customExpenseCategories || [])
        setCustomFields(data.data.settings?.customProductFields || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Category functions
  const addCategory = async (type: 'product' | 'expense') => {
    if (!newCategory.trim()) return

    try {
      const response = await fetch('/api/user/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: newCategory.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        if (type === 'product') {
          setCustomProductCategories([...customProductCategories, newCategory.trim()])
        } else {
          setCustomExpenseCategories([...customExpenseCategories, newCategory.trim()])
        }
        setNewCategory("")
        setShowAddCategory(false)
      } else {
        alert(data.error || 'Failed to add category')
      }
    } catch (error) {
      alert('Failed to add category')
    }
  }

  const updateCategory = async (type: 'product' | 'expense', oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingCategory(null)
      return
    }

    try {
      const response = await fetch('/api/user/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          oldCategory: oldName,
          newCategory: newName.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        if (type === 'product') {
          setCustomProductCategories(customProductCategories.map(cat => 
            cat === oldName ? newName.trim() : cat
          ))
        } else {
          setCustomExpenseCategories(customExpenseCategories.map(cat => 
            cat === oldName ? newName.trim() : cat
          ))
        }
        setEditingCategory(null)
      } else {
        alert(data.error || 'Failed to update category')
      }
    } catch (error) {
      alert('Failed to update category')
    }
  }

  const deleteCategory = async (type: 'product' | 'expense', categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) return

    try {
      const response = await fetch(`/api/user/categories?type=${type}&category=${encodeURIComponent(categoryName)}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        if (type === 'product') {
          setCustomProductCategories(customProductCategories.filter(cat => cat !== categoryName))
        } else {
          setCustomExpenseCategories(customExpenseCategories.filter(cat => cat !== categoryName))
        }
      } else {
        alert(data.error || 'Failed to delete category')
      }
    } catch (error) {
      alert('Failed to delete category')
    }
  }

  // Field functions
  const addField = async () => {
    if (!newField.name.trim()) return

    try {
      const response = await fetch('/api/user/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: newField })
      })

      const data = await response.json()
      if (data.success) {
        setCustomFields([...customFields, newField])
        setNewField({ name: "", type: "text" })
        setShowAddField(false)
      } else {
        alert(data.error || 'Failed to add field')
      }
    } catch (error) {
      alert('Failed to add field')
    }
  }

  const updateField = async (oldName: string, updatedField: CustomField) => {
    if (!updatedField.name.trim()) return

    try {
      const response = await fetch('/api/user/custom-fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldFieldName: oldName,
          field: updatedField
        })
      })

      const data = await response.json()
      if (data.success) {
        setCustomFields(customFields.map(field => 
          field.name === oldName ? updatedField : field
        ))
        setEditingField(null)
      } else {
        alert(data.error || 'Failed to update field')
      }
    } catch (error) {
      alert('Failed to update field')
    }
  }

  const deleteField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to delete the field "${fieldName}"?`)) return

    try {
      const response = await fetch(`/api/user/custom-fields?fieldName=${encodeURIComponent(fieldName)}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setCustomFields(customFields.filter(field => field.name !== fieldName))
      } else {
        alert(data.error || 'Failed to delete field')
      }
    } catch (error) {
      alert('Failed to delete field')
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

  const addEditFieldOption = (fieldName: string) => {
    if (!newFieldOption.trim()) return
    
    setEditFieldValue(prev => ({
      ...prev,
      options: [...(prev.options || []), newFieldOption.trim()]
    }))
    setNewFieldOption("")
  }

  const removeEditFieldOption = (optionToRemove: string) => {
    setEditFieldValue(prev => ({
      ...prev,
      options: prev.options?.filter(option => option !== optionToRemove) || []
    }))
  }

  // Render category management UI
  const renderCategoryManagement = (type: 'product' | 'expense') => {
    const categories = type === 'product' ? customProductCategories : customExpenseCategories
    const categoryType = type === 'product' ? 'Product' : 'Expense'
    
    return (
      <div className="space-y-4">
        {/* Add Category Button */}
        {!showAddCategory && (
          <button
            onClick={() => setShowAddCategory(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add {categoryType} Category
          </button>
        )}

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder={`${categoryType} category name`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addCategory(type)}
              />
              <button
                onClick={() => addCategory(type)}
                disabled={!newCategory.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false)
                  setNewCategory("")
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No custom {categoryType.toLowerCase()} categories yet. Add your first category above.
            </p>
          ) : (
            categories.map((category) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                {editingCategory === category ? (
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="text"
                      value={editCategoryValue}
                      onChange={(e) => setEditCategoryValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && updateCategory(type, category, editCategoryValue)}
                    />
                    <button
                      onClick={() => updateCategory(type, category, editCategoryValue)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-900 font-medium">{category}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setEditCategoryValue(category)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Category"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCategory(type, category)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Category"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Manage Categories & Fields</h2>
        <p className="text-sm text-gray-600 mt-1">
          Customize your product and expense categories, and product fields to better organize your business
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('product-categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'product-categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TagIcon className="h-4 w-4 inline mr-2" />
            Product Categories ({customProductCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('expense-categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense-categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BanknotesIcon className="h-4 w-4 inline mr-2" />
            Expense Categories ({customExpenseCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fields'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
            Product Fields ({customFields.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'product-categories' && renderCategoryManagement('product')}
        {activeTab === 'expense-categories' && renderCategoryManagement('expense')}
        
        {activeTab === 'fields' && (
          <div className="space-y-4">
            {/* Add Field Button */}
            {!showAddField && (
              <button
                onClick={() => setShowAddField(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Custom Field
              </button>
            )}

            {/* Add Field Form */}
            {showAddField && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  {newField.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Options
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newFieldOption}
                            onChange={(e) => setNewFieldOption(e.target.value)}
                            placeholder="Add option"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && addFieldOption()}
                          />
                          <button
                            onClick={addFieldOption}
                            disabled={!newFieldOption.trim()}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                        {newField.options && newField.options.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newField.options.map((option, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                {option}
                                <button
                                  onClick={() => removeFieldOption(option)}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddField(false)
                        setNewField({ name: "", type: "text" })
                        setNewFieldOption("")
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addField}
                      disabled={!newField.name.trim() || (newField.type === 'select' && (!newField.options || newField.options.length === 0))}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fields List */}
            <div className="space-y-2">
              {customFields.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No custom fields yet. Add your first field above.
                </p>
              ) : (
                customFields.map((field) => (
                  <div key={field.name} className="bg-gray-50 rounded-lg p-4">
                    {editingField === field.name ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Name
                            </label>
                            <input
                              type="text"
                              value={editFieldValue.name}
                              onChange={(e) => setEditFieldValue(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Type
                            </label>
                            <select
                              value={editFieldValue.type}
                              onChange={(e) => setEditFieldValue(prev => ({ 
                                ...prev, 
                                type: e.target.value as 'text' | 'number' | 'select',
                                options: e.target.value === 'select' ? prev.options || [] : undefined
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="select">Dropdown</option>
                            </select>
                          </div>
                        </div>

                        {editFieldValue.type === 'select' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Options
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={newFieldOption}
                                  onChange={(e) => setNewFieldOption(e.target.value)}
                                  placeholder="Add option"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  onKeyPress={(e) => e.key === 'Enter' && addEditFieldOption(field.name)}
                                />
                                <button
                                  onClick={() => addEditFieldOption(field.name)}
                                  disabled={!newFieldOption.trim()}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                              {editFieldValue.options && editFieldValue.options.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editFieldValue.options.map((option, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                      {option}
                                      <button
                                        onClick={() => removeEditFieldOption(option)}
                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                      >
                                        <XMarkIcon className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setEditingField(null)
                              setNewFieldOption("")
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateField(field.name, editFieldValue)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Update Field
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{field.name}</h4>
                          <p className="text-sm text-gray-500">
                            Type: {field.type}
                            {field.type === 'select' && field.options && (
                              <span className="ml-2">
                                ({field.options.length} options: {field.options.join(', ')})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingField(field.name)
                              setEditFieldValue(field)
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Field"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteField(field.name)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Field"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 