import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getExpenseById, updateExpense, deleteExpense } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await params
    const expense = await getExpenseById(id)

    if (!expense) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Expense not found"
      }, { status: 404 })
    }

    // Check if expense belongs to the user
    if (expense.userId.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: expense
    })

  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { category, description, amount, expenseDate, notes } = body

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

    // Check if expense exists and belongs to user
    const existingExpense = await getExpenseById(id)
    if (!existingExpense) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Expense not found"
      }, { status: 404 })
    }

    if (existingExpense.userId.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    const updateData = {
      category,
      description,
      amount: parseFloat(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : existingExpense.expenseDate,
      notes
    }

    const success = await updateExpense(id, updateData)

    if (success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Expense updated successfully"
      })
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to update expense"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await params

    // Check if expense exists and belongs to user
    const existingExpense = await getExpenseById(id)
    if (!existingExpense) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Expense not found"
      }, { status: 404 })
    }

    if (existingExpense.userId.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    const success = await deleteExpense(id)

    if (success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Expense deleted successfully"
      })
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to delete expense"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 