import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserByEmail, updateUser } from '@/lib/database'

// Helper to handle MongoDB/errors (connection & BSON/ObjectId)
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
  // Otherwise, don't handle - let main catch handler show generic 500
  return null
}

export async function GET(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const categories = user.settings?.saleRelatedExpenseCategories || [
      'Shipping & Delivery',
      'Payment Processing',
      'Taxes & Fees',
      'Marketing & Advertising',
      'Packaging',
      'Commission & Referral',
      'Returns & Refunds',
      'Other'
    ]

    return NextResponse.json({ success: true, data: categories })
  } catch (error: any) {
    const resp = handleMongoError(error)
    if (resp) return resp
    console.error('Error fetching sale categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let parsed
    try {
      parsed = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    const { category } = parsed

    if (!category || category.trim().length === 0) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentCategories = user.settings?.saleRelatedExpenseCategories || [
      'Shipping & Delivery',
      'Payment Processing',
      'Taxes & Fees',
      'Marketing & Advertising',
      'Packaging',
      'Commission & Referral',
      'Returns & Refunds',
      'Other'
    ]

    if (currentCategories.includes(category.trim())) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    }

    const updatedCategories = [...currentCategories, category.trim()]

    try {
      await updateUser(user._id!.toString(), {
        settings: {
          ...user.settings,
          saleRelatedExpenseCategories: updatedCategories
        }
      })
    } catch (err: any) {
      const resp = handleMongoError(err)
      if (resp) return resp
      throw err
    }

    return NextResponse.json({ success: true, data: updatedCategories })
  } catch (error: any) {
    const resp = handleMongoError(error)
    if (resp) return resp
    console.error('Error adding sale category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let parsed
    try {
      parsed = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    const { category } = parsed

    if (!category) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentCategories = user.settings?.saleRelatedExpenseCategories || []
    const updatedCategories = currentCategories.filter(c => c !== category)

    try {
      await updateUser(user._id!.toString(), {
        settings: {
          ...user.settings,
          saleRelatedExpenseCategories: updatedCategories
        }
      })
    } catch (err: any) {
      const resp = handleMongoError(err)
      if (resp) return resp
      throw err
    }

    return NextResponse.json({ success: true, data: updatedCategories })
  } catch (error: any) {
    const resp = handleMongoError(error)
    if (resp) return resp
    console.error('Error removing sale category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}