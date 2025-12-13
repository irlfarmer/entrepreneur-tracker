import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Sale } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Alternative classNames function for conditional CSS classes
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Format date
export function formatDate(date: Date | string, format: 'short' | 'long' | 'medium' = 'medium'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const optionsMap = {
    short: { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions,
    medium: { month: 'short', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as Intl.DateTimeFormatOptions
  }

  return dateObj.toLocaleDateString('en-US', optionsMap[format])
}

// Calculate profit percentage
export function calculateProfitMargin(salePrice: number, costPrice: number): number {
  if (costPrice === 0) return 0
  return ((salePrice - costPrice) / costPrice) * 100
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Serialize MongoDB objects to plain JavaScript objects
 * Converts ObjectId instances to strings and handles nested objects
 */
export function serializeMongoObject<T extends Record<string, any>>(obj: T): any {
  if (!obj) return obj

  const serialized: any = {}

  for (const key in obj) {
    const value = obj[key]

    if (value && typeof value === 'object') {
      // Handle ObjectId
      if (value.toString && typeof value.toString === 'function' && value._bsontype === 'ObjectId') {
        serialized[key] = value.toString()
      }
      // Handle Date objects
      else if (Object.prototype.toString.call(value) === '[object Date]') {
        serialized[key] = (value as Date).toISOString()
      }
      // Handle nested objects
      else if (value.constructor === Object) {
        serialized[key] = serializeMongoObject(value)
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        serialized[key] = value.map((item: any) =>
          item && typeof item === 'object' ? serializeMongoObject(item) : item
        )
      }
      // Handle other objects
      else {
        serialized[key] = value
      }
    } else {
      serialized[key] = value
    }
  }

  return serialized
}

// Sale utilities for handling both legacy and multi-product sales
export function getSaleQuantity(sale: any): number {
  if (sale.items && sale.items.length > 0) {
    // Multi-product sale
    return sale.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
  }
  // Legacy single-product sale
  return sale.quantity || 0
}

export function getSaleRevenue(sale: any): number {
  if (sale.totalSales !== undefined) {
    // Multi-product sale with calculated total
    return sale.totalSales
  }
  if (sale.items && sale.items.length > 0) {
    // Multi-product sale without pre-calculated total
    return sale.items.reduce((sum: number, item: any) =>
      sum + ((item.quantity || 0) * (item.unitSalePrice || 0)), 0)
  }
  // Legacy single-product sale
  return (sale.quantity || 0) * (sale.unitSalePrice || 0)
}

export function getSaleProfit(sale: any): number {
  return sale.totalProfit || 0
}

export function getSaleProductName(sale: any): string {
  if (sale.items && sale.items.length > 0) {
    if (sale.items.length === 1) {
      return sale.items[0].name || sale.items[0].productName || 'Unknown Product'
    }
    return `Multi-product sale (${sale.items.length} items)`
  }
  return sale.productName || 'Unknown Product'
}

export function getSaleProductNames(sale: any): string[] {
  if (sale.items && sale.items.length > 0) {
    return sale.items.map((item: any) => item.name || item.productName || 'Unknown Product')
  }
  return [sale.productName || 'Unknown Product']
}

export function isSingleProductSale(sale: any): boolean {
  if (sale.items && sale.items.length > 0) {
    return sale.items.length === 1
  }
  return true // Legacy sales are always single product
}

export function isMultiProductSale(sale: any): boolean {
  return sale.items && sale.items.length > 1
} 