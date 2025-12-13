"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"
import { Product, Service } from "@/lib/types"
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
    itemType: 'Product' | 'Service'
    itemId: string
    name: string
    quantity: number
    unitSalePrice: number
    unitCostPrice: number
    lineTotal: number
    lineProfit: number
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
  itemId: string
  itemType: 'Product' | 'Service'
  name: string
  quantity: number
  unitSalePrice: number
  unitCostPrice: number
  lineTotal: number
  lineProfit: number
  product?: Product
  service?: Service
  categoryFilter?: string
}

export default function SaleForm({ userId, sale, isEditing = false }: SaleFormProps) {
  const router = useRouter()
  const { symbol: currencySymbol } = useCurrency()
  const { currentBusiness } = useBusiness()
  const { showModal } = useModal()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [serviceCategories, setServiceCategories] = useState<string[]>([])
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("")
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
        const initialItems: SaleItem[] = sale.items.map((item, index) => {
          const legacyItem = item as any
          return {
            id: `item-${index}`,
            itemId: item.itemId || legacyItem.productId, // Handle legacy
            itemType: item.itemType || 'Product', // Default to Product
            name: item.name || legacyItem.productName || 'Unknown Product', // Legacy support
            quantity: item.quantity,
            unitSalePrice: item.unitSalePrice,
            unitCostPrice: item.unitCostPrice,
            lineTotal: item.lineTotal,
            lineProfit: item.lineProfit,
            categoryFilter: ""
          }
        })
        setSaleItems(initialItems)
      } else if (sale.productId) {
        // Legacy single-product sale
        const legacyItem: SaleItem = {
          id: 'legacy-item',
          itemId: sale.productId,
          itemType: 'Product',
          name: sale.productName || '',
          quantity: sale.quantity || 1,
          unitSalePrice: sale.unitSalePrice || 0,
          unitCostPrice: sale.unitCostPrice || 0,
          lineTotal: (sale.quantity || 1) * (sale.unitSalePrice || 0),
          lineProfit: ((sale.quantity || 1) * (sale.unitSalePrice || 0)) - ((sale.quantity || 1) * (sale.unitCostPrice || 0)),
          categoryFilter: ""
        }
        setSaleItems([legacyItem])
      }

      // Initialize sale expenses from existing sale data
      if (sale.saleExpenseDetails && sale.saleExpenseDetails.length > 0) {
        const initialExpenses: SaleExpense[] = sale.saleExpenseDetails.map((expense, index) => ({
          id: `expense-${index}`,
          category: expense.category,
          amount: expense.amount,
          description: expense.description
        }))
        setSaleExpenses(initialExpenses)
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
        prevItems.map(item => {
          if (item.itemType === 'Product') {
            const product = products.find(p => (p._id as any) === item.itemId || p._id?.toString() === item.itemId)
            return {
              ...item,
              product: product
            }
          }
          return item
        })
      )
    }
  }, [products])

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?businessId=${currentBusiness?.id || 'default'}`)
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchServiceSettings = async () => {
    if (!currentBusiness?.id) return
    try {
      const res = await fetch(`/api/user/settings?businessId=${currentBusiness.id}`)
      const data = await res.json()
      if (data.success) {
        setServiceCategories(data.data.settings?.customServiceCategories || [])
      }
    } catch (error) {
      console.error("Failed to fetch service settings", error)
    }
  }

  const fetchServices = async () => {
    if (!currentBusiness?.id) return
    try {
      const response = await fetch(`/api/services?businessId=${currentBusiness.id}`)
      const data = await response.json()
      if (data.success) {
        setServices(data.data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  useEffect(() => {
    fetchServices()
    fetchServiceSettings()
  }, [currentBusiness?.id])

  // Filtered Services
  const filteredServices = services.filter(service => {
    if (!selectedServiceCategory) return true
    return service.category === selectedServiceCategory
  })

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

  // Get unique categories from products
  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.category)
      .filter((category, index, array) => category && array.indexOf(category) === index)
      .sort()

    // Add "No Category" option for products without categories
    const hasUncategorized = products.some(product => !product.category)
    if (hasUncategorized) {
      categories.push('No Category')
    }

    return categories
  }

  // Filter products by category
  const getProductsByCategory = (category: string) => {
    if (category === 'No Category') {
      return products.filter(product => !product.category)
    }
    return products.filter(product => product.category === category)
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
    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      itemId: '',
      itemType: 'Product', // Default
      name: '',
      quantity: 1,
      unitSalePrice: 0,
      unitCostPrice: 0,
      lineTotal: 0,
      lineProfit: 0,
      categoryFilter: ""
    }
    setSaleItems([...saleItems, newItem])
  }

  const updateSaleItem = (id: string, field: keyof SaleItem, value: string | number) => {
    setSaleItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // If updating itemId, find the item and update related fields
          if (field === 'itemId') {
            if (item.itemType === 'Product') {
              const selectedProduct = products.find(p => p._id?.toString() === value)
              if (selectedProduct) {
                updatedItem.name = selectedProduct.name
                updatedItem.unitCostPrice = selectedProduct.costPrice
                updatedItem.unitSalePrice = selectedProduct.salePrice
                updatedItem.product = selectedProduct
                // Recalculate line totals when product is selected
                updatedItem.lineTotal = updatedItem.quantity * updatedItem.unitSalePrice
                updatedItem.lineProfit = updatedItem.lineTotal - (updatedItem.quantity * updatedItem.unitCostPrice)
              }
            } else if (item.itemType === 'Service') {
              const selectedService = services.find(s => s._id?.toString() === value)
              if (selectedService) {
                updatedItem.name = selectedService.name
                updatedItem.unitCostPrice = 0
                updatedItem.unitSalePrice = selectedService.price
                updatedItem.service = selectedService
                updatedItem.lineTotal = updatedItem.quantity * updatedItem.unitSalePrice
                updatedItem.lineProfit = updatedItem.lineTotal // No cost for services usually
              }
            }
          }

          // Recalculate line totals when quantity or prices change
          if (field === 'quantity' || field === 'unitSalePrice' || field === 'unitCostPrice') {
            updatedItem.lineTotal = updatedItem.quantity * updatedItem.unitSalePrice
            updatedItem.lineProfit = updatedItem.lineTotal - (updatedItem.quantity * updatedItem.unitCostPrice)
          }

          return updatedItem
        }
        return item
      })
    )
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
        showModal({ title: 'Validation Error', message: 'Please add at least one item to the sale', type: 'error' })
        setLoading(false)
        return
      }

      // Validate all items have required fields
      for (const item of saleItems) {
        if (!item.itemId || item.quantity <= 0 || item.unitSalePrice <= 0) {
          showModal({ title: 'Validation Error', message: 'Please fill in all required fields for each item', type: 'error' })
          setLoading(false)
          return
        }
      }

      const totalSaleExpenses = saleExpenses.reduce((sum, expense) => sum + expense.amount, 0)

      const url = isEditing ? `/api/sales/${sale?._id}` : '/api/sales'
      const method = isEditing ? 'PUT' : 'POST'

      // Prepare items for API
      const items = saleItems.map(item => ({
        itemId: item.itemId,
        itemType: item.itemType,
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
          saleExpenseDetails: saleExpenses,
          businessId: currentBusiness.id
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
        showModal({ title: 'Error', message: data.error || `Failed to ${isEditing ? 'update' : 'record'} sale`, type: 'error' })
      }
    } catch (error) {
      showModal({ title: 'Error', message: `Failed to ${isEditing ? 'update' : 'record'} sale`, type: 'error' })
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

      {/* Products/Services Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Items</h3>
          <button
            type="button"
            onClick={addSaleItem}
            className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>

        {saleItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No items added yet</p>
            <button
              type="button"
              onClick={addSaleItem}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {saleItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeSaleItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={item.itemType}
                      onChange={(e) => {
                        const newType = e.target.value as 'Product' | 'Service';
                        setSaleItems(prev => prev.map(i => i.id === item.id ? { ...i, itemType: newType, itemId: '', name: '', unitSalePrice: 0, unitCostPrice: 0, quantity: 1, lineTotal: 0, lineProfit: 0, product: undefined, service: undefined } : i))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Product">Product</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>

                  {item.itemType === 'Product' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Filter
                      </label>
                      <select
                        value={item.categoryFilter}
                        onChange={(e) => updateSaleItem(item.id, 'categoryFilter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Categories</option>
                        {getUniqueCategories().map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={item.itemType === 'Service' ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {item.itemType} *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Service Category Filter */}
                      {item.itemType === 'Service' && (
                        <div className="col-span-2 sm:col-span-1">
                          <select
                            value={selectedServiceCategory}
                            onChange={(e) => setSelectedServiceCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All Categories</option>
                            {serviceCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className={item.itemType === 'Service' ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                        <select
                          value={item.itemId}
                          onChange={(e) => {
                            const val = e.target.value
                            updateSaleItem(item.id, 'itemId', val)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select a {item.itemType.toLowerCase()}</option>
                          {item.itemType === 'Product' ? (
                            products
                              .filter(p => !selectedCategory || p.category === selectedCategory)
                              .map(product => (
                                <option key={product._id?.toString()} value={product._id?.toString()}>
                                  {product.name} ({currencySymbol}{product.salePrice})
                                </option>
                              ))
                          ) : (
                            filteredServices.map(service => (
                              <option key={service._id?.toString()} value={service._id?.toString()}>
                                {service.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={item.itemType === 'Product' ? (item.product?.currentStock || 999) : 9999}
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

                  <div className="md:col-span-2">
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
    </form >
  )
} 