import React, { useState } from 'react'
import { Holding } from '../types/portfolio'
import { usePortfolio } from '../contexts/PortfolioContext'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface HoldingsTableProps {
  holdings: Holding[]
  compact?: boolean
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, compact = false }) => {
  const { updateHolding, deleteHolding } = usePortfolio()
  const [editingHolding, setEditingHolding] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = async (holding: Holding) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const updated = await updateHolding(holding.id, {
        quantity: holding.quantity,
        avg_price: holding.avg_price,
        company_name: holding.company_name
      })

      if (updated) {
        setEditingHolding(null)
      } else {
        setError('Failed to update holding')
      }
    } catch (err) {
      setError('Failed to update holding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (holdingId: string) => {
    if (!window.confirm('Are you sure you want to delete this holding?')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await deleteHolding(holdingId)
      if (!success) {
        setError('Failed to delete holding')
      }
    } catch (err) {
      setError('Failed to delete holding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalValue = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.avg_price), 0)

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">No Holdings</h3>
        <p className="text-sm text-gray-500">Get started by adding your first stock holding.</p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              {!compact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {holdings.map((holding) => (
              <tr key={holding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                    {holding.company_name && (
                      <div className="text-sm text-gray-500">{holding.company_name}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingHolding === holding.id ? (
                    <input
                      type="number"
                      value={holding.quantity}
                      onChange={(e) => {
                        const updatedHolding = { ...holding, quantity: parseInt(e.target.value) || 0 }
                        // Update the holding in the list
                        const index = holdings.findIndex(h => h.id === holding.id)
                        if (index !== -1) {
                          holdings[index] = updatedHolding
                        }
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      min="0"
                    />
                  ) : (
                    holding.quantity.toLocaleString()
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingHolding === holding.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={holding.avg_price}
                      onChange={(e) => {
                        const updatedHolding = { ...holding, avg_price: parseFloat(e.target.value) || 0 }
                        // Update the holding in the list
                        const index = holdings.findIndex(h => h.id === holding.id)
                        if (index !== -1) {
                          holdings[index] = updatedHolding
                        }
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      min="0"
                    />
                  ) : (
                    `$${holding.avg_price.toFixed(2)}`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${(holding.quantity * holding.avg_price).toLocaleString()}
                </td>
                {!compact && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingHolding === holding.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(holding)}
                          disabled={isSubmitting}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => setEditingHolding(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingHolding(holding.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(holding.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {!compact && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900" colSpan={3}>
                  Total Portfolio Value
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ${totalValue.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
