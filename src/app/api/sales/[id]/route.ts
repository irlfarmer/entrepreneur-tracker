import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { ApiResponse } from "@/lib/types"
import { getProductById } from "@/lib/database"

// Helper function for Mongo ObjectId validation
function isValidObjectId(id: string) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await context.params

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid sale ID"
      }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
    } catch (err) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid JSON payload"
      }, { status: 400 })
    }

    const { productId, productName, quantitySold, unitPrice, customerName, notes, saleExpenses, saleExpenseDetails } = body

    // Validation
    if (!productId || !quantitySold || !unitPrice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Product ID, quantity sold, and unit price are required"
      }, { status: 400 })
    }

    if (!isValidObjectId(productId)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid product ID"
      }, { status: 400 })
    }

    if (quantitySold <= 0 || unitPrice <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Quantity and price must be positive numbers"
      }, { status: 400 })
    }

    let client
    try {
      client = await clientPromise
    } catch (dbErr: any) {
      const name = dbErr?.name
      const message = dbErr?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", dbErr)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Internal server error"
      }, { status: 500 })
    }

    const db = client.db('entrepreneur-tracker')

    // Get the existing sale
    let existingSale
    try {
      existingSale = await db.collection('sales').findOne({
        _id: new ObjectId(id),
        userId: new ObjectId(session.user.id)
      })
    } catch (err: any) {
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid sale ID"
        }, { status: 400 })
      }
      throw err
    }

    if (!existingSale) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Sale not found"
      }, { status: 404 })
    }

    // Fetch product to get cost price and validate stock
    let product
    try {
      product = await getProductById(productId)
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid product ID"
        }, { status: 400 })
      }
      throw err
    }

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
    let updateResult
    try {
      updateResult = await db.collection('sales').updateOne(
        { _id: new ObjectId(id), userId: new ObjectId(session.user.id) },
        {
          $set: {
            productId: new ObjectId(productId),
            productName: productName || product.name,
            quantity: parseInt(quantitySold),
            unitSalePrice: parseFloat(unitPrice),
            unitCostPrice: product.costPrice || 0,
            saleExpenses: totalSaleExpenses,
            saleExpenseDetails: saleExpenseDetails || [],
            totalProfit: totalProfit,
            notes: notes || "",
            updatedAt: new Date()
          }
        }
      )
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid sale or product ID"
        }, { status: 400 })
      }
      throw err
    }

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to update sale"
      }, { status: 500 })
    }

    // Update product stock (adjust by the difference)
    try {
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
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot update product stock due to database issues. Please try again later."
        }, { status: 503 })
      }
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid product ID"
        }, { status: 400 })
      }
      throw err
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Sale updated successfully"
    })

  } catch (error: any) {
    // Catch MongoDB connection and BSON errors at the outer level too just in case
    if (
      error?.name === "MongoServerSelectionError" ||
      (error?.message && error.message.includes("Server selection timed out"))
    ) {
      console.error("MongoDB connection error: ", error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cannot connect to database. Please try again later."
      }, { status: 503 })
    }
    if (
      error?.name === "BSONError" ||
      (error?.message && error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
    ) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid ObjectId in input"
      }, { status: 400 })
    }
    console.error("Error updating sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const { id } = await context.params

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid sale ID"
      }, { status: 400 })
    }

    let client
    try {
      client = await clientPromise
    } catch (dbErr: any) {
      const name = dbErr?.name
      const message = dbErr?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", dbErr)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Internal server error"
      }, { status: 500 })
    }

    const db = client.db('entrepreneur-tracker')

    // First, get the sale to check ownership and get product info for stock restoration
    let sale
    try {
      sale = await db.collection('sales').findOne({
        _id: new ObjectId(id),
        userId: new ObjectId(session.user.id)
      })
    } catch (err: any) {
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid sale ID"
        }, { status: 400 })
      }
      throw err
    }

    if (!sale) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Sale not found"
      }, { status: 404 })
    }

    // Delete the sale
    let deleteResult
    try {
      deleteResult = await db.collection('sales').deleteOne({
        _id: new ObjectId(id),
        userId: new ObjectId(session.user.id)
      })
    } catch (err: any) {
      if (
        err?.name === "MongoServerSelectionError" ||
        (err?.message && err.message.includes("Server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid sale ID"
        }, { status: 400 })
      }
      throw err
    }

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Failed to delete sale"
      }, { status: 500 })
    }

    // Restore product stock - handle null currentStock values
    if (sale.productId && isValidObjectId(sale.productId?.toString())) {
      try {
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
      } catch (err: any) {
        if (
          err?.name === "MongoServerSelectionError" ||
          (err?.message && err.message.includes("Server selection timed out"))
        ) {
          console.error("MongoDB connection error: ", err)
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Cannot update product stock due to database issues. Please try again later."
          }, { status: 503 })
        }
        if (
          err?.name === "BSONError" ||
          (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
        ) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Invalid product ID in sale"
          }, { status: 400 })
        }
        throw err
      }
    }

    // Handle multi-product sales
    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (!isValidObjectId(item.productId)) continue
        try {
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
        } catch (err: any) {
          if (
            err?.name === "MongoServerSelectionError" ||
            (err?.message && err.message.includes("Server selection timed out"))
          ) {
            console.error("MongoDB connection error: ", err)
            return NextResponse.json<ApiResponse>({
              success: false,
              error: "Cannot update product stock due to database issues. Please try again later."
            }, { status: 503 })
          }
          if (
            err?.name === "BSONError" ||
            (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
          ) {
            // Skip invalid product IDs in multi-item sale
            continue
          }
          throw err
        }
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Sale deleted successfully"
    })

  } catch (error: any) {
    if (
      error?.name === "MongoServerSelectionError" ||
      (error?.message && error.message.includes("Server selection timed out"))
    ) {
      console.error("MongoDB connection error: ", error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cannot connect to database. Please try again later."
      }, { status: 503 })
    }
    if (
      error?.name === "BSONError" ||
      (error?.message && error.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
    ) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid ObjectId in input"
      }, { status: 400 })
    }
    console.error("Error deleting sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 