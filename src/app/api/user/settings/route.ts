import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"
import { ApiResponse } from "@/lib/types"

// GET user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const user = await getUserByEmail(session.user.email)
    
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

  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

// PUT update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
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

    const user = await getUserByEmail(session.user.email)
    
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
        ...user.settings, // Preserve existing settings
        currency: currency || user.settings?.currency || "USD",
        timezone: timezone || user.settings?.timezone || "UTC",
        enabledFields: enabledFields || user.settings?.enabledFields || ["category", "type", "size", "color"],
        lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : (user.settings?.lowStockThreshold ?? 3)
      },
      updatedAt: new Date()
    }

    await updateUser(user._id!.toString(), updatedUser)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Settings updated successfully",
      data: updatedUser
    })

  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 