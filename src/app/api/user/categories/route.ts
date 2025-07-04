import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail, updateUser } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, category } = await request.json()

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    if (!['expense', 'product'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense' or 'product'" }, { status: 400 })
    }

    // Get current user settings directly from database
    const user = await getUserByEmail(session.user.email)
    
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

    const result = await updateUser(user._id!.toString(), updateData)

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Category added successfully",
        category
      })
    } else {
      return NextResponse.json({ error: "Failed to add category" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error adding category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    if (!type || !category) {
      return NextResponse.json({ error: "Type and category are required" }, { status: 400 })
    }

    if (!['expense', 'product'].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'expense' or 'product'" }, { status: 400 })
    }

    // Get current user settings
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/user/settings`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    let currentSettings = {}
    
    if (response.ok) {
      const data = await response.json()
      currentSettings = data.data?.settings || {}
    }

    // Remove category from the appropriate array
    const fieldName = type === 'expense' ? 'customExpenseCategories' : 'customProductCategories'
    const currentCategories = (currentSettings as any)[fieldName] || []
    
    const updatedCategories = currentCategories.filter((cat: string) => cat !== category)
    
    const updateData = {
      [`settings.${fieldName}`]: updatedCategories
    }

    const result = await updateUser(session.user.id, updateData)

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `${type} category removed successfully`
      })
    } else {
      return NextResponse.json({ error: "Failed to remove category" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error removing category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 