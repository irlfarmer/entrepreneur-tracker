import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ProductList from "@/components/Inventory/ProductList"
import InventoryFilters from "@/components/Inventory/InventoryFilters"
import InventoryStats from "@/components/Inventory/InventoryStats"
import Link from "next/link"
import { PlusIcon, Cog6ToothIcon } from "@heroicons/react/24/outline"

interface InventoryPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    lowStock?: string
  }>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const resolvedSearchParams = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="mt-2 text-gray-600">
              Manage your products and track stock levels
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Link
              href="/inventory/settings"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Settings
            </Link>
            <Link
              href="/inventory/add"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Product
            </Link>
          </div>
        </div>

        {/* Inventory Stats */}
        <Suspense fallback={<StatsSkeleton />}>
          <InventoryStats 
            userId={session.user.id} 
            searchParams={resolvedSearchParams}
          />
        </Suspense>

        {/* Filters */}
        <InventoryFilters />

        {/* Product List */}
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList 
            userId={session.user.id} 
            searchParams={resolvedSearchParams}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}

// Loading skeletons
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

function ProductListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
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