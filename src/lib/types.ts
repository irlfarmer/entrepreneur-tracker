import { ObjectId } from 'mongodb'

// User Types
export interface User {
  _id?: ObjectId
  email: string
  password: string
  companyName: string
  businessType?: string
  settings: {
    currency: string
    timezone: string
    enabledFields: string[]
    customExpenseCategories: string[]
    customProductCategories: string[]
    customProductFields: { name: string; type: 'text' | 'number' | 'select'; options?: string[] }[]
    saleRelatedExpenseCategories: string[]
  }
  createdAt: Date
  updatedAt: Date
}

// Product Types
export interface Product {
  _id?: ObjectId
  userId: ObjectId
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
  createdAt: Date
  updatedAt: Date
}

// Serialized Product for Client Components
export interface SerializedProduct {
  _id?: string
  userId: string
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
  productId: ObjectId
  productName: string
  quantity: number
  unitSalePrice: number
  unitCostPrice: number
  lineTotal: number
  lineProfit: number
}

export interface Sale {
  _id?: ObjectId
  userId: ObjectId
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
  size?: string
  color?: string
  sku?: string
  costPrice: number
  salePrice: number
  currentStock: number
  customFields?: Record<string, any>
}

export interface SaleFormData {
  productId: string
  quantity: number
  unitSalePrice: number
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