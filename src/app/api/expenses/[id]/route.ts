import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getExpenseById, updateExpense, deleteExpense } from "@/lib/database"
import { ApiResponse } from "@/lib/types"

// Helper function to validate MongoDB ObjectID
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(
  request: NextRequest,
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await routeParams.params

    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid expense ID"
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    let expense;
    try {
      expense = await getExpenseById(id)
    } catch (err: any) {
      // Handle database connectivity errors
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      // Handle BSONError or invalid ObjectId
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid expense ID"
        }, { status: 400 })
      }
      throw err
    }

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
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await routeParams.params

    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid expense ID"
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
    const { category, description, amount, expenseDate, notes } = body

    // Validation
    if (!category || !description || amount === undefined || amount === null) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Category, description, and amount are required"
      }, { status: 400 })
    }

    if (typeof amount !== "number" && isNaN(parseFloat(amount))) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Amount must be a number"
      }, { status: 400 })
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Amount must be a positive number"
      }, { status: 400 })
    }

    let existingExpense;
    try {
      existingExpense = await getExpenseById(id)
    } catch (err: any) {
      // Handle database connectivity errors
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      // Handle BSONError or invalid ObjectId
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid expense ID"
        }, { status: 400 })
      }
      throw err
    }

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

    let success;
    try {
      success = await updateExpense(id, updateData)
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

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
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await routeParams.params

    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid expense ID"
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    let existingExpense;
    try {
      existingExpense = await getExpenseById(id)
    } catch (err: any) {
      // Handle database connectivity errors
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      // Handle BSONError or invalid ObjectId
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid expense ID"
        }, { status: 400 })
      }
      throw err
    }

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

    let success;
    try {
      success = await deleteExpense(id)
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

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