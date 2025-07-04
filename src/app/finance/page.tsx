import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserByEmail } from '@/lib/database'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import FinanceOverview from '@/components/Finance/FinanceOverview'

export default async function FinancePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.email) {
    redirect('/auth/signin')
  }

  const user = await getUserByEmail(session.user.email)
  
  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Overview</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive financial insights and performance metrics
          </p>
        </div>
        
        <FinanceOverview userId={user._id!.toString()} />
      </div>
    </DashboardLayout>
  )
} 