import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import SalesList from "@/components/Sales/SalesList"
import SalesFilters from "@/components/Sales/SalesFilters"
import SalesStats from "@/components/Sales/SalesStats"
import Link from "next/link"
import { PlusIcon } from "@heroicons/react/24/outline"

interface SalesPageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    productId?: string
  }>
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
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
            <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
            <p className="mt-2 text-gray-600">
              Track your sales and monitor profit margins
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/sales/add"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Record Sale
            </Link>
          </div>
        </div>

        {/* Sales Stats */}
        <Suspense fallback={<StatsSkeleton />}>
          <SalesStats userId={session.user.id} />
        </Suspense>

        {/* Filters */}
        <SalesFilters />

        {/* Sales List */}
        <Suspense fallback={<SalesListSkeleton />}>
          <SalesList 
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

function SalesListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse">
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