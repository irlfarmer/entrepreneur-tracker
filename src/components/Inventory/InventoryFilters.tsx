"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline"

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

export default function InventoryFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true')
  const [categories, setCategories] = useState<string[]>(["All Categories", ...defaultCategories])

  // Fetch user's custom categories
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserCategories()
    }
  }, [session?.user?.id])

  const fetchUserCategories = async () => {
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      
      if (data.success && data.data?.settings?.customProductCategories) {
        const customCategories = data.data.settings.customProductCategories
        const allCategories = ["All Categories", ...defaultCategories, ...customCategories]
        // Remove duplicates
        const uniqueCategories = Array.from(new Set(allCategories))
        setCategories(uniqueCategories)
      }
    } catch (error) {
      console.error('Error fetching user categories:', error)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const updateFilters = (newSearch?: string, newCategory?: string, newLowStock?: boolean) => {
    const params = new URLSearchParams()
    
    const searchValue = newSearch !== undefined ? newSearch : search
    const categoryValue = newCategory !== undefined ? newCategory : category
    const lowStockValue = newLowStock !== undefined ? newLowStock : lowStock
    
    if (searchValue) params.set('search', searchValue)
    if (categoryValue && categoryValue !== 'all') params.set('category', categoryValue)
    if (lowStockValue) params.set('lowStock', 'true')

    router.push(`/inventory?${params.toString()}`)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      updateFilters(value)
    }, 500)
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    updateFilters(undefined, value)
  }

  const handleLowStockChange = (checked: boolean) => {
    setLowStock(checked)
    updateFilters(undefined, undefined, checked)
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setLowStock(false)
    router.push('/inventory')
  }

  const hasActiveFilters = search || category !== 'all' || lowStock

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="border border-gray-400 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option 
                  key={cat} 
                  value={cat === "All Categories" ? "all" : cat}
                >
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Filter */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lowStock"
              checked={lowStock}
              onChange={(e) => handleLowStockChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-400 rounded"
            />
            <label htmlFor="lowStock" className="text-sm font-medium text-gray-800">
              Low Stock Only
            </label>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Search: "{search}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {category !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Category: {category}
              <button
                onClick={() => handleCategoryChange('all')}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {lowStock && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
              Low Stock
              <button
                onClick={() => handleLowStockChange(false)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
} 