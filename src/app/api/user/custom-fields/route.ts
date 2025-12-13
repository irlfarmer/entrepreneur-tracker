import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"

// Helper function to check if error is BSON (ObjectId) or MongoDB connection error
function handleMongoError(error: any) {
  // MongoServerSelectionError - cannot connect to database
  if (
    error?.name === "MongoServerSelectionError" ||
    (typeof error?.message === "string" && error.message.toLowerCase().includes("server selection timed out"))
  ) {
    console.error("MongoDB connection error:", error)
    return NextResponse.json({
      success: false,
      error: "Cannot connect to database. Please try again later."
    }, { status: 503 })
  }
  // BSONError - invalid ObjectId string or related
  if (
    error?.name === "BSONError" ||
    (typeof error?.message === "string" &&
      error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
  ) {
    return NextResponse.json({
      success: false,
      error: "Invalid user ID"
    }, { status: 400 })
  }
  // Otherwise, don't handle
  return null
}

// Helper function to get entity field name
function getEntityFieldName(entityType?: string) {
  return entityType === 'service' ? 'customServiceFields' : 'customProductFields'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let parsed
    try {
      parsed = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const { field, entityType, businessId } = parsed
    const targetBusinessId = businessId || 'default'

    if (!field || !field.name || !field.type) {
      return NextResponse.json({ error: "Field name and type are required" }, { status: 400 })
    }

    if (!['text', 'number', 'select'].includes(field.type)) {
      return NextResponse.json({ error: "Invalid field type. Must be 'text', 'number', or 'select'" }, { status: 400 })
    }

    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      return NextResponse.json({ error: "Select fields must have at least one option" }, { status: 400 })
    }

    // Get current user settings directly from database
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

    // Add new custom field
    const settingField = getEntityFieldName(entityType)
    const currentFields = currentSettings[settingField] || []

    // Check if field already exists
    if (currentFields.some((f: any) => f.name === field.name)) {
      return NextResponse.json({ error: "Field with this name already exists" }, { status: 400 })
    }

    const updatedFields = [...currentFields, field]

    targetProfile.settings = { ...currentSettings, [settingField]: updatedFields }
    if (profileIndex !== -1) profiles[profileIndex] = targetProfile
    else profiles[profiles.length - 1] = targetProfile

    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({
        success: true,
        message: "Custom field added successfully",
        field
      })
    } else {
      return NextResponse.json({ error: "Failed to add custom field" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
    console.error("Error adding custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let parsed
    try {
      parsed = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const { oldFieldName, field, entityType, businessId } = parsed
    const targetBusinessId = businessId || 'default'

    if (!oldFieldName || !field || !field.name || !field.type) {
      return NextResponse.json({ error: "oldFieldName, field name and type are required" }, { status: 400 })
    }

    if (!['text', 'number', 'select'].includes(field.type)) {
      return NextResponse.json({ error: "Invalid field type. Must be 'text', 'number', or 'select'" }, { status: 400 })
    }

    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      return NextResponse.json({ error: "Select fields must have at least one option" }, { status: 400 })
    }

    // Get current user settings directly from database
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

    // Update custom field
    const settingField = getEntityFieldName(entityType)
    const currentFields = currentSettings[settingField] || []

    // Check if old field exists
    const oldFieldIndex = currentFields.findIndex((f: any) => f.name === oldFieldName)
    if (oldFieldIndex === -1) {
      return NextResponse.json({ error: "Old field not found" }, { status: 404 })
    }

    // Check if new field name already exists (and it's not the same field)
    if (field.name !== oldFieldName && currentFields.some((f: any) => f.name === field.name)) {
      return NextResponse.json({ error: "Field with this name already exists" }, { status: 400 })
    }

    const updatedFields = [...currentFields]
    updatedFields[oldFieldIndex] = field

    targetProfile.settings = { ...currentSettings, [settingField]: updatedFields }
    if (profileIndex !== -1) profiles[profileIndex] = targetProfile
    else profiles[profiles.length - 1] = targetProfile

    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({
        success: true,
        message: "Custom field updated successfully",
        oldFieldName,
        field
      })
    } else {
      return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
    console.error("Error updating custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let searchParams: URLSearchParams
    try {
      const url = new URL(request.url)
      searchParams = url.searchParams
    } catch {
      return NextResponse.json({ error: "Invalid request URL" }, { status: 400 })
    }
    const fieldName = searchParams.get('fieldName')
    const entityType = searchParams.get('entityType')
    const businessId = searchParams.get('businessId')
    const targetBusinessId = businessId || 'default'

    if (!fieldName) {
      return NextResponse.json({ error: "Field name is required" }, { status: 400 })
    }

    // Get current user settings directly from database
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

    // Remove custom field
    const settingField = getEntityFieldName(entityType || 'product')
    const currentFields = currentSettings[settingField] || []
    const updatedFields = currentFields.filter((f: any) => f.name !== fieldName)

    targetProfile.settings = { ...currentSettings, [settingField]: updatedFields }
    if (profileIndex !== -1) profiles[profileIndex] = targetProfile
    else profiles[profiles.length - 1] = targetProfile

    const result = await updateUser(user._id!.toString(), { businessProfiles: profiles })

    if (result) {
      return NextResponse.json({
        success: true,
        message: "Custom field removed successfully"
      })
    } else {
      return NextResponse.json({ error: "Failed to remove custom field" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
    console.error("Error removing custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 