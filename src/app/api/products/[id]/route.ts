import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProductById, updateProduct, deleteProduct } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

// Error handling for Mongo/MongoDB/BSON errors
function handleMongoError(error: any) {
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
  if (
    error?.name === "BSONError" ||
    (typeof error?.message === "string" &&
      error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
  ) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Product not found"
    }, { status: 404 })
  }
  return null
}

function validObjectId(id: string): boolean {
  // Only allow 24-character hex
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

// In Next.js 15, params is a Promise and must be awaited before accessing its properties
export async function GET(
  request: NextRequest,
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const params = await routeParams.params;
    const id = params.id;
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Validate ID format
    if (!validObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    let product
    try {
      product = await getProductById(id)
    } catch (error: any) {
      const handled = handleMongoError(error)
      if (handled) return handled
      throw error
    }

    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (product.userId?.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: product
    })

  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const params = await routeParams.params;
    const id = params.id;
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    if (!validObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    let existingProduct
    try {
      existingProduct = await getProductById(id)
    } catch (error: any) {
      const handled = handleMongoError(error)
      if (handled) return handled
      throw error
    }

    if (!existingProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (existingProduct.userId?.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, category, type, size, color, sku, costPrice, salePrice, currentStock, customFields } = body

    // Validation
    if (costPrice !== undefined && costPrice < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cost price cannot be negative"
      }, { status: 400 })
    }

    if (salePrice !== undefined && salePrice < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Sale price cannot be negative"
      }, { status: 400 })
    }

    if (currentStock !== undefined && currentStock < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Stock cannot be negative"
      }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (type !== undefined) updateData.type = type
    if (size !== undefined) updateData.size = size
    if (color !== undefined) updateData.color = color
    if (sku !== undefined) updateData.sku = sku
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice)
    if (salePrice !== undefined) updateData.salePrice = parseFloat(salePrice)
    if (currentStock !== undefined) updateData.currentStock = parseInt(currentStock)
    if (customFields !== undefined) updateData.customFields = customFields

    let updated
    try {
      updated = await updateProduct(id, updateData)
    } catch (error: any) {
      const handled = handleMongoError(error)
      if (handled) return handled
      throw error
    }

    if (!updated) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to update product"
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Product updated successfully"
    })

  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeParams: { params: Promise<{ id: string }> }
) {
  try {
    const params = await routeParams.params;
    const id = params.id;
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    if (!validObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    let existingProduct
    try {
      existingProduct = await getProductById(id)
    } catch (error: any) {
      const handled = handleMongoError(error)
      if (handled) return handled
      throw error
    }

    if (!existingProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (existingProduct.userId?.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    let deleted
    try {
      deleted = await deleteProduct(id)
    } catch (error: any) {
      const handled = handleMongoError(error)
      if (handled) return handled
      throw error
    }

    if (!deleted) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to delete product"
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Product deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 