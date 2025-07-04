import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ExpenseForm from "@/components/Expenses/ExpenseForm"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

export default async function AddExpensePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button and header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/expenses"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Expenses
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Expense</h1>
          <p className="mt-2 text-gray-600">
            Record a new business expense and categorize it for tracking.
          </p>
        </div>

        {/* Expense Form */}
        <div className="bg-white rounded-lg shadow">
          <ExpenseForm userId={session.user.id} />
        </div>
      </div>
    </DashboardLayout>
  )
} 