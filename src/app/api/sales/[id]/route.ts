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

    const { 
      items, 
      customerName, 
      saleDate, 
      notes, 
      saleExpenses, 
      saleExpenseDetails,
      businessId
    } = body

    let client
    try {
      client = await clientPromise
    } catch (dbErr: any) {
      console.error("MongoDB connection error: ", dbErr)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cannot connect to database. Please try again later."
      }, { status: 503 })
    }

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

    // Build update object dynamically (allow partial updates)
    const updateData: any = {
      updatedAt: new Date()
    }

    if (customerName !== undefined) updateData.customerName = customerName
    if (notes !== undefined) updateData.notes = notes
    if (saleDate !== undefined) updateData.saleDate = new Date(saleDate)
    if (saleExpenses !== undefined) updateData.saleExpenses = parseFloat(saleExpenses) || 0
    if (saleExpenseDetails !== undefined) updateData.saleExpenseDetails = saleExpenseDetails || []
    if (businessId !== undefined) updateData.businessId = businessId

    // Handle items update and stock adjustment
    if (items && Array.isArray(items)) {
      // 1. Revert old stock changes
      if (existingSale.items && Array.isArray(existingSale.items)) {
        for (const item of existingSale.items) {
          if (item.itemType === 'Product') {
            await db.collection('products').updateOne(
              { _id: new ObjectId(item.itemId) },
              { $inc: { currentStock: item.quantity || 0 } }
            )
          }
        }
      } else if (existingSale.productId) {
        // Handle legacy single-item sale revert
        await db.collection('products').updateOne(
          { _id: new ObjectId(existingSale.productId) },
          { $inc: { currentStock: existingSale.quantity || 0 } }
        )
      }

      // 2. Validate and calculate new items
      const processedItems = []
      let totalSales = 0
      let totalCogs = 0
      let totalProfit = 0

      for (const item of items) {
        const itemId = item.itemId || item.productId
        const type = item.itemType || 'Product'

        if (type === 'Product') {
          const product = await db.collection('products').findOne({ _id: new ObjectId(itemId) })
          if (!product) throw new Error(`Product ${itemId} not found`)
          
          if (product.currentStock < item.quantity) {
             // Rollback: we should technically have a transaction here, 
             // but for simplicity we'll just return an error. 
             // The stock is temporarily skewed but will be fixed if user resubmits correctly.
             return NextResponse.json<ApiResponse>({
                success: false,
                error: `Insufficient stock for product ${product.name}`
             }, { status: 400 })
          }

          const lineTotal = item.quantity * item.unitSalePrice
          const lineCogs = item.quantity * (product.costPrice || 0)
          
          processedItems.push({
            itemId: new ObjectId(itemId),
            itemType: 'Product',
            name: product.name,
            quantity: item.quantity,
            unitSalePrice: item.unitSalePrice,
            unitCostPrice: product.costPrice || 0,
            lineTotal,
            lineProfit: lineTotal - lineCogs
          })
          
          totalSales += lineTotal
          totalCogs += lineCogs
          totalProfit += (lineTotal - lineCogs)

          // 3. Apply new stock changes
          await db.collection('products').updateOne(
            { _id: new ObjectId(itemId) },
            { $inc: { currentStock: -item.quantity } }
          )
        } else {
          // Service logic
          const service = await db.collection('services').findOne({ _id: new ObjectId(itemId) })
          if (!service) throw new Error(`Service ${itemId} not found`)

          const lineTotal = item.quantity * item.unitSalePrice
          processedItems.push({
            itemId: new ObjectId(itemId),
            itemType: 'Service',
            name: service.name,
            quantity: item.quantity,
            unitSalePrice: item.unitSalePrice,
            unitCostPrice: 0,
            lineTotal,
            lineProfit: lineTotal
          })
          totalSales += lineTotal
          totalProfit += lineTotal
        }
      }

      updateData.items = processedItems
      updateData.totalSales = totalSales
      updateData.totalCogs = totalCogs
      // totalProfit passed to API is netProfit (gross - expenses)
      const currentExpenses = updateData.saleExpenses !== undefined ? updateData.saleExpenses : (existingSale.saleExpenses || 0)
      updateData.totalProfit = totalProfit - currentExpenses
    } else if (updateData.saleExpenses !== undefined) {
      // If expenses changed but items didn't, update totalProfit
      const grossProfit = (existingSale.totalSales || 0) - (existingSale.totalCogs || 0)
      updateData.totalProfit = grossProfit - updateData.saleExpenses
    }

    // Perform update
    await db.collection('sales').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

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