import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSale, getSalesWithProductDetails, getProductById, getServiceById } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

// Helper function to validate MongoDB ObjectID
function isValidObjectId(id: string): boolean {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(request: NextRequest) {
  try {
    // If using any dynamic APIs (like searchParams on request), they must be awaited in Next.js 15+
    // NextRequest's query/headers/cookies/searchParams now may be async
    // However, for the base NextRequest (not next/headers) .url and new URL(request.url) is synchronous and OK.
    // So, we do not need to "await" anything here as written.

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Using new URL(request.url) remains synchronous for getting query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const offset = parseInt(searchParams.get('offset') || '0')
    const businessId = searchParams.get('businessId') || 'default'

    // Build filter object
    const filters: any = {}

    if (startDate || endDate) {
      filters.saleDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        filters.saleDate.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filters.saleDate.$lte = end
      }
    }

    // Validate ObjectId for productId
    if (productId) {
      if (!isValidObjectId(productId)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid product ID"
        }, { status: 400 })
      }
      filters.productId = new ObjectId(productId)
    }

    let sales;
    try {
      sales = await getSalesWithProductDetails(session.user.id, businessId, filters)
    } catch (err: any) {
      // Handle MongoServerSelectionError (cannot connect to DB)
      if (
        err?.name === "MongoServerSelectionError" ||
        (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      // Handle BSONError or invalid ObjectId
      if (
        err?.name === "BSONError" ||
        (typeof err?.message === "string" && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid input: failed to parse ObjectId"
        }, { status: 400 })
      }
      throw err
    }

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

    let body: any
    try {
      body = await request.json()
    } catch (err) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid JSON payload"
      }, { status: 400 })
    }

    const { productId, productName, quantitySold, unitPrice, customerName, saleDate, notes, saleExpenses, items, saleExpenseDetails, businessId } = body

    // Determine if this is a multi-product sale or legacy single-product sale
    const isMultiProduct = items && Array.isArray(items) && items.length > 0

    if (isMultiProduct) {
      // Multi-product/service sale validation
      if (items.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "At least one item is required"
        }, { status: 400 })
      }

      for (const item of items) {
        // Normalizing ID: use itemId if present, else productId (legacy)
        const id = item.itemId || item.productId

        if (!id || !item.quantity || !item.unitSalePrice) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Each item must have itemId/productId, quantity, and unitSalePrice"
          }, { status: 400 })
        }
        if (!isValidObjectId(id)) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Invalid item ID in items`
          }, { status: 400 })
        }
        if (item.quantity <= 0 || item.unitSalePrice < 0) { // Price can be 0, but quantity > 0
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Quantity must be positive and price non-negative"
          }, { status: 400 })
        }
      }

      // Fetch items and validate
      const saleItems = []
      let totalSales = 0
      let totalCogs = 0
      let totalProfit = 0

      for (const item of items) {
        // Normalize fields
        const id = item.itemId || item.productId
        const type = item.itemType || 'Product' // Default to Product for legacy

        let product, service

        try {
          if (type === 'Product') {
            product = await getProductById(id)
          } else {
            service = await getServiceById(id)
          }
        } catch (err: any) {
          // ... Error handling same as before ...
          if (
            err?.name === "MongoServerSelectionError" ||
            (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
          ) {
            return NextResponse.json<ApiResponse>({
              success: false,
              error: "Cannot connect to database. Please try again later."
            }, { status: 503 })
          }
          throw err
        }

        if (type === 'Product' && !product) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Product with ID ${id} not found`
          }, { status: 404 })
        }
        if (type === 'Service' && !service) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Service with ID ${id} not found`
          }, { status: 404 })
        }

        if (type === 'Product' && product && product.currentStock < item.quantity) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
          }, { status: 400 })
        }
        const lineTotal = item.quantity * item.unitSalePrice
        const lineCogs = type === 'Product' && product ? (item.quantity * (product.costPrice || 0)) : 0
        const lineProfit = lineTotal - lineCogs

        // Build productDetails based on item type
        let productDetails: any = undefined
        if (type === 'Product' && product) {
          productDetails = {
            category: product.category,
            type: product.type,
            size: product.size,
            color: product.color,
            sku: product.sku,
            customFields: product.customFields || {}
          }
        } else if (type === 'Service' && service) {
          productDetails = {
            category: service.category || undefined
          }
        }

        saleItems.push({
          itemId: new ObjectId(id),
          itemType: type,
          name: type === 'Product' ? product!.name : service!.name,
          quantity: item.quantity,
          unitSalePrice: item.unitSalePrice,
          unitCostPrice: type === 'Product' ? (product!.costPrice || 0) : 0,
          lineTotal,
          lineProfit,
          productDetails
        })
        totalSales += lineTotal
        totalCogs += lineCogs
        totalProfit += lineProfit
      }

      const totalSaleExpenses = parseFloat(saleExpenses) || 0
      const netProfit = totalProfit - totalSaleExpenses

      let saleId
      try {
        saleId = await createSale({
          userId: new ObjectId(session.user.id),
          businessId: businessId || 'default',
          items: saleItems,
          customerName: customerName || undefined,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          saleExpenses: totalSaleExpenses,
          saleExpenseDetails: saleExpenseDetails || [],
          totalSales,
          totalCogs,
          totalProfit: netProfit,
          notes: notes || ""
        })
      } catch (err: any) {
        // Handle MongoServerSelectionError (cannot connect to DB)
        if (
          err?.name === "MongoServerSelectionError" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
        ) {
          console.error("MongoDB connection error: ", err)
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Cannot connect to database. Please try again later."
          }, { status: 503 })
        }
        throw err
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Sale recorded successfully",
        data: {
          saleId: saleId.toString(),
          totalSales,
          totalProfit: netProfit,
          itemCount: saleItems.length
        }
      }, { status: 201 })


    } else {
      // Legacy single-product sale
      if (!productId || !quantitySold || !unitPrice) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Product ID, quantity sold, and unit price are required"
        }, { status: 400 })
      }

      // Validate productId
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

      let product
      try {
        product = await getProductById(productId)
      } catch (err: any) {
        // Handle MongoServerSelectionError (cannot connect to DB)
        if (
          err?.name === "MongoServerSelectionError" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
        ) {
          console.error("MongoDB connection error: ", err)
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Cannot connect to database. Please try again later."
          }, { status: 503 })
        }
        // Handle BSONError
        if (
          err?.name === "BSONError" ||
          (typeof err?.message === "string" && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
        ) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Invalid input: failed to parse productId"
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

      if (product.currentStock < quantitySold) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Insufficient stock"
        }, { status: 400 })
      }

      const totalRevenue = parseFloat(quantitySold) * parseFloat(unitPrice)
      const totalCogs = parseFloat(quantitySold) * (product.costPrice || 0)
      const totalSaleExpenses = parseFloat(saleExpenses) || 0
      const totalProfit = totalRevenue - totalCogs - totalSaleExpenses

      let saleId
      try {
        saleId = await createSale({
          userId: new ObjectId(session.user.id),
          businessId: businessId || 'default',
          // Legacy fields
          productId: new ObjectId(productId),
          productName: productName || product.name,
          quantity: parseInt(quantitySold),
          unitSalePrice: parseFloat(unitPrice),
          unitCostPrice: product.costPrice || 0,
          // New fields
          items: [{
            itemId: new ObjectId(productId),
            itemType: 'Product',
            name: productName || product.name,
            quantity: parseInt(quantitySold),
            unitSalePrice: parseFloat(unitPrice),
            unitCostPrice: product.costPrice || 0,
            lineTotal: totalRevenue,
            lineProfit: totalRevenue - totalCogs
          }],
          customerName: customerName || undefined,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          saleExpenses: totalSaleExpenses,
          saleExpenseDetails: saleExpenseDetails || [],
          totalSales: totalRevenue,
          totalCogs,
          totalProfit: totalProfit,
          notes: notes || ""
        })
      } catch (err: any) {
        // MongoDB server selection error
        if (
          err?.name === "MongoServerSelectionError" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
        ) {
          console.error("MongoDB connection error: ", err)
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Cannot connect to database. Please try again later."
          }, { status: 503 })
        }
        // BSON parse error (invalid ObjectId)
        if (
          err?.name === "BSONError" ||
          (typeof err?.message === "string" && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
        ) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: "Invalid input: failed to parse ObjectId"
          }, { status: 400 })
        }
        throw err
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Sale recorded successfully",
        data: { saleId: saleId.toString() }
      }, { status: 201 })
    }

  } catch (error) {
    // Connection error catch-all for outer scope
    if (
      (error as any)?.name === "MongoServerSelectionError" ||
      ((typeof (error as any)?.message === "string") &&
        (error as any).message.toLowerCase().includes("server selection timed out"))
    ) {
      console.error("MongoDB connection error: ", error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cannot connect to database. Please try again later."
      }, { status: 503 })
    }
    // BSON or other invalid objectId format errors at outer catch
    if (
      (error as any)?.name === "BSONError" ||
      ((typeof (error as any)?.message === "string") &&
        (error as any).message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
    ) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid input: failed to parse ObjectId"
      }, { status: 400 })
    }
    console.error("Error creating sale:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 