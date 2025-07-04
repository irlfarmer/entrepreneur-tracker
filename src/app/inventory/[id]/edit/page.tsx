import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProductById } from "@/lib/database"
import { serializeMongoObject } from "@/lib/utils"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ProductForm from "@/components/Inventory/ProductForm"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

interface ProductEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const product = await getProductById(id)
  
  if (!product) {
    redirect("/inventory")
  }

  // Serialize the product object to avoid MongoDB ObjectId issues
  const serializedProduct = serializeMongoObject(product)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/inventory/${serializedProduct._id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Back to Product View"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-600">{serializedProduct.name}</p>
            </div>
          </div>
        </div>

        {/* Product Form */}
        <ProductForm product={serializedProduct} isEditing={true} />
      </div>
    </DashboardLayout>
  )
} 