import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import SettingsForm from "@/components/Settings/SettingsForm"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account preferences and business settings.
          </p>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow">
          <SettingsForm userId={session.user.id} />
        </div>
      </div>
    </DashboardLayout>
  )
} 