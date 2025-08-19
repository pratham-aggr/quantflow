import React, { useState, useEffect } from 'react'
import { PortfolioWithHoldings } from '../types/portfolio'
import { stockPriceService } from '../lib/stockPriceService'
import { LoadingSpinner } from './LoadingSpinner'
import { useMultipleStockPrices } from '../hooks/useStockPrice'

interface PortfolioSummaryProps {
  portfolio: PortfolioWithHoldings
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio }) => {
  const symbols = portfolio.holdings.map(h => h.symbol)
  
  // Use real-time stock prices with auto-refresh every 30 seconds
  const { data: stockPrices, loading: pricesLoading, error: pricesError } = useMultipleStockPrices({
    symbols,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    enabled: symbols.length > 0
  })

  // Calculate portfolio value with real-time prices
  const portfolioValue = React.useMemo(() => {
    if (portfolio.holdings.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        holdingsWithPrices: []
      }
    }

    let totalValue = 0
    let totalCost = 0
    const holdingsWithPrices = portfolio.holdings.map(holding => {
      const currentPrice = stockPrices[holding.symbol]?.price || holding.avg_price
      const currentValue = holding.quantity * currentPrice
      const costBasis = holding.quantity * holding.avg_price
      const gainLoss = currentValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      
      totalValue += currentValue
      totalCost += costBasis
      
      return {
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgPrice: holding.avg_price,
        currentPrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent
      }
    })
    
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0
    
    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdingsWithPrices
    }
  }, [portfolio.holdings, stockPrices])

  const loading = pricesLoading && symbols.length > 0

  const totalHoldingsValue = portfolioValue?.totalValue || portfolio.holdings.reduce(
    (sum, holding) => sum + (holding.quantity * holding.avg_price), 0
  )
  
  const totalPortfolioValue = portfolio.cash_balance + totalHoldingsValue
  const cashPercentage = totalPortfolioValue > 0 ? (portfolio.cash_balance / totalPortfolioValue) * 100 : 0
  const holdingsPercentage = totalPortfolioValue > 0 ? (totalHoldingsValue / totalPortfolioValue) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
        
        {/* Total Value Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Portfolio Value</p>
              {loading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-3xl font-bold">Loading...</span>
                </div>
              ) : (
                <p className="text-3xl font-bold">${totalPortfolioValue.toLocaleString()}</p>
              )}
              {portfolioValue && portfolioValue.totalGainLoss !== 0 && (
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    portfolioValue.totalGainLoss >= 0 ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {portfolioValue.totalGainLoss >= 0 ? '+' : ''}${portfolioValue.totalGainLoss.toLocaleString()} 
                    ({portfolioValue.totalGainLossPercent >= 0 ? '+' : ''}{portfolioValue.totalGainLossPercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Portfolio</p>
              <p className="text-xl font-semibold">{portfolio.name}</p>
            </div>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Cash</h4>
              <span className="text-sm text-gray-500">{cashPercentage.toFixed(1)}%</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${portfolio.cash_balance.toLocaleString()}
            </p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${cashPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Holdings</h4>
              <span className="text-sm text-gray-500">{holdingsPercentage.toFixed(1)}%</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ${totalHoldingsValue.toLocaleString()}
            </p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${holdingsPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Holdings Summary */}
        {portfolio.holdings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Holdings Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Stocks</p>
                <p className="font-medium text-gray-900">{portfolio.holdings.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Average Price</p>
                <p className="font-medium text-gray-900">
                  ${(totalHoldingsValue / portfolio.holdings.reduce((sum, h) => sum + h.quantity, 0)).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total Shares</p>
                <p className="font-medium text-gray-900">
                  {portfolio.holdings.reduce((sum, holding) => sum + holding.quantity, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">
                  {new Date(portfolio.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {portfolio.holdings.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Holdings Yet</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Start building your portfolio by adding your first stock holding.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
