import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createProduct, getProducts } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function GET(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // In Next.js 15, searchParams may be passed as a Promise (see: async API)
    // Here, we use request.url for full compatibility as before.
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')

    // Build filter object
    const filters: any = {}
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    }
    if (category && category !== 'all') {
      filters.category = category
    }
    if (lowStock === 'true') {
      filters.currentStock = { $lte: 5 }
    }

    const products = await getProducts(session.user.id, filters)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: products
    })

  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function POST(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, type, size, color, sku, costPrice, salePrice, currentStock, customFields } = body

    // Validation
    if (!name || !category || costPrice === undefined || salePrice === undefined || currentStock === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Name, category, cost price, sale price, and current stock are required"
      }, { status: 400 })
    }

    if (costPrice < 0 || salePrice < 0 || currentStock < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Prices and stock cannot be negative"
      }, { status: 400 })
    }

    const productId = await createProduct({
      userId: new ObjectId(session.user.id),
      name,
      category,
      type: type || "",
      size: size || "",
      color: color || "",
      sku: sku || "",
      costPrice: parseFloat(costPrice),
      salePrice: parseFloat(salePrice),
      currentStock: parseInt(currentStock),
      customFields: customFields || {}
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Product created successfully",
      data: { productId: productId.toString() }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 