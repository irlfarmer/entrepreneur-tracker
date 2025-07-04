import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSaleById } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import Link from "next/link"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import SaleViewClient from "@/components/Sales/SaleViewClient"

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
  const sale = await getSaleById(id)
  
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