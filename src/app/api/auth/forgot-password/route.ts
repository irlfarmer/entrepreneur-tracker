import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createPasswordResetToken } from '@/lib/database'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await getUserByEmail(email)
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ message: 'If an account exists with this email, you will receive reset instructions.' })
    }

    // Create reset token
    const resetToken = await createPasswordResetToken(email)
    
    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    
    await resend.emails.send({
      from: 'noreply@entrepreneur-tracker.com',
      to: email,
      subject: 'Reset Your Password - Entrepreneur Tracker',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hi there,</p>
          <p>You requested to reset your password for your Entrepreneur Tracker account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent by Entrepreneur Tracker. If you have any questions, please contact us.
          </p>
        </div>
      `
    })

    return NextResponse.json({ message: 'If an account exists with this email, you will receive reset instructions.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 