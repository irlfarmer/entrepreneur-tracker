import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'
import type { User, Product, Sale, Expense, DashboardMetrics } from './types'

// Database Collections
const DB_NAME = 'entrepreneur-tracker'
const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  SALES: 'sales',
  EXPENSES: 'expenses'
}

// User Operations
export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const user: User = {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const result = await db.collection(COLLECTIONS.USERS).insertOne(user)
  return result.insertedId
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.USERS).findOne({ email }) as User | null
}

export async function getUserById(userId: string): Promise<User | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.USERS).findOne({ 
    _id: new ObjectId(userId) 
  }) as User | null
}

export async function updateUser(userId: string, updateData: Partial<User>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const result = await db.collection(COLLECTIONS.USERS).updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        ...updateData, 
        updatedAt: new Date() 
      } 
    }
  )
  
  return result.modifiedCount > 0
}

// Product Operations
export async function createProduct(productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const product: Product = {
    ...productData,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  const result = await db.collection(COLLECTIONS.PRODUCTS).insertOne(product)
  return result.insertedId
}

export async function getProducts(userId: string, filters?: any) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const query = { userId: new ObjectId(userId), ...filters }
  return await db.collection(COLLECTIONS.PRODUCTS).find(query).toArray() as Product[]
}

export async function getProductById(productId: string): Promise<Product | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.PRODUCTS).findOne({ 
    _id: new ObjectId(productId) 
  }) as Product | null
}

export async function updateProduct(productId: string, updateData: Partial<Product>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const result = await db.collection(COLLECTIONS.PRODUCTS).updateOne(
    { _id: new ObjectId(productId) },
    { 
      $set: { 
        ...updateData, 
        updatedAt: new Date() 
      } 
    }
  )
  
  return result.modifiedCount > 0
}

export async function deleteProduct(productId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const result = await db.collection(COLLECTIONS.PRODUCTS).deleteOne({ 
    _id: new ObjectId(productId) 
  })
  
  return result.deletedCount > 0
}

// Sales Operations
export async function createSale(saleData: Omit<Sale, '_id' | 'createdAt'>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const sale: Sale = {
    ...saleData,
    createdAt: new Date()
  }
  
  const result = await db.collection(COLLECTIONS.SALES).insertOne(sale)
  
  // Update product stock
  await db.collection(COLLECTIONS.PRODUCTS).updateOne(
    { _id: new ObjectId(saleData.productId) },
    { 
      $inc: { currentStock: -saleData.quantity },
      $set: { updatedAt: new Date() }
    }
  )
  
  return result.insertedId
}

export async function getSales(userId: string, filters?: any) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const query = { userId: new ObjectId(userId), ...filters }
  return await db.collection(COLLECTIONS.SALES).find(query)
    .sort({ saleDate: -1 })
    .toArray() as Sale[]
}

export async function getSaleById(saleId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.SALES).findOne({ 
    _id: new ObjectId(saleId) 
  }) as Sale | null
}

// Expense Operations
export async function createExpense(expenseData: Omit<Expense, '_id' | 'createdAt'>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const expense: Expense = {
    ...expenseData,
    createdAt: new Date()
  }
  
  const result = await db.collection(COLLECTIONS.EXPENSES).insertOne(expense)
  return result.insertedId
}

export async function getExpenses(userId: string, filters?: any) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const query = { userId: new ObjectId(userId), ...filters }
  return await db.collection(COLLECTIONS.EXPENSES).find(query)
    .sort({ expenseDate: -1 })
    .toArray() as Expense[]
}

// Dashboard Operations
export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  
  const userObjectId = new ObjectId(userId)
  
  // Today's metrics
  const todaySales = await db.collection(COLLECTIONS.SALES).aggregate([
    { $match: { userId: userObjectId, saleDate: { $gte: today } } },
    { $group: { 
      _id: null, 
      totalSales: { $sum: { $multiply: ['$quantity', '$unitSalePrice'] } },
      totalProfit: { $sum: '$totalProfit' }
    }}
  ]).toArray()
  
  // Week's metrics
  const weekSales = await db.collection(COLLECTIONS.SALES).aggregate([
    { $match: { userId: userObjectId, saleDate: { $gte: weekAgo } } },
    { $group: { 
      _id: null, 
      totalSales: { $sum: { $multiply: ['$quantity', '$unitSalePrice'] } },
      totalProfit: { $sum: '$totalProfit' }
    }}
  ]).toArray()
  
  // Month's metrics
  const monthSales = await db.collection(COLLECTIONS.SALES).aggregate([
    { $match: { userId: userObjectId, saleDate: { $gte: monthAgo } } },
    { $group: { 
      _id: null, 
      totalSales: { $sum: { $multiply: ['$quantity', '$unitSalePrice'] } },
      totalProfit: { $sum: '$totalProfit' }
    }}
  ]).toArray()
  
  // Low stock products
  const lowStockProducts = await db.collection(COLLECTIONS.PRODUCTS).find({
    userId: userObjectId,
    currentStock: { $lte: 5 }
  }).toArray() as Product[]
  
  // Top products
  const topProducts = await db.collection(COLLECTIONS.SALES).aggregate([
    { $match: { userId: userObjectId } },
    { $group: {
      _id: '$productId',
      productName: { $first: '$productName' },
      totalSales: { $sum: { $multiply: ['$quantity', '$unitSalePrice'] } },
      totalProfit: { $sum: '$totalProfit' }
    }},
    { $sort: { totalSales: -1 } },
    { $limit: 5 }
  ]).toArray()
  
  return {
    todaySales: todaySales[0]?.totalSales || 0,
    todayProfit: todaySales[0]?.totalProfit || 0,
    weekSales: weekSales[0]?.totalSales || 0,
    weekProfit: weekSales[0]?.totalProfit || 0,
    monthSales: monthSales[0]?.totalSales || 0,
    monthProfit: monthSales[0]?.totalProfit || 0,
    lowStockProducts,
    topProducts: topProducts.map(p => ({
      productId: p._id,
      productName: p.productName,
      totalSales: p.totalSales,
      totalProfit: p.totalProfit
    }))
  }
} 