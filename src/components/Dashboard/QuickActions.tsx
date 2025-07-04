"use client"

import Link from "next/link"
import {
  PlusIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CubeIcon
} from "@heroicons/react/24/outline"

const quickActions = [
  {
    name: "Add Product",
    description: "Add new product to inventory",
    href: "/inventory/add",
    icon: CubeIcon,
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    name: "Record Sale",
    description: "Record a new sale",
    href: "/sales/add",
    icon: CurrencyDollarIcon,
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    name: "Add Expense",
    description: "Record business expense",
    href: "/expenses/add",
    icon: DocumentTextIcon,
    color: "bg-amber-500 hover:bg-amber-600"
  }
]

export default function QuickActions() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className="group relative rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${action.color} text-white transition-colors`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  {action.name}
                </h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 