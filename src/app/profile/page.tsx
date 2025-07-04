import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ProfileView from "@/components/Profile/ProfileView"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="mt-2 text-gray-600">
            View and manage your profile information.
          </p>
        </div>

        {/* Profile View */}
        <ProfileView userId={session.user.id} />
      </div>
    </DashboardLayout>
  )
} 