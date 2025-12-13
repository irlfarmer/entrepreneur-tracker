
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase, COLLECTIONS, handleMongoError } from "@/lib/database"
import { ObjectId } from "mongodb"
import { ApiResponse } from "@/lib/types"

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, description, price, active, category, customFields } = body

        if (!ObjectId.isValid(id)) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Service ID" }, { status: 400 })
        }

        const db = await getDatabase()

        // Clean up undefined fields
        const updateData: any = { updatedAt: new Date() }
        if (name) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (price !== undefined) updateData.price = parseFloat(price)
        if (active !== undefined) updateData.active = active
        if (category !== undefined) updateData.category = category
        if (customFields !== undefined) updateData.customFields = customFields

        const result = await db.collection("services").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Service not found" }, { status: 404 })
        }

        return NextResponse.json<ApiResponse>({ success: true, data: { ...updateData, _id: id } })
    } catch (error) {
        const errResp = handleMongoError(error)
        if (errResp) return errResp
        console.error("Error updating service:", error)
        return NextResponse.json<ApiResponse>({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Invalid Service ID" }, { status: 400 })
        }

        const db = await getDatabase()
        const result = await db.collection("services").deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Service not found" }, { status: 404 })
        }

        return NextResponse.json<ApiResponse>({ success: true })
    } catch (error) {
        const errResp = handleMongoError(error)
        if (errResp) return errResp
        console.error("Error deleting service:", error)
        return NextResponse.json<ApiResponse>({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}
