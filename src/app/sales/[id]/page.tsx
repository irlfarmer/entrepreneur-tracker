import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSalesWithProductDetails } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import Link from "next/link"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import SaleViewClient from "@/components/Sales/SaleViewClient"
import { ObjectId } from "mongodb"

interface SaleViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SaleViewPage({ params }: SaleViewPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  
  // Use getSalesWithProductDetails to get product details
  const salesWithDetails = await getSalesWithProductDetails(session.user.id, {
    _id: new ObjectId(id)
  })
  
  const sale = salesWithDetails[0]
  
  if (!sale) {
    redirect("/sales")
  }

  // Serialize the sale data to avoid MongoDB ObjectId serialization issues
  const serializedSale = serializeMongoObject(sale)

  return (
    <DashboardLayout>
      <SaleViewClient sale={serializedSale} />
    </DashboardLayout>
  )
} 