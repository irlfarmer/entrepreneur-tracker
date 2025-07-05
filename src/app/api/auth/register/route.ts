import { NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser } from "@/lib/database"
import { hashPassword } from "@/lib/auth"
import { ApiResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, companyName, businessType } = body

    // Validation
    if (!email || !password || !companyName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Email, password, and company name are required"
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Password must be at least 6 characters"
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "User already exists with this email"
      }, { status: 409 })
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const userId = await createUser({
      email,
      password: hashedPassword,
      companyName,
      businessType: businessType || "General",
      settings: {
        currency: "USD",
        timezone: "UTC",
        enabledFields: ["category", "type", "size", "color"],
        lowStockThreshold: 3,
        customExpenseCategories: [],
        customProductCategories: [],
        customProductFields: [],
        saleRelatedExpenseCategories: ["Shipping", "Processing", "Payment Fees", "Packaging"]
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "User created successfully",
      data: { userId: userId.toString() }
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 