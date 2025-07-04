import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      companyName: string
      businessType?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    companyName: string
    businessType?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    companyName: string
    businessType?: string
  }
} 