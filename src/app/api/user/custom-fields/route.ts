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

    const { field } = await request.json()

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
    const user = await getUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentSettings = user.settings || {}

    // Add new custom field
    const currentFields = currentSettings.customProductFields || []
    
    // Check if field already exists
    if (currentFields.some((f: any) => f.name === field.name)) {
      return NextResponse.json({ error: "Field with this name already exists" }, { status: 400 })
    }

    const updatedFields = [...currentFields, field]
    
    const updateData = {
      settings: {
        ...currentSettings,
        customProductFields: updatedFields
      }
    } as Partial<any>

    const result = await updateUser(user._id!.toString(), updateData)

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Custom field added successfully",
        field
      })
    } else {
      return NextResponse.json({ error: "Failed to add custom field" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error adding custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { oldFieldName, field } = await request.json()

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
    const user = await getUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentSettings = user.settings || {}

    // Update custom field
    const currentFields = currentSettings.customProductFields || []
    
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
    
    const updateData = {
      settings: {
        ...currentSettings,
        customProductFields: updatedFields
      }
    } as Partial<any>

    const result = await updateUser(user._id!.toString(), updateData)

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
  } catch (error) {
    console.error("Error updating custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fieldName = searchParams.get('fieldName')

    if (!fieldName) {
      return NextResponse.json({ error: "Field name is required" }, { status: 400 })
    }

    // Get current user settings directly from database
    const user = await getUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentSettings = user.settings || {}

    // Remove custom field
    const currentFields = currentSettings.customProductFields || []
    const updatedFields = currentFields.filter((f: any) => f.name !== fieldName)
    
    const updateData = {
      settings: {
        ...currentSettings,
        customProductFields: updatedFields
      }
    } as Partial<any>

    const result = await updateUser(user._id!.toString(), updateData)

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Custom field removed successfully"
      })
    } else {
      return NextResponse.json({ error: "Failed to remove custom field" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error removing custom field:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 