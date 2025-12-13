import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ApiResponse } from '@/lib/types'

const DB_NAME = 'entrepreneur-tracker'
const COLLECTIONS = {
    SALES: 'sales',
    EXPENSES: 'expenses',
    BUSINESSES: 'businesses'
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        const client = await clientPromise
        const db = client.db(DB_NAME)
        const userId = new ObjectId(session.user.id)

        // Date ranges
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        // Get user profile for business names
        const user = await db.collection('users').findOne({ _id: userId })
        const businessProfiles = user?.businessProfiles || []
        const defaultBusinessName = businessProfiles.find((p: any) => p.id === 'default')?.name || 'My Business'

        // Use business profiles from user object
        const allBusinesses = businessProfiles.map((b: any) => ({
            _id: b.id,
            name: b.name
        }))

        // Ensure 'default' is included if not present
        if (!allBusinesses.some((b: any) => b._id === 'default')) {
            allBusinesses.unshift({ _id: 'default', name: defaultBusinessName })
        }

        // Aggregate sales by business and time period
        const salesByBusiness = await Promise.all(
            allBusinesses.map(async (business: { _id: string; name: string }) => {
                const businessFilter = business._id === 'default'
                    ? { $or: [{ businessId: 'default' }, { businessId: { $exists: false } }, { businessId: null }] }
                    : { businessId: business._id }

                const [todaySales, weekSales, monthSales] = await Promise.all([
                    db.collection(COLLECTIONS.SALES).find({
                        userId,
                        ...businessFilter,
                        saleDate: { $gte: todayStart }
                    }).toArray(),
                    db.collection(COLLECTIONS.SALES).find({
                        userId,
                        ...businessFilter,
                        saleDate: { $gte: weekStart }
                    }).toArray(),
                    db.collection(COLLECTIONS.SALES).find({
                        userId,
                        ...businessFilter,
                        saleDate: { $gte: monthStart }
                    }).toArray()
                ])

                const calculateTotals = (sales: any[]) => {
                    return sales.reduce((acc, sale) => {
                        const revenue = sale.totalSales || 0
                        const profit = sale.totalProfit || 0
                        return {
                            revenue: acc.revenue + revenue,
                            profit: acc.profit + profit,
                            count: acc.count + 1
                        }
                    }, { revenue: 0, profit: 0, count: 0 })
                }

                return {
                    businessId: business._id,
                    businessName: business.name,
                    today: calculateTotals(todaySales),
                    week: calculateTotals(weekSales),
                    month: calculateTotals(monthSales)
                }
            })
        )

        // Aggregate expenses by business
        const expensesByBusiness = await Promise.all(
            allBusinesses.map(async (business: { _id: string; name: string }) => {
                const businessFilter = business._id === 'default'
                    ? { $or: [{ businessId: 'default' }, { businessId: { $exists: false } }, { businessId: null }] }
                    : { businessId: business._id }

                const [todayExpenses, weekExpenses, monthExpenses] = await Promise.all([
                    db.collection(COLLECTIONS.EXPENSES).find({
                        userId,
                        ...businessFilter,
                        expenseDate: { $gte: todayStart }
                    }).toArray(),
                    db.collection(COLLECTIONS.EXPENSES).find({
                        userId,
                        ...businessFilter,
                        expenseDate: { $gte: weekStart }
                    }).toArray(),
                    db.collection(COLLECTIONS.EXPENSES).find({
                        userId,
                        ...businessFilter,
                        expenseDate: { $gte: monthStart }
                    }).toArray()
                ])

                const calculateExpenses = (expenses: any[]) => {
                    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
                }

                return {
                    businessId: business._id,
                    businessName: business.name,
                    today: calculateExpenses(todayExpenses),
                    week: calculateExpenses(weekExpenses),
                    month: calculateExpenses(monthExpenses)
                }
            })
        )

        // Calculate totals across all businesses
        const totals = {
            today: {
                revenue: salesByBusiness.reduce((sum, b) => sum + b.today.revenue, 0),
                profit: salesByBusiness.reduce((sum, b) => sum + b.today.profit, 0),
                expenses: expensesByBusiness.reduce((sum, b) => sum + b.today, 0),
                salesCount: salesByBusiness.reduce((sum, b) => sum + b.today.count, 0)
            },
            week: {
                revenue: salesByBusiness.reduce((sum, b) => sum + b.week.revenue, 0),
                profit: salesByBusiness.reduce((sum, b) => sum + b.week.profit, 0),
                expenses: expensesByBusiness.reduce((sum, b) => sum + b.week, 0),
                salesCount: salesByBusiness.reduce((sum, b) => sum + b.week.count, 0)
            },
            month: {
                revenue: salesByBusiness.reduce((sum, b) => sum + b.month.revenue, 0),
                profit: salesByBusiness.reduce((sum, b) => sum + b.month.profit, 0),
                expenses: expensesByBusiness.reduce((sum, b) => sum + b.month, 0),
                salesCount: salesByBusiness.reduce((sum, b) => sum + b.month.count, 0)
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                totals,
                salesByBusiness,
                expensesByBusiness,
                businessCount: allBusinesses.length
            }
        })

    } catch (error) {
        console.error('Error fetching business overview:', error)
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}
