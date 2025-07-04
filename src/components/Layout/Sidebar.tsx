"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  HomeIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon
} from "@heroicons/react/24/outline"
import { classNames } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Inventory", href: "/inventory", icon: CubeIcon },
  { name: "Sales", href: "/sales", icon: CurrencyDollarIcon },
  { name: "Expenses", href: "/expenses", icon: DocumentChartBarIcon },
  { name: "Finance", href: "/finance", icon: ChartBarIcon },
  { name: "Settings", href: "/settings", icon: CogIcon },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        className={classNames(
          open ? "translate-x-0" : "-translate-x-full",
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:hidden"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            type="button"
            className="rounded-md p-2 text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
                              {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={classNames(
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                    )}
                  >
                    <item.icon
                      className={classNames(
                        isActive ? "text-blue-500" : "text-gray-400",
                        "mr-3 h-5 w-5 flex-shrink-0"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-64 flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
            <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
              <nav className="mt-6 flex-1 px-3">
                <ul className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={classNames(
                            isActive
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                            "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                          )}
                        >
                          <item.icon
                            className={classNames(
                              isActive ? "text-blue-500" : "text-gray-400",
                              "mr-3 h-5 w-5 flex-shrink-0"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 