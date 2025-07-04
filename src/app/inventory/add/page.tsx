import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import ProductForm from "@/components/Inventory/ProductForm"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

export default async function AddProductPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button and header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/inventory"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Inventory
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-2 text-gray-600">
            Add a new product to your inventory with pricing and stock information.
          </p>
        </div>

        {/* Product Form */}
        <div className="bg-white rounded-lg shadow">
          <ProductForm />
        </div>
      </div>
    </DashboardLayout>
  )
} 