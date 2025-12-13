import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"

// Helper to handle MongoDB errors
function handleMongoError(error: any) {
  if (
    error?.name === "MongoServerSelectionError" ||
    (typeof error?.message === "string" && error.message.includes("Server selection timed out"))
  ) {
    console.error("MongoDB connection error:", error)
    return NextResponse.json({
      success: false,
      error: "Cannot connect to database. Please try again later."
    }, { status: 503 })
  }
  return null
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    const { type, category, businessId } = body
    const targetBusinessId = businessId || 'default'

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    if (!['expense', 'product', 'service'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense', 'product', or 'service'" }, { status: 400 })
    }

    let user
    try {
      user = await getUserByEmail(session.user.email)
    } catch (err: any) {
      const response = handleMongoError(err)
      if (response) return response
      throw err
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find the business profile
    const profiles = user.businessProfiles || []
    const profileIndex = profiles.findIndex((p: any) => p.id === targetBusinessId)

    if (profileIndex === -1 && targetBusinessId !== 'default') {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    // Make sure we have a profile to work with
    let targetProfile = profileIndex !== -1 ? profiles[profileIndex] : null

    // If default profile is missing, create it from legacy settings (safety net)
    if (!targetProfile && targetBusinessId === 'default') {
      targetProfile = {
        id: 'default',
        name: user.companyName || 'Main Business',
        settings: user.settings || {}
      }
      profiles.push(targetProfile)
    } else if (!targetProfile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    const currentSettings: any = targetProfile.settings || {}
    const fieldName = type === 'expense' ? 'customExpenseCategories' :
      type === 'service' ? 'customServiceCategories' :
        'customProductCategories'

    const currentCategories = currentSettings[fieldName] || []

    if (currentCategories.includes(category)) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const updatedCategories = [...currentCategories, category]

    // Update the profile in the array
    if (profileIndex !== -1) {
      profiles[profileIndex].settings = { ...currentSettings, [fieldName]: updatedCategories }
    } else {
      // We pushed it to the end
      profiles[profiles.length - 1].settings = { ...currentSettings, [fieldName]: updatedCategories }
    }

    // Update user
    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({ success: true, message: "Category added successfully", category })
    } else {
      return NextResponse.json({ error: "Failed to add category" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error adding category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, oldCategory, newCategory, businessId } = body
    const targetBusinessId = businessId || 'default'

    if (!type || !oldCategory || !newCategory) {
      return NextResponse.json({ error: "Type, oldCategory, and newCategory are required" }, { status: 400 })
    }

    let user = await getUserByEmail(session.user.email)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const profiles = user.businessProfiles || []
    const profileIndex = profiles.findIndex((p: any) => p.id === targetBusinessId)

    let targetProfile = profileIndex !== -1 ? profiles[profileIndex] : null
    if (!targetProfile && targetBusinessId === 'default') {
      targetProfile = { id: 'default', name: user.companyName, settings: user.settings || {} }
      profiles.push(targetProfile)
    } else if (!targetProfile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    const currentSettings: any = targetProfile.settings || {}
    const fieldName = type === 'expense' ? 'customExpenseCategories' :
      type === 'service' ? 'customServiceCategories' :
        'customProductCategories'

    const currentCategories = currentSettings[fieldName] || []

    if (!currentCategories.includes(oldCategory)) {
      return NextResponse.json({ error: "Old category not found" }, { status: 404 })
    }

    if (currentCategories.includes(newCategory)) {
      return NextResponse.json({ error: "New category already exists" }, { status: 400 })
    }

    const updatedCategories = currentCategories.map((cat: string) => cat === oldCategory ? newCategory : cat)

    // Update profile
    targetProfile.settings = { ...currentSettings, [fieldName]: updatedCategories }
    if (profileIndex !== -1) profiles[profileIndex] = targetProfile
    else profiles[profiles.length - 1] = targetProfile

    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({ success: true, message: "Category updated successfully", oldCategory, newCategory })
    } else {
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const category = url.searchParams.get('category')
    const businessId = url.searchParams.get('businessId')
    const targetBusinessId = businessId || 'default'

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    let user = await getUserByEmail(session.user.email)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const profiles = user.businessProfiles || []
    const profileIndex = profiles.findIndex((p: any) => p.id === targetBusinessId)

    let targetProfile = profileIndex !== -1 ? profiles[profileIndex] : null
    if (!targetProfile && targetBusinessId === 'default') {
      targetProfile = { id: 'default', name: user.companyName, settings: user.settings || {} }
      profiles.push(targetProfile)
    } else if (!targetProfile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    const currentSettings: any = targetProfile.settings || {}
    const fieldName = type === 'expense' ? 'customExpenseCategories' :
      type === 'service' ? 'customServiceCategories' :
        'customProductCategories'

    const currentCategories = currentSettings[fieldName] || []
    const updatedCategories = currentCategories.filter((cat: string) => cat !== category)

    targetProfile.settings = { ...currentSettings, [fieldName]: updatedCategories }
    if (profileIndex !== -1) profiles[profileIndex] = targetProfile
    else profiles[profiles.length - 1] = targetProfile


    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({ success: true, message: "Category removed successfully" })
    } else {
      return NextResponse.json({ error: "Failed to remove category" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error removing category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}