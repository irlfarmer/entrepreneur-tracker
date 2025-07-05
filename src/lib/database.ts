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
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  -(item.quantity || 0)
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }
  } else if (saleData.productId && saleData.quantity) {
    // Legacy single-product sale
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(saleData.productId) },
      [
        {
          $set: {
            currentStock: {
              $add: [
                { $ifNull: ["$currentStock", 0] },
                -(saleData.quantity || 0)
              ]
            },
            updatedAt: new Date()
          }
        }
      ]
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
        // For single-product sales, add product details
        product: {
          $cond: {
            if: { $ne: ['$productId', null] },
            then: {
              category: '$productDetails.category',
              type: '$productDetails.type',
              size: '$productDetails.size',
              color: '$productDetails.color',
              sku: '$productDetails.sku',
              customFields: '$productDetails.customFields'
            },
            else: null
          }
        },
        // For multi-product sales, enrich items with product details
        enrichedItems: {
          $cond: {
            if: { $and: [{ $ne: ['$items', null] }, { $isArray: '$items' }] },
            then: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      productDetails: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $ifNull: [{ $concatArrays: [['$productDetails']] }, []] },
                              as: 'prod',
                              cond: { $eq: ['$$prod._id', '$$item.productId'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            },
            else: '$items'
          }
        }
      }
    },
    {
      $project: {
        productDetails: 0,  // Remove the temporary productDetails field
        items: 0  // Remove original items
      }
    },
    {
      $addFields: {
        items: '$enrichedItems'  // Replace with enriched items
      }
    },
    {
      $project: {
        enrichedItems: 0  // Remove temporary enrichedItems field
      }
    },
    { $sort: { saleDate: -1 } }
  ]
  
  // We need a more complex approach for multi-product sales
  // Let's fetch sales first, then enrich them with product details
  const sales = await db.collection(COLLECTIONS.SALES).find(matchStage).sort({ saleDate: -1 }).toArray()
  
  // Enrich sales with product details
  const enrichedSales = await Promise.all(
    sales.map(async (sale) => {
      if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
        // Multi-product sale - enrich each item with product details
        const enrichedItems = await Promise.all(
          sale.items.map(async (item: any) => {
            const product = await db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: new ObjectId(item.productId) })
            return {
              ...item,
              productDetails: product ? {
                category: product.category,
                type: product.type,
                size: product.size,
                color: product.color,
                sku: product.sku,
                customFields: product.customFields
              } : null
            }
          })
        )
        
        return {
          ...sale,
          items: enrichedItems
        }
      } else if (sale.productId) {
        // Single-product sale - add product details
        const product = await db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: new ObjectId(sale.productId) })
        return {
          ...sale,
          product: product ? {
            category: product.category,
            type: product.type,
            size: product.size,
            color: product.color,
            sku: product.sku,
            customFields: product.customFields
          } : null
        }
      }
      
      return sale
    })
  )
  
  return enrichedSales
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
          [
            {
              $set: {
                currentStock: {
                  $add: [
                    { $ifNull: ["$currentStock", 0] },
                    item.quantity || 0
                  ]
                },
                updatedAt: new Date()
              }
            }
          ]
        )
      }
    } else if (originalSale.productId && originalSale.quantity) {
      // Legacy single-product revert
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(originalSale.productId) },
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  originalSale.quantity || 0
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }
    
    // Then apply the new sale's stock changes
    for (const item of updateData.items) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(item.productId) },
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  -(item.quantity || 0)
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }
  } else if (updateData.productId && updateData.quantity) {
    // Legacy single-product update
    
    // Revert original stock change
    if (originalSale.productId && originalSale.quantity) {
      await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: new ObjectId(originalSale.productId) },
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  originalSale.quantity || 0
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }
    
    // Apply new stock change
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(updateData.productId) },
      [
        {
          $set: {
            currentStock: {
              $add: [
                { $ifNull: ["$currentStock", 0] },
                -(updateData.quantity || 0)
              ]
            },
            updatedAt: new Date()
          }
        }
      ]
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
        [
          {
            $set: {
              currentStock: {
                $add: [
                  { $ifNull: ["$currentStock", 0] },
                  item.quantity || 0
                ]
              },
              updatedAt: new Date()
            }
          }
        ]
      )
    }
  } else if (sale.productId && sale.quantity) {
    // Legacy single-product sale
    await db.collection(COLLECTIONS.PRODUCTS).updateOne(
      { _id: new ObjectId(sale.productId) },
      [
        {
          $set: {
            currentStock: {
              $add: [
                { $ifNull: ["$currentStock", 0] },
                sale.quantity || 0
              ]
            },
            updatedAt: new Date()
          }
        }
      ]
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
  
  // Get user's low stock threshold setting (default to 3)
  const user = await db.collection('users').findOne({ _id: userObjectId })
  const lowStockThreshold = user?.settings?.lowStockThreshold ?? 3
  
  // Helper function to calculate sales totals that works for both legacy and multi-product sales
  const calculateSalesTotals = (sales: any[]) => {
    return sales.reduce((acc, sale) => {
      let revenue = 0
      let profit = 0
      
      if (sale.totalSales !== undefined) {
        // Multi-product sale with pre-calculated totals
        revenue = sale.totalSales
        profit = sale.totalProfit || 0
      } else if (sale.items && sale.items.length > 0) {
        // Multi-product sale without pre-calculated totals
        revenue = sale.items.reduce((sum: number, item: any) => 
          sum + ((item.quantity || 0) * (item.unitSalePrice || 0)), 0)
        profit = sale.items.reduce((sum: number, item: any) => 
          sum + ((item.lineProfit || 0)), 0)
      } else {
        // Legacy single-product sale
        revenue = (sale.quantity || 0) * (sale.unitSalePrice || 0)
        profit = sale.totalProfit || 0
      }
      
      return {
        totalSales: acc.totalSales + revenue,
        totalProfit: acc.totalProfit + profit
      }
    }, { totalSales: 0, totalProfit: 0 })
  }
  
  // Today's metrics
  const todaySales = await db.collection(COLLECTIONS.SALES).find({
    userId: userObjectId, 
    saleDate: { $gte: today }
  }).toArray()
  
  // Week's metrics
  const weekSales = await db.collection(COLLECTIONS.SALES).find({
    userId: userObjectId, 
    saleDate: { $gte: weekAgo }
  }).toArray()
  
  // Month's metrics
  const monthSales = await db.collection(COLLECTIONS.SALES).find({
    userId: userObjectId, 
    saleDate: { $gte: monthAgo }
  }).toArray()
  
  // Calculate totals using helper function
  const todayTotals = calculateSalesTotals(todaySales)
  const weekTotals = calculateSalesTotals(weekSales)
  const monthTotals = calculateSalesTotals(monthSales)
  
  // Low stock products using user's threshold
  const lowStockProducts = await db.collection(COLLECTIONS.PRODUCTS).find({
    userId: userObjectId,
    currentStock: { $lte: lowStockThreshold }
  }).toArray() as Product[]
  
  // Top products - need to aggregate properly for both sale types
  const allSales = await db.collection(COLLECTIONS.SALES).find({ userId: userObjectId }).toArray()
  const productStats: Record<string, { productName: string; totalSales: number; totalProfit: number }> = {}
  
  allSales.forEach((sale: any) => {
    if (sale.items && sale.items.length > 0) {
      // Multi-product sale
      sale.items.forEach((item: any) => {
        const productId = item.productId.toString()
        if (!productStats[productId]) {
          productStats[productId] = { productName: item.productName, totalSales: 0, totalProfit: 0 }
        }
        productStats[productId].totalSales += (item.quantity || 0) * (item.unitSalePrice || 0)
        productStats[productId].totalProfit += item.lineProfit || 0
      })
    } else if (sale.productId) {
      // Legacy single-product sale
      const productId = sale.productId.toString()
      if (!productStats[productId]) {
        productStats[productId] = { productName: sale.productName, totalSales: 0, totalProfit: 0 }
      }
      productStats[productId].totalSales += (sale.quantity || 0) * (sale.unitSalePrice || 0)
      productStats[productId].totalProfit += sale.totalProfit || 0
    }
  })
  
  const topProducts = Object.entries(productStats)
    .sort(([,a], [,b]) => b.totalSales - a.totalSales)
    .slice(0, 5)
    .map(([productId, stats]) => ({
      productId: new ObjectId(productId),
      productName: stats.productName,
      totalSales: stats.totalSales,
      totalProfit: stats.totalProfit
    }))
  
  return {
    todaySales: todayTotals.totalSales,
    todayProfit: todayTotals.totalProfit,
    weekSales: weekTotals.totalSales,
    weekProfit: weekTotals.totalProfit,
    monthSales: monthTotals.totalSales,
    monthProfit: monthTotals.totalProfit,
    lowStockProducts,
    topProducts
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