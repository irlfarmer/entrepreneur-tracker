"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { formatCurrency } from "@/lib/utils"
import { useBusiness } from "@/context/BusinessContext"
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,
    BuildingOfficeIcon,
    CalendarDaysIcon,
    ChevronUpIcon,
    ChevronDownIcon
} from "@heroicons/react/24/outline"

interface BusinessMetrics {
    businessId: string
    businessName: string
    currency: string
    today: { revenue: number; profit: number; count: number }
    week: { revenue: number; profit: number; count: number }
    month: { revenue: number; profit: number; count: number }
}

interface OverviewData {
    salesByBusiness: BusinessMetrics[]
    expensesByBusiness: Array<{
        businessId: string
        businessName: string
        currency: string
        today: number
        week: number
        month: number
    }>
    businessCount: number
}

export default function BusinessOverview() {
    const { data: session } = useSession()
    const { currentBusiness, getBusinessSettings } = useBusiness()
    const [data, setData] = useState<OverviewData | null>(null)
    const [exchangeRates, setExchangeRates] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month')
    const [isExpanded, setIsExpanded] = useState(false)

    const targetCurrency = getBusinessSettings(currentBusiness.id).currency || 'USD'

    useEffect(() => {
        if (session?.user?.id) {
            fetchOverviewAndRates()
        }
    }, [session?.user?.id])

    const fetchOverviewAndRates = async () => {
        setLoading(true)
        try {
            const [overviewRes, ratesRes] = await Promise.all([
                fetch('/api/dashboard/overview'),
                fetch('/api/exchange-rates')
            ])

            const overviewResult = await overviewRes.json()
            if (overviewResult.success) {
                setData(overviewResult.data)
            }

            const ratesResult = await ratesRes.json()
            if (ratesResult.success) {
                setExchangeRates(ratesResult.data)
            }

        } catch (error) {
            console.error('Error fetching overview data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !exchangeRates) {
        return (
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    if (!data) return null

    const convert = (amount: number, fromCurrency: string) => {
        const from = fromCurrency.toLowerCase();
        const to = targetCurrency.toLowerCase();

        if (from === to) {
            return amount;
        }

        // All rates are vs USD, so USD is our pivot currency.
        const fromRate = exchangeRates[from]; // Rate of fromCurrency per 1 USD
        const toRate = exchangeRates[to];     // Rate of targetCurrency per 1 USD

        if (!fromRate || !toRate) {
            console.warn(`Exchange rate not found for ${from} or ${to}`);
            return 0; // or handle error more gracefully
        }

        // 1. Convert original amount to USD
        const amountInUsd = amount / fromRate;

        // 2. Convert from USD to the target currency
        const convertedAmount = amountInUsd * toRate;

        return convertedAmount;
    }

    const totals = data.salesByBusiness.reduce((acc, business) => {
        const sales = business[selectedPeriod]
        const expensesData = data.expensesByBusiness.find(e => e.businessId === business.businessId)
        const expenses = expensesData ? expensesData[selectedPeriod] : 0

        acc.revenue += convert(sales.revenue, business.currency)
        acc.profit += convert(sales.profit, business.currency)
        acc.salesCount += sales.count
        acc.expenses += convert(expenses, business.currency)

        return acc
    }, { revenue: 0, profit: 0, salesCount: 0, expenses: 0 })

    const netProfit = totals.profit - totals.expenses

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-bold text-gray-900">All Businesses Overview</h2>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? (
                                    <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                                ) : (
                                    <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                                )}
                            </button>
                        </div>
                        <p className="text-sm text-gray-600">{data.businessCount} business{data.businessCount !== 1 ? 'es' : ''} total</p>
                    </div>
                </div>

                {/* Period Selector */}
                {isExpanded && (
                    <div className="flex rounded-lg border border-gray-300 bg-white p-1">
                        <button
                            onClick={() => setSelectedPeriod('today')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'today'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('week')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'week'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('month')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedPeriod === 'month'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Month
                        </button>
                    </div>
                )}
            </div>

            {/* Content - Only show when expanded */}
            {isExpanded && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Revenue</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(totals.revenue, targetCurrency)}
                                    </p>
                                </div>
                                <CurrencyDollarIcon className="h-8 w-8 text-green-600 opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Gross Profit</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(totals.profit, targetCurrency)}
                                    </p>
                                </div>
                                <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600 opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Expenses</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatCurrency(totals.expenses, targetCurrency)}
                                    </p>
                                </div>
                                <ChartBarIcon className="h-8 w-8 text-red-600 opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Net Profit</p>
                                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(netProfit, targetCurrency)}
                                    </p>
                                </div>
                                <CalendarDaysIcon className={`h-8 w-8 opacity-50 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                        </div>
                    </div>

                    {/* Business Breakdown */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue by Business</h3>
                        <div className="space-y-2">
                            {data.salesByBusiness
                                .map(business => ({
                                    ...business,
                                    convertedRevenue: convert(business[selectedPeriod].revenue, business.currency)
                                }))
                                .filter(b => b.convertedRevenue > 0)
                                .sort((a, b) => b.convertedRevenue - a.convertedRevenue)
                                .map((business) => {
                                    const percentage = totals.revenue > 0 ? (business.convertedRevenue / totals.revenue) * 100 : 0

                                    return (
                                        <div key={business.businessId} className="flex items-center space-x-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-700">{business.businessName}</span>
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(business.convertedRevenue, targetCurrency)}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</span>
                                                    <span className="text-xs text-gray-500">{business[selectedPeriod].count} sales</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            {data.salesByBusiness.filter(b => b[selectedPeriod].revenue > 0).length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No sales in this period</p>
                            )}
                        </div>
                    </div>

                    {/* Expenses Breakdown */}
                    {data.expensesByBusiness.some(b => convert(b[selectedPeriod], b.currency) > 0) && (
                        <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Expenses by Business</h3>
                            <div className="space-y-2">
                                {data.expensesByBusiness
                                    .map(business => ({
                                        ...business,
                                        convertedExpenses: convert(business[selectedPeriod], business.currency)
                                    }))
                                    .filter(b => b.convertedExpenses > 0)
                                    .sort((a, b) => b.convertedExpenses - a.convertedExpenses)
                                    .map((business) => {
                                        const percentage = totals.expenses > 0 ? (business.convertedExpenses / totals.expenses) * 100 : 0

                                        return (
                                            <div key={business.businessId} className="flex items-center space-x-3">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-gray-700">{business.businessName}</span>
                                                        <span className="text-sm font-semibold text-red-600">
                                                            {formatCurrency(business.convertedExpenses, targetCurrency)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-gradient-to-r from-red-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
