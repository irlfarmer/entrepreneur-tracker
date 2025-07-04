"use client"

import { formatCurrency, formatDate } from "@/lib/utils"
import { useCurrency } from "@/hooks/useCurrency"
import { ArrowLeftIcon, PencilIcon, DocumentIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

interface SerializedExpense {
  _id?: string
  userId: string
  category: string
  description: string
  amount: number
  expenseDate: string
  notes?: string
  receiptUrl?: string
  createdAt: string
}

interface ExpenseViewClientProps {
  expense: SerializedExpense
}

export default function ExpenseViewClient({ expense }: ExpenseViewClientProps) {
  const { code: currencyCode } = useCurrency()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/expenses"
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Back to Expenses"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Details</h1>
            <p className="text-gray-600">{expense.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/expenses/${expense._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Expense
          </Link>
        </div>
      </div>

      {/* Expense Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Description:</span>
              <span className="font-medium text-gray-900">{expense.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Category:</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                {expense.category}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-semibold text-red-600 text-lg">
                {formatCurrency(expense.amount, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Date:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(expense.expenseDate))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="font-medium text-gray-900">{formatDate(new Date(expense.createdAt))}</span>
            </div>
            {expense.receiptUrl && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Receipt:</span>
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="h-4 w-4 text-blue-500" />
                  <a 
                    href={expense.receiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    View Receipt
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="space-y-3">
            {expense.notes ? (
              <div>
                <label className="text-sm text-gray-600 block mb-2">Notes:</label>
                <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                  {expense.notes}
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 italic py-8">
                No additional notes for this expense
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Summary */}
      <div className="bg-red-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(expense.amount, currencyCode)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-lg font-medium text-gray-900">{expense.category}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-lg font-medium text-gray-900">
              {formatDate(new Date(expense.expenseDate))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 