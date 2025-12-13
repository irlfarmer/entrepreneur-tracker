import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserById, updateUser } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    try {
        const user = await getUserById(session.user.id)
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
        }

        // Lazy Migration: Ensure 'default' business profile exists
        let businessProfiles = user.businessProfiles || []
        const defaultProfileExists = businessProfiles.some((p: any) => p.id === 'default')

        if (!defaultProfileExists) {
            const defaultProfile = {
                id: 'default',
                name: user.companyName || 'Main Business',
                settings: user.settings
            }
            businessProfiles = [...businessProfiles, defaultProfile]

            // Persist migration
            await updateUser(user._id!.toString(), { businessProfiles })

            // Update local user object for response
            user.businessProfiles = businessProfiles
        }

        // Return safe user data
        return NextResponse.json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                name: user.companyName,
                companyName: user.companyName,
                businessProfiles: user.businessProfiles || [],
                activeBusinessId: user.activeBusinessId || 'default',
                settings: user.settings // Keep for legacy read-only if needed, but profiles should be source of truth
            }
        })
    } catch (error) {
        console.error("Error fetching user profile:", error)
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { businessProfiles, activeBusinessId, settings } = body

        const updateData: any = {}
        if (businessProfiles) updateData.businessProfiles = businessProfiles
        if (activeBusinessId) updateData.activeBusinessId = activeBusinessId
        if (settings) updateData.settings = settings

        const success = await updateUser(session.user.id, updateData)

        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 400 })
        }
    } catch (error) {
        console.error("Error updating user profile:", error)
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
}
