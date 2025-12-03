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

// Helper function to validate MongoDB ObjectID
function isValidObjectId(id: string): boolean {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(requestPromise: Promise<NextRequest>) {
  // Note: requestPromise is a Promise in Next.js 15 route handlers
  const request = await requestPromise
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    if (!isValidObjectId(session.user.id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Invalid user ID"
      }, { status: 400 })
    }

    let client
    try {
      client = await clientPromise
    } catch (dbErr: any) {
      // Handle MongoDB connection error
      const name = dbErr?.name
      const message = dbErr?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", dbErr)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Internal server error"
      }, { status: 500 })
    }

    const db = client.db(DB_NAME)
    let userObjectId
    try {
      userObjectId = new ObjectId(session.user.id)
    } catch (err: any) {
      if (
        err?.name === "BSONError" ||
        (err?.message && err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      throw err
    }

    let lowStockProducts
    try {
      lowStockProducts = await db.collection(COLLECTIONS.PRODUCTS)
        .find({
          userId: userObjectId,
          currentStock: { $lte: 5 }
        })
        .sort({ currentStock: 1, name: 1 })
        .toArray()
    } catch (err: any) {
      const name = err?.name
      const message = err?.message
      if (
        name === "MongoServerSelectionError" ||
        (typeof message === "string" && message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Cannot connect to database. Please try again later."
        }, { status: 503 })
      }
      if (
        name === "BSONError" ||
        (typeof message === "string" && message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: "Invalid user ID"
        }, { status: 400 })
      }
      console.error("Error fetching notifications:", err)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Internal server error"
      }, { status: 500 })
    }

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