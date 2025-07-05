import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'
import type { User, Product, Sale, Expense, DashboardMetrics } from './types'
import crypto from 'crypto'

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
  return await db.collection(COLLECTIONS.PRODUCTS).find(query)
    .sort({ updatedAt: -1 })
    .toArray() as Product[]
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
  
  // Update product stock for each item in the sale
  if (saleData.items && saleData.items.length > 0) {
    // Multi-product sale
    for (const item of saleData.items) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(item.productId) },
        { 
          $inc: { currentStock: -item.quantity },
          $set: { updatedAt: new Date() }
        }
      )
    }
  } else if (saleData.productId && saleData.quantity) {
    // Legacy single-product sale
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(saleData.productId) },
      { 
        $inc: { currentStock: -saleData.quantity },
        $set: { updatedAt: new Date() }
      }
    )
  }
  
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

export async function getSalesWithProductDetails(userId: string, filters?: any) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const matchStage: any = { userId: new ObjectId(userId) }
  
  // Add filters to match stage
  if (filters) {
    Object.keys(filters).forEach(key => {
      matchStage[key] = filters[key]
    })
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: COLLECTIONS.PRODUCTS,
        localField: 'productId',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    {
      $unwind: {
        path: '$productDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        product: {
          category: '$productDetails.category',
          type: '$productDetails.type',
          size: '$productDetails.size',
          color: '$productDetails.color',
          sku: '$productDetails.sku',
          customFields: '$productDetails.customFields'
        }
      }
    },
    {
      $project: {
        productDetails: 0  // Remove the temporary productDetails field
      }
    },
    { $sort: { saleDate: -1 } }
  ]
  
  return await db.collection(COLLECTIONS.SALES).aggregate(pipeline).toArray()
}

export async function getSaleById(saleId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.SALES).findOne({ 
    _id: new ObjectId(saleId) 
  }) as Sale | null
}

export async function updateSale(saleId: string, updateData: Partial<Sale>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  // Get the original sale to calculate stock differences
  const originalSale = await getSaleById(saleId)
  if (!originalSale) {
    throw new Error('Sale not found')
  }
  
  const result = await db.collection(COLLECTIONS.SALES).updateOne(
    { _id: new ObjectId(saleId) },
    { 
      $set: { 
        ...updateData,
        updatedAt: new Date() 
      } 
    }
  )
  
  // Update inventory based on changes
  if (updateData.items && updateData.items.length > 0) {
    // Multi-product sale update
    
    // First, revert the original sale's stock changes
    if (originalSale.items && originalSale.items.length > 0) {
      for (const item of originalSale.items) {
        await db.collection(COLLECTIONS.PRODUCTS).updateOne(
          { _id: new ObjectId(item.productId) },
          { 
            $inc: { currentStock: item.quantity }, // Add back the original quantity
            $set: { updatedAt: new Date() }
          }
        )
      }
    } else if (originalSale.productId && originalSale.quantity) {
      // Legacy single-product revert
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(originalSale.productId) },
        { 
          $inc: { currentStock: originalSale.quantity }, // Add back the original quantity
          $set: { updatedAt: new Date() }
        }
      )
    }
    
    // Then apply the new sale's stock changes
    for (const item of updateData.items) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(item.productId) },
        { 
          $inc: { currentStock: -item.quantity }, // Subtract the new quantity
          $set: { updatedAt: new Date() }
        }
      )
    }
  } else if (updateData.productId && updateData.quantity) {
    // Legacy single-product update
    
    // Revert original stock change
    if (originalSale.productId && originalSale.quantity) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(originalSale.productId) },
        { 
          $inc: { currentStock: originalSale.quantity },
          $set: { updatedAt: new Date() }
        }
      )
    }
    
    // Apply new stock change
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(updateData.productId) },
      { 
        $inc: { currentStock: -updateData.quantity },
        $set: { updatedAt: new Date() }
      }
    )
  }
  
  return result.modifiedCount > 0
}

export async function deleteSale(saleId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  // Get the sale to revert stock changes
  const sale = await getSaleById(saleId)
  if (!sale) {
    throw new Error('Sale not found')
  }
  
  // Revert stock changes
  if (sale.items && sale.items.length > 0) {
    // Multi-product sale
    for (const item of sale.items) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(item.productId) },
        { 
          $inc: { currentStock: item.quantity }, // Add back the quantity
          $set: { updatedAt: new Date() }
        }
      )
    }
  } else if (sale.productId && sale.quantity) {
    // Legacy single-product sale
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(sale.productId) },
      { 
        $inc: { currentStock: sale.quantity }, // Add back the quantity
        $set: { updatedAt: new Date() }
      }
    )
  }
  
  const result = await db.collection(COLLECTIONS.SALES).deleteOne({ 
    _id: new ObjectId(saleId) 
  })
  
  return result.deletedCount > 0
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

export async function getExpenseById(expenseId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  return await db.collection(COLLECTIONS.EXPENSES).findOne({ 
    _id: new ObjectId(expenseId) 
  }) as Expense | null
}

export async function updateExpense(expenseId: string, updateData: Partial<Expense>) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const result = await db.collection(COLLECTIONS.EXPENSES).updateOne(
    { _id: new ObjectId(expenseId) },
    { 
      $set: { 
        ...updateData,
        updatedAt: new Date() 
      } 
    }
  )
  
  return result.modifiedCount > 0
}

export async function deleteExpense(expenseId: string) {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  
  const result = await db.collection(COLLECTIONS.EXPENSES).deleteOne({ 
    _id: new ObjectId(expenseId) 
  })
  
  return result.deletedCount > 0
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

// Password reset token functions
export async function createPasswordResetToken(email: string): Promise<string> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  
  await db.collection('password_reset_tokens').insertOne({
    email,
    token,
    expiresAt,
    used: false,
    createdAt: new Date()
  })
  
  return token
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  const resetToken = await db.collection('password_reset_tokens').findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  })
  
  if (!resetToken) {
    return null
  }
  
  return resetToken.email
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  await db.collection('password_reset_tokens').updateOne(
    { token },
    { $set: { used: true, usedAt: new Date() } }
  )
}

export async function updateUserPassword(email: string, hashedPassword: string): Promise<void> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  await db.collection(COLLECTIONS.USERS).updateOne(
    { email },
    { $set: { password: hashedPassword } }
  )
} 