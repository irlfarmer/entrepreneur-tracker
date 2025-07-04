# Password Reset Setup Guide

## Overview
The password reset functionality is now implemented and completely **FREE** to use! It uses:
- **Resend** (free tier: 3,000 emails/month)
- **MongoDB** (for storing reset tokens)
- **NextAuth** (for password hashing)

## Setup Instructions

### 1. Create a Free Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address
4. Go to the **API Keys** section
5. Create a new API key
6. Copy the API key (starts with `re_`)

### 2. Add Environment Variable

Add this environment variable to your deployment:

**For Vercel:**
1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your API key)
   - **Environment**: Production (and Preview if needed)

**For local development:**
Add to your `.env.local` file:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Domain Configuration (Optional)

For production, you might want to verify your domain with Resend:

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `entrepreneur-tracker.vercel.app`)
3. Follow the DNS verification steps
4. Update the email `from` field in `/src/app/api/auth/forgot-password/route.ts`

If you don't verify a domain, emails will be sent from `noreply@entrepreneur-tracker.com` but may land in spam folders.

## Features Implemented

✅ **Forgot Password Page** (`/auth/forgot-password`)
- Clean, user-friendly interface
- Email validation
- Security-focused (doesn't reveal if email exists)

✅ **Reset Password Page** (`/auth/reset-password`)
- Token validation
- Password strength requirements
- Confirmation field
- Auto-redirect after success

✅ **Email Templates**
- Professional HTML email design
- Secure reset links with 1-hour expiration
- Clear call-to-action buttons

✅ **Security Features**
- Tokens expire after 1 hour
- One-time use tokens
- Secure token generation (UUID v4)
- Password hashing with bcrypt

✅ **Database Integration**
- Reset tokens stored in MongoDB
- Automatic cleanup of used tokens
- User password updates

## Usage

1. **User requests password reset:**
   - Goes to `/auth/forgot-password`
   - Enters email address
   - Receives email with reset link

2. **User resets password:**
   - Clicks link in email
   - Goes to `/auth/reset-password?token=...`
   - Enters new password
   - Password is updated securely

3. **User signs in:**
   - Can now use new password to sign in

## Cost Breakdown

- **Resend**: FREE (3,000 emails/month)
- **MongoDB**: Already using (no additional cost)
- **Vercel**: Already using (no additional cost)

**Total additional cost: $0.00/month**

## Email Deliverability Tips

To improve email deliverability:

1. **Verify your domain** with Resend
2. **Add SPF/DKIM records** (Resend provides these)
3. **Use a custom from address** (e.g., `noreply@yourdomain.com`)
4. **Test with different email providers** (Gmail, Outlook, etc.)

## Testing

Test the functionality:

1. Go to `/auth/forgot-password`
2. Enter a valid user email
3. Check your inbox for the reset email
4. Click the link and reset your password
5. Sign in with the new password

## Troubleshooting

**Email not received:**
- Check spam folder
- Verify RESEND_API_KEY is correct
- Check Resend dashboard for delivery status

**Invalid token error:**
- Tokens expire after 1 hour
- Tokens can only be used once
- Check URL wasn't truncated

**Database errors:**
- Ensure MongoDB connection is working
- Check that user exists in database

## Support

The password reset system is production-ready and follows security best practices. All components are free to use and scale well with your application growth. 