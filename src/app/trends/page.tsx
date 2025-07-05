import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import TrendsClient from "@/components/Trends/TrendsClient"

export default async function TrendsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Trends</h1>
            <p className="text-gray-600">Analyze your business performance over time</p>
          </div>
        </div>

        {/* Trends Charts */}
        <TrendsClient />
      </div>
    </DashboardLayout>
  )
} 