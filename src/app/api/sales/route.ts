import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSale, getSales, getProductById } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter object
    const filters: any = {}
    
    if (startDate || endDate) {
      filters.saleDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0) // Start of the day
        filters.saleDate.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // End of the day
        filters.saleDate.$lte = end
      }
    }
    
    if (productId) {
      filters.productId = new ObjectId(productId)
    }

    const sales = await getSales(session.user.id, filters)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: sales
    })

  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
    const { productId, productName, quantitySold, unitPrice, saleDate, customerName, notes, saleExpenses, saleExpenseDetails } = body

    // Validation
    if (!productId || !quantitySold || !unitPrice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product ID, quantity sold, and unit price are required"
      }, { status: 400 })
    }

    if (quantitySold <= 0 || unitPrice <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Quantity and price must be positive numbers"
      }, { status: 400 })
    }

    // Fetch product to get cost price
    const product = await getProductById(productId)
    
    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    if (product.currentStock < quantitySold) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Insufficient stock"
      }, { status: 400 })
    }

    // Calculate profit properly
    const totalRevenue = parseFloat(quantitySold) * parseFloat(unitPrice)
    const totalCogs = parseFloat(quantitySold) * (product.costPrice || 0)
    const totalSaleExpenses = parseFloat(saleExpenses) || 0
    const totalProfit = totalRevenue - totalCogs - totalSaleExpenses

    const saleId = await createSale({
      userId: new ObjectId(session.user.id),
      productId: new ObjectId(productId),
      productName: productName || product.name,
      quantity: parseInt(quantitySold),
      unitSalePrice: parseFloat(unitPrice),
      unitCostPrice: product.costPrice || 0,
      saleExpenses: totalSaleExpenses,
      totalProfit: totalProfit,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      notes: notes || ""
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Sale recorded successfully",
      data: { saleId: saleId.toString() }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 