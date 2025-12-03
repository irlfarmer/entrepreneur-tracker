import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"

// Helper function to check if error is BSON (ObjectId) or MongoDB connection error
function handleMongoError(error: any) {
  // MongoServerSelectionError - cannot connect to database
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
  // BSONError - invalid ObjectId string or related
  if (
    error?.name === "BSONError" ||
    (typeof error?.message === "string" && error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
  ) {
    return NextResponse.json({
      success: false,
      error: "Invalid user ID"
    }, { status: 400 })
  }
  // Otherwise, don't handle
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
    const { type, category } = body

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    if (!['expense', 'product'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense' or 'product'" }, { status: 400 })
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

    const currentSettings = user.settings || {}

    // Add new category to the appropriate array
    const fieldName = type === 'expense' ? 'customExpenseCategories' : 'customProductCategories'
    const currentCategories = currentSettings[fieldName] || []

    // Check if category already exists
    if (currentCategories.includes(category)) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const updatedCategories = [...currentCategories, category]
    const updateData = {
      [`settings.${fieldName}`]: updatedCategories
    }

    let result
    try {
      result = await updateUser(user._id!.toString(), updateData)
    } catch (err: any) {
      const response = handleMongoError(err)
      if (response) return response
      throw err
    }

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Category added successfully",
        category
      })
    } else {
      return NextResponse.json({ error: "Failed to add category" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
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
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    const { type, oldCategory, newCategory } = body

    if (!type || !oldCategory || !newCategory) {
      return NextResponse.json({ error: "Type, oldCategory, and newCategory are required" }, { status: 400 })
    }

    if (!['expense', 'product'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense' or 'product'" }, { status: 400 })
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

    const currentSettings = user.settings || {}

    // Update category in the appropriate array
    const fieldName = type === 'expense' ? 'customExpenseCategories' : 'customProductCategories'
    const currentCategories = currentSettings[fieldName] || []

    // Check if old category exists
    if (!currentCategories.includes(oldCategory)) {
      return NextResponse.json({ error: "Old category not found" }, { status: 404 })
    }

    // Check if new category already exists
    if (currentCategories.includes(newCategory)) {
      return NextResponse.json({ error: "New category already exists" }, { status: 400 })
    }

    const updatedCategories = currentCategories.map((cat: string) =>
      cat === oldCategory ? newCategory : cat
    )

    const updateData = {
      [`settings.${fieldName}`]: updatedCategories
    }
    let result
    try {
      result = await updateUser(user._id!.toString(), updateData)
    } catch (err: any) {
      const response = handleMongoError(err)
      if (response) return response
      throw err
    }

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Category updated successfully",
        oldCategory,
        newCategory
      })
    } else {
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
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

    // In Next.js 15 dynamic API, searchParams may be async on the request object
    // Using new URL(request.url) with request.url is still safe, but to guarantee full compatibility,
    // always await searchParams instantiation if needed (usually not a promise but can be).
    // If searchParams in URL object is ever async, this lets us handle it.
    const url = new URL(request.url)
    const searchParams = url.searchParams // Not a Promise, but following Next.js 15 docs, use as variable

    const type = searchParams.get('type')
    const category = searchParams.get('category')

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    if (!['expense', 'product'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense' or 'product'" }, { status: 400 })
    }

    // Get current user settings using auth and database, to avoid fetch problems/nextauth url
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

    const currentSettings = user.settings || {}
    // Remove category from the appropriate array
    const fieldName = type === 'expense' ? 'customExpenseCategories' : 'customProductCategories'
    const currentCategories = currentSettings[fieldName] || []

    const updatedCategories = currentCategories.filter((cat: string) => cat !== category)

    const updateData = {
      [`settings.${fieldName}`]: updatedCategories
    }

    let result
    try {
      result = await updateUser(user._id!.toString(), updateData)
    } catch (err: any) {
      const response = handleMongoError(err)
      if (response) return response
      throw err
    }

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `${type} category removed successfully`
      })
    } else {
      return NextResponse.json({ error: "Failed to remove category" }, { status: 500 })
    }
  } catch (error: any) {
    const response = handleMongoError(error)
    if (response) return response
    console.error("Error removing category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}