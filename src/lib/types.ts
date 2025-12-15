import { ObjectId } from 'mongodb'

// User Types
export interface BusinessSettings {
  currency: string
  timezone: string
  enabledFields: string[]
  lowStockThreshold: number
  profileImage?: string
  customExpenseCategories: string[]
  customProductCategories: string[]
  customServiceCategories: string[]
  customProductFields: { name: string; type: 'text' | 'number' | 'select'; options?: string[] }[]
  customServiceFields: { name: string; type: 'text' | 'number' | 'select'; options?: string[] }[]
  saleRelatedExpenseCategories: string[]
}

export interface BusinessProfile {
  id: string
  name: string
  settings?: BusinessSettings // Optional for backward compatibility/newly created ones before init
}

export interface User {
  _id?: ObjectId
  email: string
  password: string
  companyName: string
  businessType?: string
  profileImage?: string
  // Legacy global settings (kept for default/fallback)
  settings: BusinessSettings
  createdAt: Date
  updatedAt: Date
  businessProfiles?: BusinessProfile[]
  activeBusinessId?: string
}

// Product Types
export interface Product {
  _id?: ObjectId
  userId: ObjectId
  businessId: string
  name: string
  category: string
  type?: string
  // productType removed
  size?: string
  color?: string
  sku?: string
  costPrice: number
  salePrice: number
  currentStock: number
  customFields?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Service Types
export interface Service {
  _id?: ObjectId
  userId: ObjectId
  businessId: string
  name: string
  description?: string
  price: number
  category?: string
  customFields?: Record<string, any>
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// Serialized Service for Client Components
export interface SerializedService {
  _id?: string
  userId: string
  businessId: string
  name: string
  description?: string
  price: number
  category?: string
  customFields?: Record<string, any>
  active: boolean
  createdAt: string
  updatedAt: string
}

// Serialized Product for Client Components
export interface SerializedProduct {
  _id?: string
  userId: string
  businessId: string
  name: string
  category: string
  type?: string
  size?: string
  color?: string
  sku?: string
  costPrice: number
  salePrice: number
  currentStock: number
  customFields?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Sales Types
export interface SaleItem {
  itemId: ObjectId // Can be ProductId or ServiceId
  itemType: 'Product' | 'Service'
  name: string // Snapshot of name at time of sale
  quantity: number
  unitSalePrice: number
  unitCostPrice: number
  lineTotal: number
  lineProfit: number
  productDetails?: {
    category?: string
    type?: string
    size?: string
    color?: string
    sku?: string
    customFields?: Record<string, any>
  }
}

export interface Sale {
  _id?: ObjectId
  userId: ObjectId
  businessId: string
  // Legacy fields for backward compatibility
  productId?: ObjectId
  productName?: string
  quantity?: number
  unitSalePrice?: number
  unitCostPrice?: number
  // New multi-product fields
  items: SaleItem[]
  customerName?: string
  saleDate: Date
  saleExpenses: number
  saleExpenseDetails?: Array<{
    category: string
    amount: number
    description: string
  }>
  totalSales: number
  totalCogs: number
  totalProfit: number
  notes?: string
  createdAt: Date
}

// Expense Types
export interface Expense {
  _id?: ObjectId
  userId: ObjectId
  businessId: string
  category: string
  description: string
  amount: number
  expenseDate: Date
  receiptUrl?: string
  notes?: string
  createdAt: Date
}

// Dashboard Types
export interface DashboardMetrics {
  todaySales: number
  todayProfit: number
  weekSales: number
  weekProfit: number
  monthSales: number
  monthProfit: number
  lowStockProducts: Product[]
  topProducts: Array<{
    productId: ObjectId
    productName: string
    totalSales: number
    totalProfit: number
  }>
}

// Form Types
export interface ProductFormData {
  name: string
  category: string
  type?: string
  productType?: 'physical' | 'service'
  size?: string
  color?: string
  sku?: string
  costPrice: number
  salePrice: number
  currentStock: number
  customFields?: Record<string, any>
}

export interface SaleFormData {
  items: Array<{
    itemId: string
    itemType: 'Product' | 'Service'
    quantity: number
    unitPrice: number
  }>
  // productId: string // Legacy
  // quantity: number // Legacy
  // unitSalePrice: number // Legacy
  saleExpenses: number
  notes?: string
}

export interface ExpenseFormData {
  category: string
  description: string
  amount: number
  expenseDate: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Common filter and pagination types
export interface FilterOptions {
  category?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} 