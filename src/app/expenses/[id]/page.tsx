import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getExpenseById } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import Link from "next/link"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ExpenseViewClient from "@/components/Expenses/ExpenseViewClient"

interface ExpenseViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ExpenseViewPage({ params }: ExpenseViewPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const expense = await getExpenseById(id)
  
  if (!expense) {
    redirect("/expenses")
  }

  // Serialize the expense data to avoid MongoDB ObjectId serialization issues
  const serializedExpense = serializeMongoObject(expense)

  return (
    <DashboardLayout>
      <ExpenseViewClient expense={serializedExpense} />
    </DashboardLayout>
  )
} 