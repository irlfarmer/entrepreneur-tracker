import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/database"
import { ObjectId } from "mongodb"

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "No product IDs provided" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const objectIds = ids.map((id) => new ObjectId(id))

    const result = await db.collection("products").deleteMany({
      _id: { $in: objectIds },
      userId: new ObjectId(session.user.id),
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Bulk delete error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
