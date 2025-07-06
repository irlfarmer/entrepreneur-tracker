import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { ApiResponse } from "@/lib/types"

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
    const months = parseInt(searchParams.get('months') || '12') // Default to 12 months

    const client = await clientPromise
    const db = client.db('entrepreneur-tracker')
    const userId = new ObjectId(session.user.id)

    // Calculate the start date (X months ago)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1) // Start from the first day of the month
    startDate.setHours(0, 0, 0, 0)

    // Sales trends aggregation
    const salesTrendsData = await db.collection('sales').aggregate([
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

    // Get user's sale-related expense categories
    const user = await db.collection('users').findOne({ _id: userId })
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

    // Expenses trends aggregation (all expenses, no filtering)
    const expensesTrendsData = await db.collection('expenses').aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray()

    // Product trends aggregation (top selling products)
    const productTrendsData = await db.collection('sales').aggregate([
      {
        $match: {
          userId: userId,
          saleDate: { $gte: startDate }
        }
      },
      {
        $addFields: {
          // Convert both single and multi-product sales to a unified format
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

    // Current inventory levels
    const inventoryData = await db.collection('products').aggregate([
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

    // Format the response
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

  } catch (error) {
    console.error("Error fetching trends data:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 