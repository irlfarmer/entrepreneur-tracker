"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"

interface BusinessSettings {
    currency: string
    timezone: string
    enabledFields: string[]
    lowStockThreshold: number
    profileImage?: string
    customExpenseCategories: string[]
    customProductCategories: string[]
    customProductFields: { name: string; type: 'text' | 'number' | 'select'; options?: string[] }[]
    saleRelatedExpenseCategories: string[]
}

export interface BusinessProfile {
    id: string
    name: string
    settings?: BusinessSettings
}

interface BusinessContextType {
    currentBusiness: BusinessProfile
    availableBusinesses: BusinessProfile[]
    switchBusiness: (businessId: string) => void
    addBusiness: (name: string) => void
    isLoading: boolean
    getBusinessSettings: (businessId?: string) => BusinessSettings
}

const defaultSettings: BusinessSettings = {
    currency: "USD",
    timezone: "UTC",
    enabledFields: ["category", "type", "size", "color"],
    lowStockThreshold: 3,
    customExpenseCategories: [],
    customProductCategories: [],
    customProductFields: [],
    saleRelatedExpenseCategories: []
}

const defaultBusiness: BusinessProfile = { id: 'default', name: 'Main Business', settings: defaultSettings }

const BusinessContext = createContext<BusinessContextType>({
    currentBusiness: defaultBusiness,
    availableBusinesses: [defaultBusiness],
    switchBusiness: () => { },
    addBusiness: () => { },
    isLoading: true,
    getBusinessSettings: () => defaultSettings
})

export function BusinessProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession()
    const [currentBusiness, setCurrentBusiness] = useState<BusinessProfile>(defaultBusiness)
    const [availableBusinesses, setAvailableBusinesses] = useState<BusinessProfile[]>([defaultBusiness])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            if (session?.user) {
                try {
                    const response = await fetch('/api/user/profile')
                    const data = await response.json()

                    if (data.success && data.data) {
                        const { businessProfiles, activeBusinessId } = data.data

                        // Set available businesses
                        if (businessProfiles && businessProfiles.length > 0) {
                            setAvailableBusinesses(businessProfiles)
                        } else {
                            // If no profiles in DB, ensure we have at least the default
                            setAvailableBusinesses([defaultBusiness])
                        }

                        // Set active business
                        if (activeBusinessId) {
                            const profiles = businessProfiles || [defaultBusiness]
                            const found = profiles.find((b: BusinessProfile) => b.id === activeBusinessId)
                            if (found) {
                                setCurrentBusiness(found)
                            } else {
                                // Fallback to first available or default
                                setCurrentBusiness(profiles[0] || defaultBusiness)
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile", error)
                }
            }
            setIsLoading(false)
        }

        init()
    }, [session])

    const switchBusiness = async (businessId: string) => {
        const business = availableBusinesses.find(b => b.id === businessId)
        if (business) {
            setCurrentBusiness(business) // Optimistic update

            try {
                await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activeBusinessId: businessId })
                })
            } catch (e) {
                console.error("Failed to save active business preference", e)
            }

            window.location.href = '/dashboard' // Force refresh to re-fetch data with new ID
        }
    }

    const addBusiness = async (name: string) => {
        const newBusiness: BusinessProfile = {
            id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 9),
            name,
            settings: { ...defaultSettings } // Initialize with clean defaults
        }
        const updatedProfiles = [...availableBusinesses, newBusiness]

        setAvailableBusinesses(updatedProfiles) // Optimistic update

        try {
            await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessProfiles: updatedProfiles,
                    activeBusinessId: newBusiness.id
                })
            })

            switchBusiness(newBusiness.id)
        } catch (e) {
            console.error("Failed to save new business profile", e)
            // Revert state if needed, but for now simple logging
        }
    }

    const getBusinessSettings = (businessId?: string): BusinessSettings => {
        const id = businessId || currentBusiness.id
        const business = availableBusinesses.find(b => b.id === id)
        // Fallback to current business settings if id not found, or default settings
        return business?.settings || defaultSettings
    }

    return (
        <BusinessContext.Provider value={{
            currentBusiness,
            availableBusinesses,
            switchBusiness,
            addBusiness,
            isLoading,
            getBusinessSettings
        }}>
            {children}
        </BusinessContext.Provider>
    )
}

export const useBusiness = () => useContext(BusinessContext)
