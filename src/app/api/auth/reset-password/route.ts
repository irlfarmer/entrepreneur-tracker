import { NextRequest, NextResponse } from 'next/server'
import { verifyPasswordResetToken, markPasswordResetTokenAsUsed, updateUserPassword } from '@/lib/database'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    // Verify the reset token
    const email = await verifyPasswordResetToken(token)
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update the user's password
    await updateUserPassword(email, hashedPassword)

    // Mark the token as used
    await markPasswordResetTokenAsUsed(token)

    return NextResponse.json({ message: 'Password reset successful' })
  } catch (error) {
    console.error('Password reset verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 