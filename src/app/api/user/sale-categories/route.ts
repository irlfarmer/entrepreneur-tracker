import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserByEmail, updateUser } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByEmail(session.user.email)
    
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
  } catch (error) {
    console.error('Error fetching sale categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category } = await request.json()

    if (!category || category.trim().length === 0) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)
    
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

    await updateUser(user._id!.toString(), {
      settings: {
        ...user.settings,
        saleRelatedExpenseCategories: updatedCategories
      }
    })

    return NextResponse.json({ success: true, data: updatedCategories })
  } catch (error) {
    console.error('Error adding sale category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category } = await request.json()

    if (!category) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentCategories = user.settings?.saleRelatedExpenseCategories || []
    const updatedCategories = currentCategories.filter(c => c !== category)

    await updateUser(user._id!.toString(), {
      settings: {
        ...user.settings,
        saleRelatedExpenseCategories: updatedCategories
      }
    })

    return NextResponse.json({ success: true, data: updatedCategories })
  } catch (error) {
    console.error('Error removing sale category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 