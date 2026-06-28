import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase, getUserById, updateUser } from "@/lib/database"
import { ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function POST(requestPromise: Promise<NextRequest>) {
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()
    const { products, businessId } = body
    const targetBusinessId = businessId || 'default'

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Products array is required and cannot be empty"
      }, { status: 400 })
    }

    // Step 1: Extract unique categories and custom field keys from the imported data
    const newCategories = new Set<string>()
    const newCustomFieldKeys = new Set<string>()

    products.forEach((product: any) => {
      if (product.category) newCategories.add(product.category)
      if (product.customFields) {
        Object.keys(product.customFields).forEach(key => newCustomFieldKeys.add(key))
      }
    })

    // Step 2: Auto-register new categories and custom fields to user settings
    const user = await getUserById(session.user.id)
    if (user) {
      const profiles = user.businessProfiles || []
      const profileIndex = profiles.findIndex((p: any) => p.id === targetBusinessId)

      let targetProfile = profileIndex !== -1 ? profiles[profileIndex] : null
      if (!targetProfile && targetBusinessId === 'default') {
        targetProfile = { id: 'default', name: user.companyName, settings: user.settings || {} }
        profiles.push(targetProfile)
      }

      if (targetProfile) {
        const currentSettings: any = targetProfile.settings || {}
        
        // Handle Categories
        const defaultProductCategories = [
          "Electronics",
          "Clothing",
          "Books",
          "Home & Garden",
          "Sports",
          "Toys",
          "Health & Beauty",
          "Automotive",
          "Other"
        ]
        const currentCategories = currentSettings.customProductCategories || []
        const categoriesToAdd = Array.from(newCategories).filter(
          cat => !currentCategories.includes(cat) && !defaultProductCategories.includes(cat) && cat !== "Uncategorized"
        )
        const updatedCategories = [...currentCategories, ...categoriesToAdd]

        // Handle Custom Fields
        const currentFields = currentSettings.customProductFields || []
        const currentFieldNames = currentFields.map((f: any) => f.name)
        const fieldsToAdd = Array.from(newCustomFieldKeys)
          .filter(key => !currentFieldNames.includes(key))
          .map(key => ({ name: key, type: 'text' }))
        
        const updatedFields = [...currentFields, ...fieldsToAdd]

        // Update if there are new items
        if (categoriesToAdd.length > 0 || fieldsToAdd.length > 0) {
          targetProfile.settings = { 
            ...currentSettings, 
            customProductCategories: updatedCategories,
            customProductFields: updatedFields
          }
          if (profileIndex !== -1) profiles[profileIndex] = targetProfile
          else profiles[profiles.length - 1] = targetProfile
          
          const updateData: any = { businessProfiles: profiles }
          if (targetBusinessId === 'default') {
            updateData.settings = {
              ...(user.settings || {}),
              customProductCategories: updatedCategories,
              customProductFields: updatedFields
            }
          }
          await updateUser(user._id!.toString(), updateData)
        }
      }
    }

    // Step 3: Upsert — match existing products by identity fields; if found, increment stock only
    const { db: productDb } = await connectToDatabase()
    let insertedCount = 0
    let updatedCount = 0
    const insertedIds: string[] = []

    for (const product of products) {
      const name = product.name || "Unknown Product"
      const category = product.category || "Uncategorized"
      const type = product.type || ""
      const size = product.size || ""
      const color = product.color || ""
      const sku = product.sku || ""
      const incomingStock = parseInt(product.currentStock) || 0

      // Build a match query using all identity fields
      const matchQuery: any = {
        userId: new ObjectId(session.user.id),
        name,
        category,
        type,
        size,
        color,
      }
      // Only match on SKU if the product has one
      if (sku) matchQuery.sku = sku

      // Business scoping
      if (targetBusinessId === "default") {
        matchQuery.$or = [
          { businessId: "default" },
          { businessId: { $exists: false } },
          { businessId: null },
        ]
      } else {
        matchQuery.businessId = targetBusinessId
      }

      const existing = await productDb.collection("products").findOne(matchQuery)

      if (existing) {
        // Product already exists — add the incoming stock and update prices
        await productDb.collection("products").updateOne(
          { _id: existing._id },
          {
            $inc: { currentStock: incomingStock },
            $set: {
              costPrice: parseFloat(product.costPrice) || 0,
              salePrice: parseFloat(product.salePrice) || 0,
              updatedAt: new Date()
            },
          }
        )
        updatedCount++
      } else {
        // New product — insert it
        const now = new Date()
        const result = await productDb.collection("products").insertOne({
          userId: new ObjectId(session.user.id),
          businessId: targetBusinessId,
          name,
          category,
          type,
          size,
          color,
          sku,
          costPrice: parseFloat(product.costPrice) || 0,
          salePrice: parseFloat(product.salePrice) || 0,
          currentStock: incomingStock,
          customFields: product.customFields || {},
          createdAt: now,
          updatedAt: now,
        })
        insertedIds.push(result.insertedId.toString())
        insertedCount++
      }
    }

    const parts: string[] = []
    if (insertedCount > 0) parts.push(`${insertedCount} product${insertedCount !== 1 ? "s" : ""} imported`)
    if (updatedCount > 0) parts.push(`${updatedCount} existing product${updatedCount !== 1 ? "s" : ""} updated`)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: parts.join(", "),
      data: { insertedIds, insertedCount, updatedCount }
    }, { status: 201 })

  } catch (error) {
    console.error("Error bulk importing products:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
