import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSaleById } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import SaleForm from "@/components/Sales/SaleForm"

interface SaleEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SaleEditPage({ params }: SaleEditPageProps) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/sales/${serializedSale._id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Back to Sale View"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Sale</h1>
              <p className="text-gray-600">{serializedSale.productName}</p>
            </div>
          </div>
        </div>

        {/* Sale Form */}
        <div className="bg-white rounded-lg shadow">
          <SaleForm userId={session.user.id} sale={serializedSale} isEditing={true} />
        </div>
      </div>
    </DashboardLayout>
  )
} 