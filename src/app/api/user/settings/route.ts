import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"
import { ApiResponse } from "@/lib/types"

// Helper to catch MongoDB connection and BSON/ObjectId errors
function handleMongoError(error: any) {
  // MongoDB connection error
  if (
    error?.name === "MongoServerSelectionError" ||
    (typeof error?.message === "string" && error.message.toLowerCase().includes("server selection timed out"))
  ) {
    console.error("MongoDB connection error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Cannot connect to database. Please try again later."
    }, { status: 503 })
  }
  // Invalid ObjectId (BSON error)
  if (
    error?.name === "BSONError" ||
    (typeof error?.message === "string" &&
      error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
  ) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Invalid user ID"
    }, { status: 400 })
  }
  // Not handled: fall through to generic 500
  return null
}

// GET user settings
export async function GET(request: NextRequest) {
  try {
    // Even if you don't use searchParams/cookies/etc, Next.js may require an arg for future compatibility
    // so we receive request: NextRequest, but do not use any dynamic API here.
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    let user
    try {
      user = await getUserByEmail(session.user.email)
    } catch (err: any) {
      const resp = handleMongoError(err)
      if (resp) return resp
      throw err
    }
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "User not found"
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user
    })

  } catch (error: any) {
    const resp = handleMongoError(error)
    if (resp) return resp
    console.error("Settings fetch error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

// PUT update user settings
export async function PUT(requestPromise: Promise<NextRequest>) {
  // requestPromise is a Promise<NextRequest> and must be awaited
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid JSON payload"
      }, { status: 400 })
    }
    const { companyName, businessType, currency, timezone, enabledFields, lowStockThreshold, profileImage } = body

    // Validation
    if (!companyName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Company name is required"
      }, { status: 400 })
    }

    // Validate profileImage if provided (should be base64)
    if (profileImage && !profileImage.startsWith('data:image/')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid image format. Please upload a valid image."
      }, { status: 400 })
    }

    let user
    try {
      user = await getUserByEmail(session.user.email)
    } catch (err: any) {
      const resp = handleMongoError(err)
      if (resp) return resp
      throw err
    }
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "User not found"
      }, { status: 404 })
    }

    // Update user data - preserve existing settings and only update specified fields
    const updatedUser = {
      ...user,
      companyName,
      businessType: businessType || user.businessType,
      profileImage: profileImage !== undefined ? profileImage : user.profileImage,
      settings: {
        ...user.settings,
        currency: currency || user.settings?.currency || "USD",
        timezone: timezone || user.settings?.timezone || "UTC",
        enabledFields: enabledFields || user.settings?.enabledFields || ["category", "type", "size", "color"],
        lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : (user.settings?.lowStockThreshold ?? 3)
      },
      updatedAt: new Date()
    }

    try {
      await updateUser(user._id!.toString(), updatedUser)
    } catch (err: any) {
      const resp = handleMongoError(err)
      if (resp) return resp
      throw err
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Settings updated successfully",
      data: updatedUser
    })

  } catch (error: any) {
    const resp = handleMongoError(error)
    if (resp) return resp
    console.error("Settings update error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 