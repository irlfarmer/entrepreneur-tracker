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
  BanknotesIcon,
  BriefcaseIcon
} from "@heroicons/react/24/outline"
import { useModal } from "@/context/ModalContext"
import { useBusiness } from "@/context/BusinessContext"

interface CustomField {
  name: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

interface CategoryFieldManagerProps {
  businessId?: string
  defaultTab?: 'product-categories' | 'expense-categories' | 'service-categories' | 'fields' | 'service-fields'
}

export default function CategoryFieldManager({ businessId, defaultTab = 'product-categories' }: CategoryFieldManagerProps) {
  const { showModal } = useModal()
  const { currentBusiness } = useBusiness()
  const activeBusinessId = businessId || currentBusiness?.id
  const [customProductCategories, setCustomProductCategories] = useState<string[]>([])
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([])
  const [customServiceCategories, setCustomServiceCategories] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customServiceFields, setCustomServiceFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(defaultTab)

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
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedItems(new Set())
  }, [activeTab])

  useEffect(() => {
    if (activeBusinessId) {
      fetchData()
    }
  }, [activeBusinessId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeBusinessId) params.append('businessId', activeBusinessId)

      const response = await fetch(`/api/user/settings?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setCustomProductCategories(data.data.settings?.customProductCategories || [])
        setCustomExpenseCategories(data.data.settings?.customExpenseCategories || [])
        setCustomServiceCategories(data.data.settings?.customServiceCategories || [])
        setCustomFields(data.data.settings?.customProductFields || [])
        setCustomServiceFields(data.data.settings?.customServiceFields || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Category functions
  const addCategory = async (type: 'product' | 'expense' | 'service') => {
    if (!newCategory.trim()) return

    try {
      const response = await fetch('/api/user/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: newCategory.trim(),
          businessId: activeBusinessId
        })
      })

      const data = await response.json()
      if (data.success) {
        if (type === 'product') {
          setCustomProductCategories([...customProductCategories, newCategory.trim()])
        } else if (type === 'expense') {
          setCustomExpenseCategories([...customExpenseCategories, newCategory.trim()])
        } else {
          setCustomServiceCategories([...customServiceCategories, newCategory.trim()])
        }
        setNewCategory("")
        setShowAddCategory(false)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to add category', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to add category', type: 'error' })
    }
  }

  const updateCategory = async (type: 'product' | 'expense' | 'service', oldName: string, newName: string) => {
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
          newCategory: newName.trim(),
          businessId: activeBusinessId
        })
      })

      const data = await response.json()
      if (data.success) {
        if (type === 'product') {
          setCustomProductCategories(customProductCategories.map(cat =>
            cat === oldName ? newName.trim() : cat
          ))
        } else if (type === 'expense') {
          setCustomExpenseCategories(customExpenseCategories.map(cat =>
            cat === oldName ? newName.trim() : cat
          ))
        } else {
          setCustomServiceCategories(customServiceCategories.map(cat =>
            cat === oldName ? newName.trim() : cat
          ))
        }
        setEditingCategory(null)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to update category', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to update category', type: 'error' })
    }
  }

  const deleteCategory = (type: 'product' | 'expense' | 'service', categoryName: string) => {
    showModal({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${categoryName}"?`,
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/user/categories?type=${type}&category=${encodeURIComponent(categoryName)}&businessId=${activeBusinessId || ''}`, {
            method: 'DELETE'
          })

          const data = await response.json()
          if (data.success) {
            if (type === 'product') {
              setCustomProductCategories(prev => prev.filter(cat => cat !== categoryName))
            } else if (type === 'expense') {
              setCustomExpenseCategories(prev => prev.filter(cat => cat !== categoryName))
            } else {
              setCustomServiceCategories(prev => prev.filter(cat => cat !== categoryName))
            }
            showModal({ title: 'Success', message: 'Category deleted successfully', type: 'success' })
          } else {
            showModal({ title: 'Error', message: data.error || 'Failed to delete category', type: 'error' })
          }
        } catch (error) {
          showModal({ title: 'Error', message: 'Failed to delete category', type: 'error' })
        }
      }
    })
  }

  // Field functions
  const addField = async (entityType: 'product' | 'service' = 'product') => {
    if (!newField.name.trim()) return

    try {
      const response = await fetch('/api/user/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: newField, entityType, businessId: activeBusinessId })
      })

      const data = await response.json()
      if (data.success) {
        if (entityType === 'product') {
          setCustomFields([...customFields, newField])
        } else {
          setCustomServiceFields([...customServiceFields, newField])
        }
        setNewField({ name: "", type: "text" })
        setShowAddField(false)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to add field', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to add field', type: 'error' })
    }
  }

  const updateField = async (oldName: string, updatedField: CustomField, entityType: 'product' | 'service' = 'product') => {
    if (!updatedField.name.trim()) return

    try {
      const response = await fetch('/api/user/custom-fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldFieldName: oldName,
          field: updatedField,
          entityType,
          businessId: activeBusinessId
        })
      })

      const data = await response.json()
      if (data.success) {
        if (entityType === 'product') {
          setCustomFields(customFields.map(field =>
            field.name === oldName ? updatedField : field
          ))
        } else {
          setCustomServiceFields(customServiceFields.map(field =>
            field.name === oldName ? updatedField : field
          ))
        }
        setEditingField(null)
      } else {
        showModal({ title: 'Error', message: data.error || 'Failed to update field', type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: 'Failed to update field', type: 'error' })
    }
  }

  const deleteField = (fieldName: string, entityType: 'product' | 'service' = 'product') => {
    showModal({
      title: 'Delete Field',
      message: `Are you sure you want to delete the field "${fieldName}"?`,
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/user/custom-fields?fieldName=${encodeURIComponent(fieldName)}&entityType=${entityType}&businessId=${activeBusinessId || ''}`, {
            method: 'DELETE'
          })

          const data = await response.json()
          if (data.success) {
            if (entityType === 'product') {
              setCustomFields(prev => prev.filter(field => field.name !== fieldName))
            } else {
              setCustomServiceFields(prev => prev.filter(field => field.name !== fieldName))
            }
            setSelectedItems(prev => {
              const next = new Set(prev)
              next.delete(fieldName)
              return next
            })
            showModal({ title: 'Success', message: 'Field deleted successfully', type: 'success' })
          } else {
            showModal({ title: 'Error', message: data.error || 'Failed to delete field', type: 'error' })
          }
        } catch (error) {
          showModal({ title: 'Error', message: 'Failed to delete field', type: 'error' })
        }
      }
    })
  }

  // Bulk Selection Helpers
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getActiveTabItems = () => {
    switch (activeTab) {
      case 'product-categories': return customProductCategories
      case 'expense-categories': return customExpenseCategories
      case 'service-categories': return customServiceCategories
      case 'fields': return customFields.map(f => f.name)
      case 'service-fields': return customServiceFields.map(f => f.name)
      default: return []
    }
  }

  const toggleSelectAll = () => {
    const items = getActiveTabItems()
    if (selectedItems.size === items.length && items.length > 0) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items))
    }
  }

  const handleBulkDelete = async () => {
    const items = Array.from(selectedItems)
    if (items.length === 0) return

    showModal({
      title: `Delete ${items.length} Items`,
      message: `Are you sure you want to delete these ${items.length} selected items? This action cannot be undone.`,
      type: 'confirm',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setIsBulkDeleting(true)
        let successCount = 0
        let failCount = 0

        try {
          for (const item of items) {
            let url = ''
            if (activeTab.includes('categories')) {
              const type = activeTab.split('-')[0] as 'product' | 'expense' | 'service'
              url = `/api/user/categories?type=${type}&category=${encodeURIComponent(item)}&businessId=${activeBusinessId || ''}`
            } else {
              const entityType = activeTab === 'fields' ? 'product' : 'service'
              url = `/api/user/custom-fields?fieldName=${encodeURIComponent(item)}&entityType=${entityType}&businessId=${activeBusinessId || ''}`
            }

            const response = await fetch(url, { method: 'DELETE' })
            const data = await response.json()
            if (data.success) successCount++
            else failCount++
          }

          // Refresh data
          await fetchData()
          setSelectedItems(new Set())
          
          showModal({
            title: 'Bulk Delete Complete',
            message: `Successfully deleted ${successCount} items.${failCount > 0 ? ` Failed to delete ${failCount} items.` : ''}`,
            type: successCount > 0 ? 'success' : 'error'
          })
        } catch (error) {
          showModal({ title: 'Error', message: 'An unexpected error occurred during bulk delete.', type: 'error' })
        } finally {
          setIsBulkDeleting(false)
        }
      }
    })
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
  const renderCategoryManagement = (type: 'product' | 'expense' | 'service') => {
    let categories: string[] = []
    let categoryType = ''

    if (type === 'product') {
      categories = customProductCategories
      categoryType = 'Product'
    } else if (type === 'expense') {
      categories = customExpenseCategories
      categoryType = 'Expense'
    } else {
      categories = customServiceCategories
      categoryType = 'Service'
    }

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
          {categories.length > 0 && (
            <div className="flex items-center px-3 py-2 bg-gray-50/50 rounded-lg border border-gray-100">
              <button
                onClick={toggleSelectAll}
                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedItems.size === categories.length && categories.length > 0
                    ? "bg-blue-600 border-blue-600"
                    : selectedItems.size > 0
                    ? "bg-blue-100 border-blue-400"
                    : "border-gray-300 hover:border-blue-400"
                }`}
              >
                {selectedItems.size === categories.length && categories.length > 0 && (
                  <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
                )}
                {selectedItems.size > 0 && selectedItems.size < categories.length && (
                  <span className="block w-2 h-0.5 bg-blue-600 rounded" />
                )}
              </button>
              <span className="ml-3 text-sm font-medium text-gray-500">
                Select All {categoryType} Categories
              </span>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No custom {categoryType.toLowerCase()} categories yet. Add your first category above.
            </p>
          ) : (
            categories.map((category) => (
              <div key={category} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${selectedItems.has(category) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center flex-1">
                  <button
                    onClick={() => toggleSelectItem(category)}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedItems.has(category)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {selectedItems.has(category) && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>
                  <div className="ml-3 flex-1">
                    {editingCategory === category ? (
                      <div className="flex items-center space-x-3">
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
                      <div className="flex items-center justify-between">
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
                      </div>
                    )}
                  </div>
                </div>
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
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'product-categories'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <TagIcon className="h-4 w-4 inline mr-2" />
            Product Categories ({customProductCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('expense-categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expense-categories'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <BanknotesIcon className="h-4 w-4 inline mr-2" />
            Expense Categories ({customExpenseCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'fields'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
            Product Fields ({customFields.length})
          </button>
          <button
            onClick={() => setActiveTab('service-categories')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'service-categories'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <BriefcaseIcon className="h-4 w-4 inline mr-2" />
            Service Categories ({customServiceCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('service-fields')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'service-fields'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
            Service Fields ({customServiceFields.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 pb-24 relative">
        {/* Floating Bulk Action Bar */}
        <div
          style={{
            transform: selectedItems.size > 0 ? "translateY(0)" : "translateY(120%)",
            opacity: selectedItems.size > 0 ? 1 : 0,
            transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
            pointerEvents: selectedItems.size > 0 ? "auto" : "none",
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 bg-gray-900 text-white rounded-2xl shadow-2xl"
        >
          <span className="text-sm font-medium">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full text-xs font-bold mr-2">
              {selectedItems.size}
            </span>
            items selected
          </span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setSelectedItems(new Set())}
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            {isBulkDeleting ? "Deleting…" : `Delete Selected`}
          </button>
        </div>

        {activeTab === 'product-categories' && renderCategoryManagement('product')}
        {activeTab === 'expense-categories' && renderCategoryManagement('expense')}
        {activeTab === 'service-categories' && renderCategoryManagement('service')}

        {activeTab === 'fields' && (
          <div className="space-y-4">
            {/* Product Field Manager Logic... Copied below for Service Fields with slight mods */}
            {renderFieldManagement('product')}
          </div>
        )}

        {activeTab === 'service-fields' && (
          <div className="space-y-4">
            {renderFieldManagement('service')}
          </div>
        )}
      </div>
    </div>
  )

  function renderFieldManagement(entityType: 'product' | 'service') {
    const currentFieldsList = entityType === 'product' ? customFields : customServiceFields
    const entityName = entityType === 'product' ? 'Product' : 'Service'

    return (
      <div className="space-y-4">
        {/* Add Field Button */}
        {!showAddField && (
          <button
            onClick={() => setShowAddField(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Custom {entityName} Field
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
                  onClick={() => addField(entityType)}
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
          {currentFieldsList.length > 0 && (
            <div className="flex items-center px-4 py-2 bg-gray-50/50 rounded-lg border border-gray-100">
              <button
                onClick={toggleSelectAll}
                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedItems.size === currentFieldsList.length && currentFieldsList.length > 0
                    ? "bg-blue-600 border-blue-600"
                    : selectedItems.size > 0
                    ? "bg-blue-100 border-blue-400"
                    : "border-gray-300 hover:border-blue-400"
                }`}
              >
                {selectedItems.size === currentFieldsList.length && currentFieldsList.length > 0 && (
                  <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
                )}
                {selectedItems.size > 0 && selectedItems.size < currentFieldsList.length && (
                  <span className="block w-2 h-0.5 bg-blue-600 rounded" />
                )}
              </button>
              <span className="ml-3 text-sm font-medium text-gray-500">
                Select All {entityName} Fields
              </span>
            </div>
          )}

          {currentFieldsList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No custom fields yet. Add your first field above.
            </p>
          ) : (
            currentFieldsList.map((field) => (
              <div key={field.name} className={`rounded-lg p-4 transition-colors ${selectedItems.has(field.name) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-start">
                  <button
                    onClick={() => toggleSelectItem(field.name)}
                    className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedItems.has(field.name)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {selectedItems.has(field.name) && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>
                  <div className="ml-3 flex-1">
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
                        onClick={() => updateField(field.name, editFieldValue, entityType)}
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
                        onClick={() => deleteField(field.name, entityType)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
} 