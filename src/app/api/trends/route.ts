import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId, MongoClient } from "mongodb"
import { ApiResponse } from "@/lib/types"

// Helper to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(request: NextRequest) {
  try {
    // Await asynchronous access to searchParams from the request (Next.js 15 dynamic API)
    const url = new URL(request.url)
    const searchParams = await url.searchParams
    // In most environments, searchParams is not a promise, but Next.js 15 enforces async access if needed. 
    // If this ever changes, this ensures compliance.

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Defensive: Ensure user id is a valid ObjectId
    const userIdStr = session.user.id
    if (!isValidObjectId(userIdStr)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid user ID"
      }, { status: 400 })
    }

    const months = parseInt((searchParams.get?.('months') ?? searchParams.get('months') ?? '12')) // Default to 12 months

    let rawClient: unknown
    try {
      // Race with timeout for MongoDB
      rawClient = await Promise.race([
        clientPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB connection timed out")), 6000))
      ])
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      console.error("Database error: ", err)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Internal server error"
      }, { status: 500 })
    }

    // Lint fix: explicitly type the client after checking
    let client: MongoClient
    if (rawClient instanceof MongoClient) {
      client = rawClient
    } else if (typeof rawClient === "object" && rawClient !== null && "db" in rawClient) {
      client = rawClient as MongoClient
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Database connection error"
      }, { status: 500 })
    }

    const db = client.db('entrepreneur-tracker')
    let userId: ObjectId
    try {
      userId = new ObjectId(userIdStr)
    } catch (err: any) {
      if (
        err?.name === "BSONError" ||
        (typeof err?.message === "string" && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      throw err
    }

    // Calculate the start date (X months ago)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1) // Start from the first day of the month
    startDate.setHours(0, 0, 0, 0)

    let salesTrendsData: any[] = []
    try {
      salesTrendsData = await db.collection('sales').aggregate([
        {
          $match: {
            userId: userId,
            saleDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' }
            },
            totalRevenue: { $sum: '$totalSales' },
            totalProfit: { $sum: '$totalProfit' },
            totalExpenses: { $sum: '$saleExpenses' },
            totalCOGS: { $sum: '$totalCogs' },
            salesCount: { $sum: 1 },
            totalUnits: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$items', null] }, { $isArray: '$items' }] },
                  { $sum: '$items.quantity' },
                  { $ifNull: ['$quantity', 0] }
                ]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]).toArray()
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

    let user: any = null
    try {
      user = await db.collection('users').findOne({ _id: userId })
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "BSONError" ||
        (typeof message === "string" && message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      throw err
    }
    const saleRelatedCategories = user?.settings?.saleRelatedExpenseCategories || [
      'Shipping & Delivery',
      'Payment Processing', 
      'Taxes & Fees',
      'Marketing & Advertising',
      'Packaging',
      'Commission & Referral',
      'Returns & Refunds',
      'Other'
    ]

    let expensesTrendsData: any[] = []
    try {
      expensesTrendsData = await db.collection('expenses').aggregate([
        {
          $match: {
            userId: userId,
            expenseDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' }
            },
            totalExpenses: { $sum: '$amount' },
            expenseCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]).toArray()
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

    let productTrendsData: any[] = []
    try {
      productTrendsData = await db.collection('sales').aggregate([
        {
          $match: {
            userId: userId,
            saleDate: { $gte: startDate }
          }
        },
        {
          $addFields: {
            normalizedItems: {
              $cond: [
                { $and: [{ $ne: ['$items', null] }, { $isArray: '$items' }] },
                '$items',
                [{
                  productId: '$productId',
                  productName: '$productName',
                  quantity: '$quantity',
                  unitSalePrice: '$unitSalePrice',
                  lineTotal: { $multiply: [{ $ifNull: ['$quantity', 0] }, { $ifNull: ['$unitSalePrice', 0] }] }
                }]
              ]
            }
          }
        },
        {
          $unwind: '$normalizedItems'
        },
        {
          $group: {
            _id: {
              productId: '$normalizedItems.productId',
              productName: '$normalizedItems.productName',
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' }
            },
            totalQuantity: { $sum: '$normalizedItems.quantity' },
            totalRevenue: { $sum: '$normalizedItems.lineTotal' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]).toArray()
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

    let inventoryData: any[] = []
    try {
      inventoryData = await db.collection('products').aggregate([
        {
          $match: {
            userId: userId
          }
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalInventoryValue: { 
              $sum: { 
                $multiply: [
                  { $ifNull: ['$currentStock', 0] }, 
                  { $ifNull: ['$costPrice', 0] }
                ] 
              }
            },
            lowStockProducts: {
              $sum: {
                $cond: [
                  { $lte: [{ $ifNull: ['$currentStock', 0] }, 5] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray()
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      throw err
    }

    const trendData = {
      salesTrends: salesTrendsData.map(item => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        year: item._id.year,
        month: item._id.month,
        totalRevenue: item.totalRevenue || 0,
        totalProfit: item.totalProfit || 0,
        totalExpenses: item.totalExpenses || 0,
        totalCOGS: item.totalCOGS || 0,
        salesCount: item.salesCount || 0,
        totalUnits: item.totalUnits || 0,
        averageOrderValue: item.salesCount > 0 ? (item.totalRevenue / item.salesCount) : 0,
        profitMargin: item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100) : 0
      })),
      expensesTrends: expensesTrendsData.map(item => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        year: item._id.year,
        month: item._id.month,
        totalExpenses: item.totalExpenses || 0,
        expenseCount: item.expenseCount || 0
      })),
      productTrends: productTrendsData.map(item => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        year: item._id.year,
        month: item._id.month,
        productId: item._id.productId,
        productName: item._id.productName,
        totalQuantity: item.totalQuantity || 0,
        totalRevenue: item.totalRevenue || 0
      })),
      inventory: inventoryData[0] || {
        totalProducts: 0,
        totalInventoryValue: 0,
        lowStockProducts: 0
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: trendData
    })
    
  } catch (error: any) {
    const name = error?.name
    const message = error?.message

    // Mongo server selection error (DB connection unavailable)
    if (
      name === "MongoServerSelectionError" ||
      (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
    ) {
      console.error("MongoDB connection error: ", error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Cannot connect to database. Please try again later."
      }, { status: 503 })
    }
    // BSON error (invalid ObjectId)
    if (
      name === "BSONError" ||
      (typeof message === "string" && message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
    ) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid user ID"
      }, { status: 400 })
    }

    // Fallback: unknown error
    console.error("Error fetching trends data:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 