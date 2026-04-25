"use client"

import { useState } from "react"
import Link from "next/link"
import { PlusIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline"
import ImportBumpaModal from "./ImportBumpaModal"

export default function InventoryActions() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  return (
    <>
      <div className="flex space-x-3">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors bg-white shadow-sm"
        >
          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
          Import from Bumpa
        </button>
        <Link
          href="/inventory/add"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Product
        </Link>
      </div>

      <ImportBumpaModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
    </>
  )
}
