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

    // Check for businessId in query
    const url = new URL(request.url)
    const targetBusinessId = url.searchParams.get('businessId') || 'default'

    let settings = user.settings // Fallback
    let companyName = user.companyName

    if (user.businessProfiles) {
      const profile = user.businessProfiles.find(b => b.id === targetBusinessId)
      if (profile) {
        if (profile.settings) {
          settings = profile.settings
        }
        if (profile.name) {
          companyName = profile.name
        }
      }
    }

    // Construct response data based on context
    const responseData = {
      ...user,
      companyName,
      settings
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: responseData
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
    const {
      companyName,
      businessType,
      currency,
      timezone,
      enabledFields,
      lowStockThreshold,
      profileImage,
      businessId
    } = body

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

    // Logic: Unified update. Find target profile (defaulting to 'default'). Update it.
    // If target is 'default', also update root companyName/image for legacy compatibility.

    const targetBusinessId = businessId || 'default'
    let updatedUser = { ...user }
    const profiles = user.businessProfiles || []
    const profileIndex = profiles.findIndex(p => p.id === targetBusinessId)

    if (profileIndex >= 0) {
      const currentProfile = profiles[profileIndex]
      const updatedProfile = {
        ...currentProfile,
        name: companyName || currentProfile.name,
        settings: {
          ...currentProfile.settings,
          currency: currency || currentProfile.settings?.currency || "USD",
          timezone: timezone || currentProfile.settings?.timezone || "UTC",
          enabledFields: enabledFields || currentProfile.settings?.enabledFields || ["category", "type", "size", "color"],
          lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : (currentProfile.settings?.lowStockThreshold ?? 3),
          // Preserve arrays if not provided
          customExpenseCategories: currentProfile.settings?.customExpenseCategories || [],
          customProductCategories: currentProfile.settings?.customProductCategories || [],
          customServiceCategories: currentProfile.settings?.customServiceCategories || [],
          customProductFields: currentProfile.settings?.customProductFields || [],
          customServiceFields: currentProfile.settings?.customServiceFields || [],
          saleRelatedExpenseCategories: currentProfile.settings?.saleRelatedExpenseCategories || []
        }
      }

      profiles[profileIndex] = updatedProfile
      updatedUser.businessProfiles = profiles
    } else {
      // Should not happen if migration ran, but purely defensive:
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Business profile not found. Please refresh the page to sync your account."
      }, { status: 404 })
    }

    // Legacy sync for 'default' profile
    if (targetBusinessId === 'default') {
      updatedUser = {
        ...updatedUser,
        companyName,
        profileImage: profileImage !== undefined ? profileImage : user.profileImage,
        updatedAt: new Date()
      }
    } else {
      updatedUser.updatedAt = new Date()
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