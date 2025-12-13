"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import {
    BriefcaseIcon,
    CurrencyDollarIcon,
    TagIcon,
    ClockIcon
} from "@heroicons/react/24/outline"

interface ServiceStatsProps {
    userId: string
    searchParams?: {
        search?: string
    }
}

export default function ServiceStats({ userId, searchParams }: ServiceStatsProps) {
    const { code: currencyCode, loading: currencyLoading } = useCurrency()
    const { currentBusiness } = useBusiness()
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userId && currentBusiness?.id) {
            fetchServices()
        }
    }, [userId, currentBusiness?.id])

    const fetchServices = async () => {
        try {
            const response = await fetch(`/api/services?businessId=${currentBusiness.id}`)
            const data = await response.json()
            if (data.success) {
                setServices(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching services:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || currencyLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        )
    }

    // Filter based on searchParams if needed, though usually stats are global or filtered. 
    // InventoryStats applies filters. Let's do the same.
    let filteredServices = services
    if (searchParams?.search) {
        const lower = searchParams.search.toLowerCase()
        filteredServices = services.filter(s => s.name.toLowerCase().includes(lower))
    }

    const totalServices = filteredServices.length

    // Avg Price
    const totalPrice = filteredServices.reduce((sum, s) => sum + (s.price || 0), 0)
    const avgPrice = totalServices > 0 ? totalPrice / totalServices : 0

    // Highest Price
    const highestPrice = filteredServices.length > 0 ? Math.max(...filteredServices.map(s => s.price || 0)) : 0

    // Lowest Price or Newest? Let's do Newest.
    // Actually "Lowest Price" completes the pricing stats.
    const lowestPrice = filteredServices.length > 0 ? Math.min(...filteredServices.map(s => s.price || 0)) : 0

    const stats = [
        {
            title: "Total Services",
            value: totalServices.toString(),
            subtitle: "Active Offerings",
            icon: BriefcaseIcon,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            title: "Average Price",
            value: formatCurrency(avgPrice, currencyCode),
            subtitle: "Per Service",
            icon: CurrencyDollarIcon,
            color: "text-green-600",
            bgColor: "bg-green-50"
        },
        {
            title: "Highest Price",
            value: formatCurrency(highestPrice, currencyCode),
            subtitle: "Premium Offering",
            icon: TagIcon,
            color: "text-purple-600",
            bgColor: "bg-purple-50"
        },
        {
            title: "Lowest Price",
            value: formatCurrency(lowestPrice, currencyCode),
            subtitle: "Entry Level",
            icon: TagIcon,
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div key={stat.title} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
                            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                            <p className="text-xs text-gray-600 mt-1">{stat.subtitle}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
