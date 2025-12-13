"use client"

import { useState, useEffect } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Expense } from "@/lib/types"
import { useCurrency } from "@/hooks/useCurrency"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"
import Link from "next/link"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentIcon
} from "@heroicons/react/24/outline"

interface ExpensesListProps {
  userId: string
  searchParams: {
    startDate?: string
    endDate?: string
    category?: string
  }
}

export default function ExpensesList({ userId, searchParams }: ExpensesListProps) {
  const { code: currencyCode, loading: currencyLoading } = useCurrency()
  const { currentBusiness } = useBusiness()
  const { showModal } = useModal()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExpenses() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (searchParams.startDate) params.set('startDate', searchParams.startDate)
        if (searchParams.endDate) params.set('endDate', searchParams.endDate)
        if (searchParams.category) params.set('category', searchParams.category)
        params.set('businessId', currentBusiness.id)

        const response = await fetch(`/api/expenses?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setExpenses(data.data)
        } else {
          setError(data.error || 'Failed to fetch expenses')
        }
      } catch (err) {
        setError('Failed to fetch expenses')
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [searchParams, currentBusiness.id])

  const handleDelete = (expenseId: string) => {
    showModal({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE'
          })
          const data = await response.json()

          if (data.success) {
            setExpenses(prev => prev.filter(e => e._id?.toString() !== expenseId))
            showModal({ title: 'Success', message: 'Expense deleted successfully', type: 'success' })
          } else {
            showModal({ title: 'Error', message: data.error || 'Failed to delete expense', type: 'error' })
          }
        } catch (err) {
          showModal({ title: 'Error', message: 'Failed to delete expense', type: 'error' })
        }
      }
    })
  }

  if (loading || currencyLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Expenses ({expenses.length})
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold text-red-600">{formatCurrency(totalExpenses, currencyCode)}</span>
            </p>
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(searchParams).length > 0
              ? "Try adjusting your filters or date range."
              : "Start tracking your business expenses to see them here."
            }
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {expenses.map((expense) => (
            <div key={expense._id?.toString()} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {expense.description}
                        </h4>
                        {expense.receiptUrl && (
                          <DocumentIcon className="h-5 w-5 text-blue-500" title="Has Receipt" />
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                          {expense.category}
                        </span>
                        <span>•</span>
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount and actions */}
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      -{formatCurrency(expense.amount, currencyCode)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/expenses/${expense._id?.toString()}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/expenses/${expense._id?.toString()}/edit`}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Edit Expense"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(expense._id!.toString())}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Expense"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 