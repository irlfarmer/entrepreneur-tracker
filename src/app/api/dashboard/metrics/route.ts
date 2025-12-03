import { NextResponse } from "next/server"
import { getDashboardMetrics } from "@/lib/database"

// Helper function to validate MongoDB ObjectID
function isValidObjectId(id: string): boolean {
  // A MongoDB ObjectID must be a 24-character hex string
  return /^[a-fA-F0-9]{24}$/.test(id)
}

export async function GET(request: Request) {
  try {
    // In Next.js 15, you must treat searchParams as async and await it if provided to route handler:
    // However, "request" is always a Request object, and request.url is a string.
    // Here, we're not directly using the new async searchParams API
    // (If you ever use (e.g.) "searchParams" from the route handler's context arg, await it.)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    if (!isValidObjectId(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 })
    }

    let metrics
    try {
      metrics = await getDashboardMetrics(userId)
    } catch (err: any) {
      // Handle MongoServerSelectionError (e.g. cannot connect to DB)
      if (
        err?.name === "MongoServerSelectionError" ||
        (typeof err?.message === "string" && err.message.toLowerCase().includes("server selection timed out"))
      ) {
        console.error("MongoDB connection error: ", err)
        return NextResponse.json(
          { success: false, error: "Cannot connect to database. Please try again later." },
          { status: 503 }
        )
      }
      // Handle BSONError or invalid ObjectId
      if (
        err?.name === "BSONError" ||
        (typeof err?.message === "string" &&
          err.message.match(/(input must be a 24 character hex string|invalid ObjectId)/i))
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid user ID" },
          { status: 400 }
        )
      }
      throw err
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}