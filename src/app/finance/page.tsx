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

  let user: any
  try {
    // Add timeout to prevent hanging on MongoDB connection
    user = await Promise.race([
      getUserByEmail(session.user.email),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
    ])
  } catch (error) {
    console.error('Database connection error:', error)
    // Fallback: create a temporary user object from session
    user = {
      _id: session.user.id || 'temp-id',
      email: session.user.email,
      companyName: session.user.companyName || 'My Company'
    }
  }
  
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