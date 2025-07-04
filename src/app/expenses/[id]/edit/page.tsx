import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getExpenseById } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ExpenseForm from "@/components/Expenses/ExpenseForm"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

interface ExpenseEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ExpenseEditPage({ params }: ExpenseEditPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const expense = await getExpenseById(id)
  
  if (!expense) {
    redirect("/expenses")
  }

  // Serialize the expense object to avoid MongoDB ObjectId issues
  const serializedExpense = serializeMongoObject(expense)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/expenses/${serializedExpense._id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Back to Expense View"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Expense</h1>
              <p className="text-gray-600">{serializedExpense.description}</p>
            </div>
          </div>
        </div>

        {/* Expense Form */}
        <div className="bg-white rounded-lg shadow">
          <ExpenseForm userId={session.user.id} expense={serializedExpense} isEditing={true} />
        </div>
      </div>
    </DashboardLayout>
  )
} 