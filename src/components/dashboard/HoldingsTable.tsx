import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react'
import { PortfolioWithHoldings, Holding } from '../../types/portfolio'

interface HoldingsTableProps {
  portfolio: PortfolioWithHoldings | null
}

type SortField = 'symbol' | 'company_name' | 'quantity' | 'avgPrice' | 'currentPrice' | 'totalValue' | 'pnl' | 'pnlPercent'
type SortDirection = 'asc' | 'desc'

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ portfolio }) => {
  const [sortField, setSortField] = useState<SortField>('totalValue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')

  // Use real portfolio holdings data
  const holdingsWithCurrentPrice = useMemo(() => {
    if (!portfolio?.holdings) return []
    
    return portfolio.holdings.map(holding => ({
      ...holding,
      current_price: holding.current_price || holding.avg_price // Use current_price if available, otherwise fallback to avg_price
    }))
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
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />
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

  return (
    <div className="overflow-hidden">
      {/* Search and Summary */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search holdings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500">Total Value: </span>
              <span className="font-semibold text-gray-900">
                ${calculateTotalValue().toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total P&L: </span>
              <span className={`font-semibold ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculateTotalPnL() >= 0 ? '+' : ''}${calculateTotalPnL().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(field as SortField)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {getSortIcon(field as SortField)}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedHoldings.map((holding) => {
              const totalValue = holding.quantity * holding.current_price
              const pnl = (holding.current_price - holding.avg_price) * holding.quantity
              const pnlPercent = ((holding.current_price - holding.avg_price) / holding.avg_price) * 100

              return (
                <tr key={holding.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{holding.company_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {holding.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${holding.avg_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${holding.current_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${totalValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {pnl >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
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
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">No holdings found</h3>
          <p className="text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add your first holding to get started.'}
          </p>
        </div>
      )}
    </div>
  )
}


