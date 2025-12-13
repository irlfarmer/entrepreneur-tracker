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

        // Get user profile for business names and settings
        const user = await db.collection('users').findOne({ _id: userId })
        const businessProfiles = user?.businessProfiles || []

        // Map business profiles to include currency
        const allBusinesses: { _id: string; name: string; currency: string }[] = businessProfiles.map((b: any) => ({
            _id: b.id,
            name: b.name,
            currency: b.settings?.currency || 'USD' // Default to USD if not set
        }))

        // Ensure 'default' is included if not present
        if (!allBusinesses.some((b: any) => b._id === 'default')) {
            const defaultProfile = businessProfiles.find((p: any) => p.id === 'default');
            allBusinesses.unshift({ 
                _id: 'default', 
                name: defaultProfile?.name || 'My Business',
                currency: defaultProfile?.settings?.currency || user?.settings?.currency || 'USD'
            })
        }

        // Aggregate sales by business and time period
        const salesByBusiness = await Promise.all(
            allBusinesses.map(async (business) => {
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
                    currency: business.currency,
                    today: calculateTotals(todaySales),
                    week: calculateTotals(weekSales),
                    month: calculateTotals(monthSales)
                }
            })
        )

        // Aggregate expenses by business
        const expensesByBusiness = await Promise.all(
            allBusinesses.map(async (business) => {
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
                    currency: business.currency,
                    today: calculateExpenses(todayExpenses),
                    week: calculateExpenses(weekExpenses),
                    month: calculateExpenses(monthExpenses)
                }
            })
        )


        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
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
