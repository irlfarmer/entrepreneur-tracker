
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase, COLLECTIONS, getQuery, handleMongoError } from "@/lib/database"
import { Service, ApiResponse } from "@/lib/types"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')
        const search = searchParams.get('search')

        if (!businessId) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Business ID is required" }, { status: 400 })
        }

        const db = await getDatabase()
        const user = await db.collection(COLLECTIONS.USERS).findOne({ email: session.user.email })

        if (!user) {
            return NextResponse.json<ApiResponse>({ success: false, error: "User not found" }, { status: 404 })
        }

        const query: any = getQuery({
            userId: user._id,
            businessId: businessId
        })

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        }

        const services = await db.collection("services")
            .find(query)
            .sort({ name: 1 })
            .toArray()

        return NextResponse.json<ApiResponse>({
            success: true,
            data: services
        })
    } catch (error) {
        const errResp = handleMongoError(error)
        if (errResp) return errResp
        console.error("Error fetching services:", error)
        return NextResponse.json<ApiResponse>({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, price, businessId, category, customFields } = body

        if (!name || price === undefined || !businessId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: "Missing required fields: name, price, businessId"
            }, { status: 400 })
        }

        const db = await getDatabase()
        const user = await db.collection(COLLECTIONS.USERS).findOne({ email: session.user.email })

        if (!user) {
            return NextResponse.json<ApiResponse>({ success: false, error: "User not found" }, { status: 404 })
        }

        const newService: Service = {
            userId: user._id,
            businessId,
            name,
            description,
            price: parseFloat(price),
            category,
            customFields,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const result = await db.collection("services").insertOne(newService)

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { ...newService, _id: result.insertedId }
        })
    } catch (error) {
        const errResp = handleMongoError(error)
        if (errResp) return errResp
        console.error("Error creating service:", error)
        return NextResponse.json<ApiResponse>({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}
