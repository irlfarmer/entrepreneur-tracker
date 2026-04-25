"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency, calculateProfitMargin } from "@/lib/utils"
import { Product } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useRouter } from "next/navigation"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from "@heroicons/react/24/outline"
import { useModal } from "@/context/ModalContext"

interface ProductListProps {
  userId: string
  searchParams: {
    search?: string
    category?: string
    lowStock?: string
  }
}

export default function ProductList({ userId, searchParams }: ProductListProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const { currentBusiness } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showModal } = useModal()
  const router = useRouter()

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const allIds = products.map((p) => p._id!.toString())
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0 && !allSelected

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setSelectedIds(new Set()) // clear selection on reload
        const params = new URLSearchParams()
        if (searchParams.search) params.set("search", searchParams.search)
        if (searchParams.category) params.set("category", searchParams.category)
        if (searchParams.lowStock) params.set("lowStock", searchParams.lowStock)
        params.set("businessId", currentBusiness.id)

        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setProducts(data.data)
        } else {
          setError(data.error || "Failed to fetch products")
        }
      } catch (err) {
        setError("Failed to fetch products")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchParams, currentBusiness.id])

  // ── Selection helpers ────────────────────────────────────────────────────────

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Single delete ────────────────────────────────────────────────────────────

  const handleDelete = (productId: string) => {
    showModal({
      title: "Delete Product",
      message: "Are you sure you want to delete this product?",
      type: "confirm",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
          })
          const data = await response.json()

          if (data.success) {
            setProducts((prev) => prev.filter((p) => p._id?.toString() !== productId))
            setSelectedIds((prev) => {
              const next = new Set(prev)
              next.delete(productId)
              return next
            })
            showModal({ title: "Success", message: "Product deleted successfully", type: "success" })
          } else {
            showModal({ title: "Error", message: data.error || "Failed to delete product", type: "error" })
          }
        } catch (err) {
          showModal({ title: "Error", message: "Failed to delete product", type: "error" })
        }
      },
    })
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────────

  const handleBulkDelete = () => {
    const count = selectedIds.size
    showModal({
      title: "Delete Selected Products",
      message: `Are you sure you want to delete ${count} selected product${count !== 1 ? "s" : ""}? This action cannot be undone.`,
      type: "confirm",
      confirmText: `Delete ${count} product${count !== 1 ? "s" : ""}`,
      cancelText: "Cancel",
      onConfirm: async () => {
        setIsBulkDeleting(true)
        try {
          const response = await fetch("/api/products/bulk-delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: Array.from(selectedIds) }),
          })
          const data = await response.json()

          if (data.success) {
            setProducts((prev) => prev.filter((p) => !selectedIds.has(p._id!.toString())))
            setSelectedIds(new Set())
            showModal({
              title: "Success",
              message: `Successfully deleted ${data.deletedCount} product${data.deletedCount !== 1 ? "s" : ""}.`,
              type: "success",
            })
          } else {
            showModal({ title: "Error", message: data.error || "Failed to delete products", type: "error" })
          }
        } catch (err) {
          showModal({ title: "Error", message: "Failed to delete products", type: "error" })
        } finally {
          setIsBulkDeleting(false)
        }
      },
    })
  }

  // ── Duplicate ────────────────────────────────────────────────────────────────

  const handleDuplicate = (product: Product) => {
    const productData = {
      name: `${product.name} (Copy)`,
      category: product.category,
      type: product.type || "",
      size: product.size || "",
      color: product.color || "",
      sku: product.sku ? `${product.sku}-COPY` : "",
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      currentStock: 0,
      customFields: product.customFields || {},
    }

    const params = new URLSearchParams()
    params.set("duplicate", "true")
    params.set("data", JSON.stringify(productData))

    router.push(`/inventory/add?${params.toString()}`)
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading || currencyLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-16 w-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-lg shadow">
      {/* ── Bulk-action floating toolbar ──────────────────────────────────────── */}
      <div
        style={{
          transform: selectedIds.size > 0 ? "translateY(0)" : "translateY(120%)",
          opacity: selectedIds.size > 0 ? 1 : 0,
          transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
          pointerEvents: selectedIds.size > 0 ? "auto" : "none",
        }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 bg-gray-900 text-white rounded-2xl shadow-2xl"
      >
        <span className="text-sm font-medium">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full text-xs font-bold mr-2">
            {selectedIds.size}
          </span>
          item{selectedIds.size !== 1 ? "s" : ""} selected
        </span>
        <div className="w-px h-5 bg-white/20" />
        <button
          onClick={() => setSelectedIds(new Set())}
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
          {isBulkDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
        </button>
      </div>

      {/* ── List header ───────────────────────────────────────────────────────── */}
      <div className="p-6 border-b flex items-center gap-4">
        {/* Select-all checkbox */}
        <button
          onClick={toggleSelectAll}
          title={allSelected ? "Deselect all" : "Select all"}
          className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            allSelected
              ? "bg-blue-600 border-blue-600"
              : someSelected
              ? "bg-blue-100 border-blue-400"
              : "border-gray-300 hover:border-blue-400"
          }`}
        >
          {allSelected && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
          {someSelected && !allSelected && <span className="block w-2 h-0.5 bg-blue-600 rounded" />}
        </button>

        <h3 className="text-lg font-semibold text-gray-900">
          Products ({products.length})
        </h3>

        {selectedIds.size > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {selectedIds.size} of {products.length} selected
          </span>
        )}
      </div>

      {/* ── Product list ──────────────────────────────────────────────────────── */}
      {products.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(searchParams).length > 0
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first product to inventory."}
          </p>
          <Link
            href="/inventory/add"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Product
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {products.map((product) => {
            const id = product._id!.toString()
            const isSelected = selectedIds.has(id)
            const profitMargin = calculateProfitMargin(product.salePrice, product.costPrice)
            const isLowStock = product.currentStock <= 5

            return (
              <div
                key={id}
                className={`p-6 transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(id)}
                    title={isSelected ? "Deselect" : "Select"}
                    className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>

                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Product placeholder image */}
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-gray-400">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {product.name}
                        </h4>
                        {isLowStock && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" title="Low Stock" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      {product.sku && (
                        <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                      )}

                      {/* Tags */}
                      <div className="flex items-center space-x-3 mt-1">
                        {product.type && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {product.type}
                          </span>
                        )}
                        {product.size && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Size: {product.size}
                          </span>
                        )}
                        {product.color && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {product.color}
                          </span>
                        )}
                      </div>

                      {/* Custom fields preview */}
                      {product.customFields && Object.keys(product.customFields).length > 0 && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">Custom:</span>
                          <div className="flex items-center space-x-2">
                            {Object.entries(product.customFields).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {key}: {String(value)}
                              </span>
                            ))}
                            {Object.keys(product.customFields).length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{Object.keys(product.customFields).length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-600">
                          Stock:{" "}
                          <span className={isLowStock ? "text-red-600 font-medium" : "text-gray-900"}>
                            {product.currentStock}
                          </span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Profit:{" "}
                          <span className={profitMargin > 0 ? "text-green-600" : "text-red-600"}>
                            {profitMargin.toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Value:{" "}
                          <span className="text-gray-900">
                            {formatCurrency(product.currentStock * product.salePrice, currencyCode)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and actions */}
                  <div className="flex items-center space-x-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(product.salePrice, currencyCode)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Cost: {formatCurrency(product.costPrice, currencyCode)}
                      </p>
                    </div>

                    {/* Row actions */}
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/inventory/${id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/inventory/${id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Product"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDuplicate(product)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Duplicate Product"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Product"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}