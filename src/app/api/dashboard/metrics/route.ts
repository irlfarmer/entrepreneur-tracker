import { NextResponse } from "next/server"
import { getDashboardMetrics } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const metrics = await getDashboardMetrics(userId)

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 