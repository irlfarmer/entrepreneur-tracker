import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSaleQuantity, getSaleRevenue, getSaleProfit } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const viewType = searchParams.get('viewType') || 'monthly'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('entrepreneur-tracker')

    // Check if user has any data first to avoid unnecessary queries
    const hasAnyData = await Promise.race([
      db.collection('sales').countDocuments({ userId: new ObjectId(userId) }, { limit: 1 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]).catch(() => 0)

    // If no data exists, return empty finance data immediately
    if (hasAnyData === 0) {
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

    // Get sales data for current period (main metrics) with timeout
    const salesData = await Promise.race([
      db.collection('sales').find({
        userId: new ObjectId(userId),
        saleDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Sales query timeout')), 5000))
    ]).catch(() => [])

    // Get expense data for current period (main metrics) with timeout
    const expenseData = await Promise.race([
      db.collection('expenses').find({
        userId: new ObjectId(userId),
        expenseDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Expense query timeout')), 5000))
    ]).catch(() => [])

    // Get broader data for monthly trends
    const monthsToShow = viewType === 'yearly' ? 12 : 6
    const trendStartDate = new Date(currentYear, currentMonth - (monthsToShow - 1), 1)
    const trendEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

    // Get sales data for trends with timeout
    const trendSalesData = await Promise.race([
      db.collection('sales').find({
        userId: new ObjectId(userId),
        saleDate: {
          $gte: trendStartDate,
          $lte: trendEndDate
        }
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Trend sales query timeout')), 5000))
    ]).catch(() => [])

    // Get expense data for trends with timeout
    const trendExpenseData = await Promise.race([
      db.collection('expenses').find({
        userId: new ObjectId(userId),
        expenseDate: {
          $gte: trendStartDate,
          $lte: trendEndDate
        }
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Trend expense query timeout')), 5000))
    ]).catch(() => [])

    // Get product data for categories with timeout
    const productData = await Promise.race([
      db.collection('products').find({
        userId: new ObjectId(userId)
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Product query timeout')), 5000))
    ]).catch(() => [])

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
          const product = productData.find(p => p._id.toString() === item.productId.toString())
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
        const product = productData.find(p => p._id.toString() === sale.productId?.toString())
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
      .sort(([,a], [,b]) => b.revenue - a.revenue)[0]

    // Calculate top product (simplified)
    const productStats: Record<string, { name: string; revenue: number; profit: number; cogs: number; quantity: number }> = {}
    
    salesData.forEach((sale: any) => {
      if (sale.items && sale.items.length > 0) {
        // Multi-product sale
        sale.items.forEach((item: any) => {
          const productId = item.productId.toString()
          const productName = item.productName || 'Unknown Product'
          
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
      .sort(([,a], [,b]) => b.revenue - a.revenue)[0]

    // Calculate monthly data for trends using broader data
    const monthlyData = []

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)

      const monthSales = trendSalesData.filter(sale => {
        const saleDate = new Date(sale.saleDate)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      const monthExpenses = trendExpenseData.filter(expense => {
        const expenseDate = new Date(expense.expenseDate)
        return expenseDate >= monthStart && expenseDate <= monthEnd
      })

      const monthTotalSales = monthSales.reduce((sum, sale) => sum + getSaleRevenue(sale), 0)
      const monthTotalCogs = monthSales.reduce((sum, sale) => {
        if (sale.totalCogs !== undefined) {
          return sum + sale.totalCogs
        }
        if (sale.items && sale.items.length > 0) {
          return sum + sale.items.reduce((itemSum: number, item: any) => 
            itemSum + ((item.quantity || 0) * (item.unitCostPrice || 0)), 0)
        }
        return sum + ((sale.quantity || 0) * (sale.unitCostPrice || 0))
      }, 0)
      const monthSaleExpenses = monthSales.reduce((sum, sale) => sum + (sale.saleExpenses || 0), 0)
      const monthBusinessExpenses = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
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
  } catch (error) {
    console.error('Error fetching finance data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 