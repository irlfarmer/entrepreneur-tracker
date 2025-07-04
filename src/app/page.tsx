import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  CurrencyDollarIcon,
  CubeIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon
} from "@heroicons/react/24/outline"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Sales Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Simple Sales &
            <span className="text-blue-600"> Inventory Tracking</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Perfect for entrepreneurs and small businesses. Track your inventory, 
            record sales, manage expenses, and see your profits in real-time. 
            <span className="font-semibold text-blue-600">Completely free forever!</span>
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              Get Started its Entirely Free
            </Link>
            <Link
              href="/auth/signin"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold text-lg hover:border-gray-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6">
            <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CubeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Inventory Management
            </h3>
            <p className="text-gray-600">
              Track your products, stock levels, and get alerts when running low.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sales Tracking
            </h3>
            <p className="text-gray-600">
              Record sales instantly and see your profit margins in real-time.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Analytics Dashboard
            </h3>
            <p className="text-gray-600">
              Beautiful charts and insights to understand your business performance.
            </p>
          </div>
        </div>

        {/* Mobile First */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <DevicePhoneMobileIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Mobile First Design
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Designed for entrepreneurs on the go. Works perfectly on your phone, 
            tablet, or desktop.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try It Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Sales Tracker. Perfect for entrepreneurs.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
