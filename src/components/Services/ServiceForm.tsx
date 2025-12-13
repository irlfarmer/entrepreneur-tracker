"use client"

import { useState, useEffect } from "react"
import { PlusIcon, XMarkIcon, CogIcon } from "@heroicons/react/24/outline"
import { SerializedService } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"

interface ServiceFormProps {
    service?: SerializedService | null
    onSuccess: () => void
    onCancel: () => void
}

interface CustomField {
    name: string
    type: 'text' | 'number' | 'select'
    options?: string[]
}

const defaultCategories = [
    "Consulting",
    "Maintenance",
    "Design",
    "Support",
    "Labor",
    "Other"
]

export default function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
    const { symbol: currencySymbol } = useCurrency()
    const { currentBusiness } = useBusiness()
    const { showModal } = useModal()

    const [loading, setLoading] = useState(false)
    const [serviceCategories, setServiceCategories] = useState<string[]>([])
    const [customFields, setCustomFields] = useState<CustomField[]>([])

    // Inline Creation State
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategory, setNewCategory] = useState("")
    const [showFieldManager, setShowFieldManager] = useState(false)
    const [newField, setNewField] = useState<CustomField>({ name: "", type: "text" })
    const [newFieldOption, setNewFieldOption] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "",
        customFields: {} as Record<string, any>
    })

    useEffect(() => {
        // Initialize form with service data if editing
        if (service) {
            setFormData({
                name: service.name,
                description: service.description || "",
                price: service.price.toString(),
                category: service.category || "",
                customFields: service.customFields || {}
            })
        } else {
            // Reset if new
            setFormData({
                name: "",
                description: "",
                price: "",
                category: "",
                customFields: {}
            })
        }
        fetchSettings()
    }, [service, currentBusiness?.id])

    const fetchSettings = async () => {
        if (!currentBusiness?.id) return
        try {
            const response = await fetch(`/api/user/settings?businessId=${currentBusiness.id}`)
            const data = await response.json()
            if (data.success) {
                setServiceCategories(data.data.settings?.customServiceCategories || [])
                setCustomFields(data.data.settings?.customServiceFields || [])
            }
        } catch (error) {
            console.error("Failed to fetch settings", error)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addNewCategory = async () => {
        if (!newCategory.trim()) return

        try {
            const response = await fetch('/api/user/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'service',
                    category: newCategory.trim(),
                    businessId: currentBusiness.id
                })
            })

            const data = await response.json()
            if (data.success) {
                setServiceCategories([...serviceCategories, newCategory.trim()])
                setFormData(prev => ({ ...prev, category: newCategory.trim() }))
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    field: newField,
                    entityType: 'service',
                    businessId: currentBusiness.id
                })
            })

            const data = await response.json()
            if (data.success) {
                setCustomFields([...customFields, newField])
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

    const removeFieldOption = (option: string) => {
        setNewField(prev => ({
            ...prev,
            options: prev.options?.filter(o => o !== option)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = service ? `/api/services/${service._id}` : '/api/services'
            const method = service ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    businessId: currentBusiness?.id
                })
            })

            const data = await res.json()
            if (data.success) {
                onSuccess()
            } else {
                showModal({ title: 'Error', message: data.error || `Failed to ${service ? 'update' : 'create'} service`, type: 'error' })
            }
        } catch (error) {
            showModal({ title: 'Error', message: "An error occurred", type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                    <input
                        required
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="e.g. Annual Consultation"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                        <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                        <option value="">Select Category</option>
                        {serviceCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <div className="mt-2">
                        {!showAddCategory ? (
                            <button
                                type="button"
                                onClick={() => setShowAddCategory(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
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
                                    className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                    placeholder="Category Name"
                                    onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                                />
                                <button type="button" onClick={addNewCategory} className="px-2 py-1 bg-blue-600 text-white rounded text-sm font-medium">Add</button>
                                <button type="button" onClick={() => setShowAddCategory(false)} className="text-gray-500 hover:text-gray-700">
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Custom Fields */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-900">Custom Fields</h4>
                        {!showFieldManager && (
                            <button type="button" onClick={() => setShowFieldManager(true)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                                <CogIcon className="h-4 w-4 mr-1" /> Manage Fields
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        {customFields.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No custom fields defined.</p>
                        ) : (
                            customFields.map(field => (
                                <div key={field.name}>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{field.name}</label>
                                    {field.type === 'select' ? (
                                        <select
                                            value={formData.customFields[field.name] || ""}
                                            onChange={(e) => setFormData(p => ({ ...p, customFields: { ...p.customFields, [field.name]: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900"
                                        >
                                            <option value="">Select...</option>
                                            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            value={formData.customFields[field.name] || ""}
                                            onChange={(e) => setFormData(p => ({ ...p, customFields: { ...p.customFields, [field.name]: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900"
                                        />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Field Manager (Inline) */}
                    {showFieldManager && (
                        <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <h5 className="font-medium text-sm text-blue-900 mb-3">Add New Custom Field</h5>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Field Name"
                                    value={newField.name}
                                    onChange={(e) => setNewField(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm"
                                />
                                <select
                                    value={newField.type}
                                    onChange={(e) => setNewField(p => ({ ...p, type: e.target.value as any, options: e.target.value === 'select' ? [] : undefined }))}
                                    className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm"
                                >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="select">Dropdown</option>
                                </select>

                                {newField.type === 'select' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Add Option"
                                                value={newFieldOption}
                                                onChange={(e) => setNewFieldOption(e.target.value)}
                                                className="flex-1 px-3 py-1 border border-blue-200 rounded text-sm"
                                                onKeyPress={(e) => e.key === 'Enter' && addFieldOption()}
                                            />
                                            <button type="button" onClick={addFieldOption} disabled={!newFieldOption} className="px-3 bg-blue-600 text-white rounded text-sm">Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newField.options?.map(o => (
                                                <span key={o} className="bg-white border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded flex items-center">
                                                    {o} <button type="button" onClick={() => removeFieldOption(o)} className="ml-1 text-red-500 hover:text-red-700">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                    <button type="button" onClick={() => setShowFieldManager(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={addCustomField}
                                        disabled={!newField.name}
                                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                                    >
                                        Create Field
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Service details..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                    {loading ? "Saving..." : (service ? "Update Service" : "Create Service")}
                </button>
            </div>
        </form>
    )
}
