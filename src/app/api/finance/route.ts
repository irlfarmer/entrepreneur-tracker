import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId, MongoClient } from 'mongodb'
import { getSaleQuantity, getSaleRevenue, getSaleProfit } from '@/lib/utils'

// Helper function to validate a MongoDB ObjectId string
function isValidObjectId(id: string): boolean {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

// Safe getter for error.name or error.message, always returns string or undefined
function getErrorProperty(err: unknown, key: 'name' | 'message'): string | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    Object.prototype.hasOwnProperty.call(err, key)
  ) {
    const val = (err as Record<string, unknown>)[key]
    return typeof val === 'string' ? val : undefined
  }
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await the dynamic API for searchParams (Next.js 15 compatibility)
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const viewType = searchParams.get('viewType') || 'monthly'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!isValidObjectId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    let client: MongoClient
    try {
      const waited = await Promise.race([
        clientPromise as Promise<MongoClient>,
        new Promise<MongoClient>((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timed out')), 5000)
        )
      ])
      client = waited
    } catch (dbErr: unknown) {
      console.error('MongoDB connection error:', dbErr)
      return NextResponse.json({ error: 'Database unavailable or timed out' }, { status: 503 })
    }

    const db = client.db('entrepreneur-tracker')

    // Check if user has any data first to avoid unnecessary queries
    let hasAnyData: number = 0
    try {
      const result = await Promise.race([
        db.collection('sales').countDocuments({ userId: new ObjectId(userId) }, { limit: 1 }),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ])
      hasAnyData = typeof result === "number" ? result : 0
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // If no data exists, return empty finance data immediately
    if (!hasAnyData || hasAnyData === 0) {
      const emptyFinanceData = {
        totalSales: 0,
        totalCogs: 0,
        saleRelatedExpenses: 0,
        businessExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        topCategory: null,
        topProduct: null,
        monthlyData: []
      }
      return NextResponse.json({ success: true, data: emptyFinanceData })
    }

    // Create date filters for current period (main metrics)
    const currentYear = year ? parseInt(year) : new Date().getFullYear()
    const currentMonth = month ? parseInt(month) : new Date().getMonth()

    let startDate: Date
    let endDate: Date

    if (viewType === 'yearly') {
      startDate = new Date(currentYear, 0, 1)
      endDate = new Date(currentYear, 11, 31, 23, 59, 59)
    } else {
      startDate = new Date(currentYear, currentMonth, 1)
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    }

    let salesData: any[] = []
    try {
      const result = await Promise.race([
        db.collection('sales').find({
          userId: new ObjectId(userId),
          saleDate: {
            $gte: startDate,
            $lte: endDate
          }
        }).toArray(),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Sales query timeout')), 5000)
        )
      ])
      salesData = Array.isArray(result) ? result : []
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out (sales)' }, { status: 503 })
      }
      salesData = []
    }

    let expenseData: any[] = []
    try {
      const result = await Promise.race([
        db.collection('expenses').find({
          userId: new ObjectId(userId),
          expenseDate: {
            $gte: startDate,
            $lte: endDate
          }
        }).toArray(),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Expense query timeout')), 5000)
        )
      ])
      expenseData = Array.isArray(result) ? result : []
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out (expenses)' }, { status: 503 })
      }
      expenseData = []
    }

    // Get broader data for monthly trends
    const monthsToShow = viewType === 'yearly' ? 12 : 6
    const trendStartDate = new Date(currentYear, currentMonth - (monthsToShow - 1), 1)
    const trendEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

    let trendSalesData: any[] = []
    try {
      const result = await Promise.race([
        db.collection('sales').find({
          userId: new ObjectId(userId),
          saleDate: {
            $gte: trendStartDate,
            $lte: trendEndDate
          }
        }).toArray(),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Trend sales query timeout')), 5000)
        )
      ])
      trendSalesData = Array.isArray(result) ? result : []
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out (trend sales)' }, { status: 503 })
      }
      trendSalesData = []
    }

    let trendExpenseData: any[] = []
    try {
      const result = await Promise.race([
        db.collection('expenses').find({
          userId: new ObjectId(userId),
          expenseDate: {
            $gte: trendStartDate,
            $lte: trendEndDate
          }
        }).toArray(),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Trend expense query timeout')), 5000)
        )
      ])
      trendExpenseData = Array.isArray(result) ? result : []
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out (trend expenses)' }, { status: 503 })
      }
      trendExpenseData = []
    }

    let productData: any[] = []
    try {
      const result = await Promise.race([
        db.collection('products').find({
          userId: new ObjectId(userId)
        }).toArray(),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Product query timeout')), 5000)
        )
      ])
      productData = Array.isArray(result) ? result : []
    } catch (err) {
      const name = getErrorProperty(err, 'name')
      const message = getErrorProperty(err, 'message')
      if (
        name === 'BSONError' ||
        (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
      ) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      if (
        name === 'MongoServerSelectionError' ||
        (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
      ) {
        return NextResponse.json({ error: 'Database unavailable or timed out (products)' }, { status: 503 })
      }
      productData = []
    }

    // Calculate metrics for current period using utility functions
    const totalSales = salesData.reduce((sum: number, sale: any) => sum + getSaleRevenue(sale), 0)
    const totalCogs = salesData.reduce((sum: number, sale: any) => {
      if (sale.totalCogs !== undefined) {
        return sum + sale.totalCogs
      }
      if (sale.items && sale.items.length > 0) {
        return sum + sale.items.reduce((itemSum: number, item: any) =>
          itemSum + ((item.quantity || 0) * (item.unitCostPrice || 0)), 0)
      }
      return sum + ((sale.quantity || 0) * (sale.unitCostPrice || 0))
    }, 0)
    const saleRelatedExpenses = salesData.reduce((sum: number, sale: any) => sum + (sale.saleExpenses || 0), 0)
    const businessExpenses = expenseData.reduce((sum: number, expense: any) => sum + expense.amount, 0)
    const grossProfit = totalSales - totalCogs - saleRelatedExpenses
    const netProfit = grossProfit - businessExpenses

    // Calculate top category (simplified for both sale types)
    const categoryStats: Record<string, { revenue: number; profit: number; cogs: number }> = {}

    salesData.forEach((sale: any) => {
      if (sale.items && sale.items.length > 0) {
        // Multi-product sale
        sale.items.forEach((item: any) => {
          const product = productData.find((p: any) => p._id.toString() === item.productId?.toString())
          const category = product?.category || 'Unknown'

          if (!categoryStats[category]) {
            categoryStats[category] = { revenue: 0, profit: 0, cogs: 0 }
          }

          const itemRevenue = (item.quantity || 0) * (item.unitSalePrice || 0)
          const itemCogs = (item.quantity || 0) * (item.unitCostPrice || 0)

          categoryStats[category].revenue += itemRevenue
          categoryStats[category].cogs += itemCogs
          categoryStats[category].profit += (itemRevenue - itemCogs)
        })
      } else {
        // Legacy single-product sale
        const product = productData.find((p: any) => p._id.toString() === sale.productId?.toString())
        const category = product?.category || 'Unknown'

        if (!categoryStats[category]) {
          categoryStats[category] = { revenue: 0, profit: 0, cogs: 0 }
        }

        const saleRevenue = getSaleRevenue(sale)
        const saleCogs = (sale.quantity || 0) * (sale.unitCostPrice || 0)

        categoryStats[category].revenue += saleRevenue
        categoryStats[category].cogs += saleCogs
        categoryStats[category].profit += (saleRevenue - saleCogs)
      }
    })

    const topCategory = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)[0]

    // Calculate top product (simplified)
    const productStats: Record<string, { name: string; revenue: number; profit: number; cogs: number; quantity: number }> = {}

    salesData.forEach((sale: any) => {
      if (sale.items && sale.items.length > 0) {
        // Multi-product sale
        sale.items.forEach((item: any) => {
          const productId = item.productId?.toString()
          const productName = item.productName || 'Unknown Product'

          if (!productId) return

          if (!productStats[productId]) {
            productStats[productId] = { name: productName, revenue: 0, profit: 0, cogs: 0, quantity: 0 }
          }

          const itemRevenue = (item.quantity || 0) * (item.unitSalePrice || 0)
          const itemCogs = (item.quantity || 0) * (item.unitCostPrice || 0)

          productStats[productId].revenue += itemRevenue
          productStats[productId].cogs += itemCogs
          productStats[productId].profit += (itemRevenue - itemCogs)
          productStats[productId].quantity += (item.quantity || 0)
        })
      } else {
        // Legacy single-product sale
        const productId = sale.productId?.toString()
        if (productId) {
          const productName = sale.productName || 'Unknown Product'

          if (!productStats[productId]) {
            productStats[productId] = { name: productName, revenue: 0, profit: 0, cogs: 0, quantity: 0 }
          }

          const saleRevenue = getSaleRevenue(sale)
          const saleCogs = (sale.quantity || 0) * (sale.unitCostPrice || 0)

          productStats[productId].revenue += saleRevenue
          productStats[productId].cogs += saleCogs
          productStats[productId].profit += (saleRevenue - saleCogs)
          productStats[productId].quantity += getSaleQuantity(sale)
        }
      }
    })

    const topProduct = Object.entries(productStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)[0]

    // Calculate monthly data for trends using broader data
    const monthlyData = []

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)

      const monthSales = trendSalesData.filter((sale: any) => {
        const saleDate = new Date(sale.saleDate)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      const monthExpenses = trendExpenseData.filter((expense: any) => {
        const expenseDate = new Date(expense.expenseDate)
        return expenseDate >= monthStart && expenseDate <= monthEnd
      })

      const monthTotalSales = monthSales.reduce((sum: number, sale: any) => sum + getSaleRevenue(sale), 0)
      const monthTotalCogs = monthSales.reduce((sum: number, sale: any) => {
        if (sale.totalCogs !== undefined) {
          return sum + sale.totalCogs
        }
        if (sale.items && sale.items.length > 0) {
          return sum + sale.items.reduce((itemSum: number, item: any) =>
            itemSum + ((item.quantity || 0) * (item.unitCostPrice || 0)), 0)
        }
        return sum + ((sale.quantity || 0) * (sale.unitCostPrice || 0))
      }, 0)
      const monthSaleExpenses = monthSales.reduce((sum: number, sale: any) => sum + (sale.saleExpenses || 0), 0)
      const monthBusinessExpenses = monthExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0)
      const monthGrossProfit = monthTotalSales - monthTotalCogs - monthSaleExpenses
      const monthNetProfit = monthGrossProfit - monthBusinessExpenses

      monthlyData.push({
        month: (targetDate.getMonth() + 1).toString(),
        year: targetDate.getFullYear(),
        sales: monthTotalSales,
        cogs: monthTotalCogs,
        saleExpenses: monthSaleExpenses,
        businessExpenses: monthBusinessExpenses,
        grossProfit: monthGrossProfit,
        netProfit: monthNetProfit
      })
    }

    const financeData = {
      totalSales,
      totalCogs,
      saleRelatedExpenses,
      businessExpenses,
      grossProfit,
      netProfit,
      topCategory: topCategory ? {
        name: topCategory[0],
        revenue: topCategory[1].revenue,
        profit: topCategory[1].profit
      } : null,
      topProduct: topProduct ? {
        name: topProduct[1].name,
        revenue: topProduct[1].revenue,
        profit: topProduct[1].profit,
        quantity: topProduct[1].quantity
      } : null,
      monthlyData
    }

    return NextResponse.json({ success: true, data: financeData })
  } catch (error: unknown) {
    // Comprehensive error handling for MongoDB and BSON errors
    console.error('Error fetching finance data:', error)
    const name = getErrorProperty(error, 'name')
    const message = getErrorProperty(error, 'message')
    if (
      name === 'BSONError' ||
      (typeof message === 'string' && message.match(/input must be a 24 character hex string/i))
    ) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }
    if (
      name === 'MongoServerSelectionError' ||
      (typeof message === 'string' && message.toLowerCase().includes('server selection timed out'))
    ) {
      return NextResponse.json({ error: 'Database unavailable or timed out' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}