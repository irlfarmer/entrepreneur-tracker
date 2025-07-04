import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { getUserByEmail, createUser } from "./database"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await getUserByEmail(credentials.email)
          
          if (!user) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          if (!isPasswordValid) {
            return null
          }

          return {
            id: user._id!.toString(),
            email: user.email,
            name: user.companyName,
            companyName: user.companyName,
            businessType: user.businessType
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await getUserByEmail(user.email!)
          
          if (!existingUser) {
            // Create new user for Google sign-in
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), 12)
            
            await createUser({
              email: user.email!,
              password: hashedPassword, // Random password for Google users
              companyName: user.name || "My Company",
              businessType: "General",
              settings: {
                currency: "USD",
                timezone: "UTC",
                enabledFields: ["category", "type", "size", "color"]
              }
            })
          }
          
          return true
        } catch (error) {
          console.error("Google sign-in error:", error)
          return false
        }
      }
      
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.companyName = user.companyName
        token.businessType = user.businessType
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string
        session.user.companyName = token.companyName as string
        session.user.businessType = token.businessType as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
}

// Utility function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

// Utility function to verify passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
} 