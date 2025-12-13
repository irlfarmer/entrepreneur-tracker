"use client"

import { useState, useEffect, Fragment } from "react"
import { useSession } from "next-auth/react"
import { Menu, Transition } from "@headlessui/react"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline"
import { Product } from "@/lib/types"
import { useBusiness } from "@/context/BusinessContext"

interface NotificationDropdownProps {
  className?: string
}

interface NotificationData {
  lowStockProducts: Product[]
  totalNotifications: number
}

export default function NotificationDropdown({ className = "" }: NotificationDropdownProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusiness } = useBusiness()
  const [notifications, setNotifications] = useState<NotificationData>({
    lowStockProducts: [],
    totalNotifications: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id && currentBusiness) {
      fetchNotifications()
      // Refresh every 5 minutes
      const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.id, currentBusiness.id])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?businessId=${currentBusiness.id}`)
      const data = await response.json()

      if (data.success) {
        setNotifications({
          lowStockProducts: data.data.lowStockProducts || [],
          totalNotifications: data.data.lowStockProducts?.length || 0
        })
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (productId: string) => {
    router.push(`/inventory/${productId}/edit`)
  }

  const hasNotifications = notifications.totalNotifications > 0

  return (
    <Menu as="div" className={`relative ${className}`}>
      <Menu.Button className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {notifications.totalNotifications > 9 ? '9+' : notifications.totalNotifications}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
          </div>

          {loading ? (
            <div className="px-4 py-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : notifications.lowStockProducts.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    Low Stock Alerts ({notifications.lowStockProducts.length})
                  </span>
                </div>
              </div>

              {notifications.lowStockProducts.map((product) => (
                <Menu.Item key={product._id?.toString()}>
                  {({ active }) => (
                    <button
                      onClick={() => handleNotificationClick(product._id?.toString() || '')}
                      className={`${active ? 'bg-gray-50' : ''
                        } block w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Only {product.currentStock} units left
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {product.category} • Click to restock
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
              <p className="text-xs text-gray-400">All products are well stocked</p>
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  )
} 