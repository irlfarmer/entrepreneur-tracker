import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { ApiResponse } from "@/lib/types"
import { getProductById } from "@/lib/database"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await params
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid sale ID"
      }, { status: 400 })
    }

    const body = await request.json()
    const { productId, productName, quantitySold, unitPrice, customerName, notes, saleExpenses, saleExpenseDetails } = body

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

    const client = await clientPromise
    const db = client.db('entrepreneur-tracker')

    // Get the existing sale
    const existingSale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(session.user.id)
    })

    if (!existingSale) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Sale not found"
      }, { status: 404 })
    }

    // Fetch product to get cost price and validate stock
    const product = await getProductById(productId)
    
    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }

    // Calculate stock changes (restore old quantity, then check if new quantity is available)
    const stockDifference = quantitySold - existingSale.quantity
    const availableStock = product.currentStock + existingSale.quantity

    if (quantitySold > availableStock) {
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

    // Update the sale
    const updateResult = await db.collection('sales').updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(session.user.id) },
      {
        $set: {
          productId: new ObjectId(productId),
          productName: productName || product.name,
          quantity: parseInt(quantitySold),
          unitSalePrice: parseFloat(unitPrice),
          unitCostPrice: product.costPrice || 0,
          saleExpenses: totalSaleExpenses,
          totalProfit: totalProfit,
          notes: notes || "",
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to update sale"
      }, { status: 500 })
    }

    // Update product stock (adjust by the difference)
    await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      [
        {
          $set: {
            currentStock: {
              $add: [
                { $ifNull: ["$currentStock", 0] },
                -stockDifference
              ]
            },
            updatedAt: new Date()
          }
        }
      ]
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Sale updated successfully"
    })

  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await params
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid sale ID"
      }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('entrepreneur-tracker')

    // First, get the sale to check ownership and get product info for stock restoration
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(session.user.id)
    })

    if (!sale) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Sale not found"
      }, { status: 404 })
    }

    // Delete the sale
    const deleteResult = await db.collection('sales').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(session.user.id)
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to delete sale"
      }, { status: 500 })
    }

    // Restore product stock - handle null currentStock values
    if (sale.productId) {
      await db.collection('products').updateOne(
        { _id: new ObjectId(sale.productId) },
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  sale.quantity || 0
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }

    // Handle multi-product sales
    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        await db.collection('products').updateOne(
          { _id: new ObjectId(item.productId) },
          [
            {
              $set: {
                currentStock: {
                  $add: [
                    { $ifNull: ["$currentStock", 0] },
                    item.quantity || 0
                  ]
                },
                updatedAt: new Date()
              }
            }
          ]
        )
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Sale deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 