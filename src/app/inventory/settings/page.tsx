import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import CategoryFieldManager from "@/components/Inventory/CategoryFieldManager"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

export default async function BusinessSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center space-x-4">
          <Link 
            href="/inventory"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Back to Inventory"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your custom categories and fields for inventory and expenses
            </p>
          </div>
        </div>

        {/* Category & Field Manager */}
        <Suspense fallback={<SettingsManagerSkeleton />}>
          <CategoryFieldManager />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}

function SettingsManagerSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
      </div>
      
      <div className="border-b">
        <div className="flex space-x-8 px-6">
          <div className="py-4">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="py-4">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          <div className="py-4">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 