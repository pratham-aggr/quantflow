import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Transaction } from '../types/portfolio'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { FunnelIcon } from '@heroicons/react/24/outline'

interface TransactionHistoryProps {
  portfolioId: string
}

interface TransactionFilters {
  type: 'ALL' | 'BUY' | 'SELL'
  dateFrom: string
  dateTo: string
  symbol: string
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ portfolioId }) => {
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'ALL',
    dateFrom: '',
    dateTo: '',
    symbol: ''
  })

  // Fetch transactions using React Query
  const { data: transactions = [], isLoading, error, refetch } = useQuery<Transaction[]>({
    queryKey: ['transactions', portfolioId],
    queryFn: async (): Promise<Transaction[]> => {
      // TODO: Implement real transaction fetching from portfolio service
      // For now, return empty array until transaction service is implemented
      return []
    },
    enabled: !!portfolioId
  })

  // Filter transactions based on current filters
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    if (filters.type !== 'ALL' && transaction.type !== filters.type) return false
    if (filters.symbol && !transaction.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false
    if (filters.dateFrom && new Date(transaction.date) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(transaction.date) > new Date(filters.dateTo)) return false
    return true
  })

  const totalBuyValue = filteredTransactions
    .filter(t => t.type === 'BUY')
    .reduce((sum, transaction) => sum + (transaction.quantity * transaction.price), 0)

  const totalSellValue = filteredTransactions
    .filter(t => t.type === 'SELL')
    .reduce((sum, transaction) => sum + (transaction.quantity * transaction.price), 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load transaction history" 
        onDismiss={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-500 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Transactions</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          {/* Symbol Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Symbol
            </label>
            <input
              type="text"
              placeholder="e.g., AAPL"
              value={filters.symbol}
              onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
          <p className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Total Buy Value</p>
          <p className="text-2xl font-bold text-green-900">${totalBuyValue.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Total Sell Value</p>
          <p className="text-2xl font-bold text-red-900">${totalSellValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No transactions found matching your filters
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'BUY' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(transaction.quantity * transaction.price).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
