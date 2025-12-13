import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import MetricsCards from "@/components/Dashboard/MetricsCards"
import SalesChart from "@/components/Dashboard/SalesChart"
import RecentActivity from "@/components/Dashboard/RecentActivity"
import QuickActions from "@/components/Dashboard/QuickActions"
import BusinessOverview from "@/components/Dashboard/BusinessOverview"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* All Businesses Overview */}
        <BusinessOverview />

        {/* Metrics Cards */}
        <Suspense fallback={<MetricsCardsSkeleton />}>
          <MetricsCards userId={session.user.id} />
        </Suspense>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Suspense fallback={<ChartSkeleton />}>
            <SalesChart userId={session.user.id} />
          </Suspense>

          {/* Recent Activity */}
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Loading skeletons
function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 