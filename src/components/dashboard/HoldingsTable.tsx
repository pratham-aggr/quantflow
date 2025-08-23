import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, MoreHorizontal, Trash2 } from 'lucide-react'
import { PortfolioWithHoldings, Holding } from '../../types/portfolio'
import { usePortfolio } from '../../contexts/PortfolioContext'
import { useToast } from '../Toast'

interface HoldingsTableProps {
  portfolio: PortfolioWithHoldings | null
}

type SortField = 'symbol' | 'company_name' | 'quantity' | 'avgPrice' | 'currentPrice' | 'totalValue' | 'pnl' | 'pnlPercent'
type SortDirection = 'asc' | 'desc'

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ portfolio }) => {
  const [sortField, setSortField] = useState<SortField>('totalValue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null)
  
  const { deleteHolding } = usePortfolio()
  const { success: showSuccess, error: showError } = useToast()

  // Use real portfolio holdings data with market prices
  const holdingsWithCurrentPrice = useMemo(() => {
    if (!portfolio?.holdings) return []
    
    return portfolio.holdings.map(holding => {
      return {
        ...holding,
        current_price: holding.current_price || holding.avg_price // Use real market price or fallback to avg_price
      }
    })
  }, [portfolio?.holdings])

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = holdingsWithCurrentPrice.filter(holding =>
      holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (holding.company_name && holding.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'symbol':
          aValue = a.symbol
          bValue = b.symbol
          break
        case 'company_name':
          aValue = a.company_name || ''
          bValue = b.company_name || ''
          break
        case 'quantity':
          aValue = a.quantity
          bValue = b.quantity
          break
        case 'avgPrice':
          aValue = a.avg_price
          bValue = b.avg_price
          break
        case 'currentPrice':
          aValue = a.current_price
          bValue = b.current_price
          break
        case 'totalValue':
          aValue = a.quantity * a.current_price
          bValue = b.quantity * b.current_price
          break
        case 'pnl':
          aValue = (a.current_price - a.avg_price) * a.quantity
          bValue = (b.current_price - b.avg_price) * b.quantity
          break
        case 'pnlPercent':
          aValue = ((a.current_price - a.avg_price) / a.avg_price) * 100
          bValue = ((b.current_price - b.avg_price) / b.avg_price) * 100
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [holdingsWithCurrentPrice, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      : <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }

  const calculateTotalValue = () => {
    return filteredAndSortedHoldings.reduce((sum, holding) => 
      sum + (holding.quantity * holding.current_price), 0
    )
  }

  const calculateTotalPnL = () => {
    return filteredAndSortedHoldings.reduce((sum, holding) => 
      sum + ((holding.current_price - holding.avg_price) * holding.quantity), 0
    )
  }

  const handleDeleteHolding = async (holdingId: string, symbol: string) => {
    if (!window.confirm(`Are you sure you want to delete ${symbol} from your holdings? This action cannot be undone.`)) {
      return
    }

    setDeletingHoldingId(holdingId)
    
    try {
      const deleteSuccess = await deleteHolding(holdingId)
      if (deleteSuccess) {
        showSuccess(`${symbol} has been removed from your holdings`)
      } else {
        showError('Failed to delete holding. Please try again.')
      }
    } catch (err) {
      console.error('Error deleting holding:', err)
      showError('Failed to delete holding. Please try again.')
    } finally {
      setDeletingHoldingId(null)
    }
  }

  return (
    <div className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Search and Summary */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search holdings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Value: </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${calculateTotalValue().toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total P&L: </span>
              <span className={`font-semibold ${calculateTotalPnL() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {calculateTotalPnL() >= 0 ? '+' : ''}${calculateTotalPnL().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {[
                { field: 'symbol', label: 'Symbol' },
                { field: 'company_name', label: 'Company' },
                { field: 'quantity', label: 'Quantity' },
                { field: 'avgPrice', label: 'Avg Price' },
                { field: 'currentPrice', label: 'Current Price' },
                { field: 'totalValue', label: 'Total Value' },
                { field: 'pnl', label: 'P&L' },
                { field: 'pnlPercent', label: 'P&L %' }
              ].map(({ field, label }) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort(field as SortField)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {getSortIcon(field as SortField)}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedHoldings.map((holding) => {
              const totalValue = holding.quantity * holding.current_price
              const pnl = (holding.current_price - holding.avg_price) * holding.quantity
              const pnlPercent = ((holding.current_price - holding.avg_price) / holding.avg_price) * 100

              return (
                <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{holding.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{holding.company_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {holding.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${holding.avg_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${holding.current_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${totalValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {pnl >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleDeleteHolding(holding.id, holding.symbol)}
                        disabled={deletingHoldingId === holding.id}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete holding"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredAndSortedHoldings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No holdings found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add your first holding to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}


