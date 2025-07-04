import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProductById } from "@/lib/database"
import { formatCurrency, calculateProfitMargin, formatDate, serializeMongoObject } from "@/lib/utils"
import { SerializedProduct } from "@/lib/types"
import { ExclamationTriangleIcon, PencilIcon, ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ProductViewClient from "@/components/Inventory/ProductViewClient"

interface ProductViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProductViewPage({ params }: ProductViewPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const product = await getProductById(id)
  
  if (!product) {
    redirect("/inventory")
  }

  // Serialize the product data to avoid MongoDB ObjectId serialization issues
  const serializedProduct = serializeMongoObject(product) as unknown as SerializedProduct

  return (
    <DashboardLayout>
      <ProductViewClient product={serializedProduct} />
    </DashboardLayout>
  )
} 