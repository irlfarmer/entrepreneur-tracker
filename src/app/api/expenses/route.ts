import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createExpense, getExpenses } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

// Helper function to validate MongoDB ObjectID
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(request: NextRequest, context?: { searchParams?: Promise<URLSearchParams> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Await any potentially async searchParams APIs in the future (Next.js 15)
    let searchParams: URLSearchParams
    if (context && context.searchParams) {
      searchParams = await context.searchParams
    } else {
      searchParams = new URL(request.url).searchParams
    }

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    const businessId = searchParams.get('businessId') || 'default'

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

    let expenses
    try {
      if (!isValidObjectId(session.user.id)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      expenses = await getExpenses(session.user.id, businessId, filters)
    } catch (err: any) {
      // Handle MongoDB connection error
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
          error: "Invalid user ID"
        }, { status: 400 })
      }
      throw err
    }

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

    let body
    try {
      body = await request.json()
    } catch (err) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid JSON payload"
      }, { status: 400 })
    }

    const { category, description, amount, expenseDate, receiptUrl, businessId } = body

    // Validation
    if (!category || !description || amount === undefined || amount === null) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Category, description, and amount are required"
      }, { status: 400 })
    }

    if (typeof amount !== "number" && typeof amount !== "string") {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Amount must be a number"
      }, { status: 400 })
    }

    // To satisfy TS, ensure parseFloat receives string, else use .toString()
    const parsedAmount = parseFloat(amount.toString())
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Amount must be a positive number"
      }, { status: 400 })
    }

    // Validate session.user.id (ObjectId)
    if (!isValidObjectId(session.user.id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid user ID"
      }, { status: 400 })
    }

    let expenseId
    try {
      expenseId = await createExpense({
        userId: new ObjectId(session.user.id),
        businessId: businessId || 'default',
        category,
        description,
        amount: parsedAmount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        receiptUrl: receiptUrl || undefined
      })
    } catch (err: any) {
      // Handle MongoDB connection error
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
      // Handle BSONError (invalid ObjectId)
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      throw err
    }

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