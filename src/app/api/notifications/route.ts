import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ApiResponse } from "@/lib/types"
import { serializeMongoObject } from "@/lib/utils"
import { ObjectId } from "mongodb"

const DB_NAME = process.env.MONGODB_DB_NAME || "entrepreneur-tracker"
const COLLECTIONS = {
  PRODUCTS: "products"
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const userObjectId = new ObjectId(session.user.id)

    // Get low stock products (5 or fewer units)
    const lowStockProducts = await db.collection(COLLECTIONS.PRODUCTS)
      .find({
        userId: userObjectId,
        currentStock: { $lte: 5 }
      })
      .sort({ currentStock: 1, name: 1 })
      .toArray()

    // Serialize the products to avoid MongoDB ObjectId issues
    const serializedProducts = lowStockProducts.map(product => serializeMongoObject(product))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        lowStockProducts: serializedProducts,
        totalNotifications: serializedProducts.length
      }
    })

  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
} 