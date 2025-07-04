import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProductById, updateProduct, deleteProduct } from "@/lib/database"
import { ApiResponse } from "@/lib/types"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const product = await getProductById(params.id)
    
    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    // Check if user owns this product
    if (product.userId.toString() !== session.user.id) {
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // First check if product exists and user owns it
    const existingProduct = await getProductById(params.id)
    if (!existingProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (existingProduct.userId.toString() !== session.user.id) {
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

    const updated = await updateProduct(params.id, updateData)

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // First check if product exists and user owns it
    const existingProduct = await getProductById(params.id)
    if (!existingProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (existingProduct.userId.toString() !== session.user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 403 })
    }

    const deleted = await deleteProduct(params.id)

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