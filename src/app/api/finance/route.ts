import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

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

    // Create date filters
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

    // Get sales data with timeout
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

    // Get expense data with timeout
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

    // Get product data for categories with timeout
    const productData = await Promise.race([
      db.collection('products').find({
        userId: new ObjectId(userId)
      }).toArray(),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Product query timeout')), 5000))
    ]).catch(() => [])

    // Calculate metrics
    const totalSales = salesData.reduce((sum: number, sale: any) => sum + (sale.quantity * sale.unitSalePrice), 0)
    const totalCogs = salesData.reduce((sum: number, sale: any) => sum + (sale.quantity * sale.unitCostPrice), 0)
    const saleRelatedExpenses = salesData.reduce((sum: number, sale: any) => sum + (sale.saleExpenses || 0), 0)
    const businessExpenses = expenseData.reduce((sum: number, expense: any) => sum + expense.amount, 0)
    const grossProfit = totalSales - totalCogs - saleRelatedExpenses
    const netProfit = grossProfit - businessExpenses

    // Calculate top category
    const categoryStats = salesData.reduce((acc: any, sale: any) => {
      const product = productData.find(p => p._id.toString() === sale.productId.toString())
      const category = product?.category || 'Unknown'
      
      if (!acc[category]) {
        acc[category] = { revenue: 0, profit: 0, cogs: 0 }
      }
      
      const saleRevenue = sale.quantity * sale.unitSalePrice
      const saleCogs = sale.quantity * sale.unitCostPrice
      const saleExpenses = sale.saleExpenses || 0
      
      acc[category].revenue += saleRevenue
      acc[category].cogs += saleCogs
      acc[category].profit += (saleRevenue - saleCogs - saleExpenses)
      
      return acc
    }, {} as Record<string, { revenue: number; profit: number; cogs: number }>)

    const topCategory = Object.entries(categoryStats)
      .sort(([,a], [,b]) => (b as any).revenue - (a as any).revenue)[0]

    // Calculate top product
    const productStats = salesData.reduce((acc: any, sale: any) => {
      const product = productData.find(p => p._id.toString() === sale.productId.toString())
      const productId = sale.productId.toString()
      const productName = product?.name || sale.productName || 'Unknown Product'
      
      if (!acc[productId]) {
        acc[productId] = { name: productName, revenue: 0, profit: 0, cogs: 0, quantity: 0 }
      }
      
      const saleRevenue = sale.quantity * sale.unitSalePrice
      const saleCogs = sale.quantity * sale.unitCostPrice
      const saleExpenses = sale.saleExpenses || 0
      
      acc[productId].revenue += saleRevenue
      acc[productId].cogs += saleCogs
      acc[productId].profit += (saleRevenue - saleCogs - saleExpenses)
      acc[productId].quantity += sale.quantity
      
      return acc
    }, {} as Record<string, { name: string; revenue: number; profit: number; cogs: number; quantity: number }>)

    const topProduct = Object.entries(productStats)
      .sort(([,a], [,b]) => (b as any).revenue - (a as any).revenue)[0]

    // Calculate monthly data for trends
    const monthlyData = []
    const monthsToShow = viewType === 'yearly' ? 12 : 6 // Show 6 months for monthly view, 12 for yearly

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)

      const monthSales = salesData.filter(sale => {
        const saleDate = new Date(sale.saleDate)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      const monthExpenses = expenseData.filter(expense => {
        const expenseDate = new Date(expense.expenseDate)
        return expenseDate >= monthStart && expenseDate <= monthEnd
      })

      const monthTotalSales = monthSales.reduce((sum, sale) => sum + (sale.quantity * sale.unitSalePrice), 0)
      const monthTotalCogs = monthSales.reduce((sum, sale) => sum + (sale.quantity * sale.unitCostPrice), 0)
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
        revenue: (topCategory[1] as any).revenue,
        profit: (topCategory[1] as any).profit
      } : null,
      topProduct: topProduct ? {
        name: (topProduct[1] as any).name,
        revenue: (topProduct[1] as any).revenue,
        profit: (topProduct[1] as any).profit,
        quantity: (topProduct[1] as any).quantity
      } : null,
      monthlyData
    }

    return NextResponse.json({ success: true, data: financeData })
  } catch (error) {
    console.error('Error fetching finance data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 