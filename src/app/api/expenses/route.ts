import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createExpense, getExpenses } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    // Build filter object
    const filters: any = {}
    
    if (startDate || endDate) {
      filters.expenseDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0) // Start of the day
        filters.expenseDate.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // End of the day
        filters.expenseDate.$lte = end
      }
    }
    
    if (category && category !== 'all') {
      filters.category = category
    }

    const expenses = await getExpenses(session.user.id, filters)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: expenses
    })

  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
    const { category, description, amount, expenseDate, receiptUrl } = body

    // Validation
    if (!category || !description || !amount) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Category, description, and amount are required"
      }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Amount must be a positive number"
      }, { status: 400 })
    }

    const expenseId = await createExpense({
      userId: new ObjectId(session.user.id),
      category,
      description,
      amount: parseFloat(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      receiptUrl: receiptUrl || undefined
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Expense recorded successfully",
      data: { expenseId: expenseId.toString() }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 