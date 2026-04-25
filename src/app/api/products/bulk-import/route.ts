import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createProducts, getUserById, updateUser } from "@/lib/database"
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
        const currentCategories = currentSettings.customProductCategories || []
        const categoriesToAdd = Array.from(newCategories).filter(
          cat => !currentCategories.includes(cat) && cat !== "Uncategorized"
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
          
          await updateUser(user._id!.toString(), { businessProfiles: profiles })
        }
      }
    }

    // Step 3: Map the products array to ensure all required fields and correct types
    const productsData = products.map((product: any) => ({
      userId: new ObjectId(session.user.id),
      businessId: targetBusinessId,
      name: product.name || "Unknown Product",
      category: product.category || "Uncategorized",
      type: product.type || "",
      size: product.size || "",
      color: product.color || "",
      sku: product.sku || "",
      costPrice: parseFloat(product.costPrice) || 0,
      salePrice: parseFloat(product.salePrice) || 0,
      currentStock: parseInt(product.currentStock) || 0,
      customFields: product.customFields || {}
    }))

    const insertedIds = await createProducts(productsData)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${insertedIds.length} products imported successfully`,
      data: { insertedIds: insertedIds.map((id: any) => id.toString()) }
    }, { status: 201 })

  } catch (error) {
    console.error("Error bulk importing products:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
