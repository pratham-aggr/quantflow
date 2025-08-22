import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, Plus } from 'lucide-react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'

export const SimpleDashboard: React.FC = () => {
  const { currentPortfolio } = usePortfolio()
  const { user } = useAuth()

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!currentPortfolio) return null

    const totalValue = currentPortfolio.holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0) + (currentPortfolio.cash_balance || 0)

    const totalCost = currentPortfolio.holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * holding.avg_price)
    }, 0)

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      cashBalance: currentPortfolio.cash_balance || 0
    }
  }, [currentPortfolio])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const isGain = (portfolioMetrics?.totalPnL || 0) >= 0

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      {/* Header Section */}
      <div className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
              Good morning, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Here's your portfolio performance
            </p>
          </div>

          {/* Portfolio Value Section */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">
                {formatCurrency(portfolioMetrics?.totalValue || 0)}
              </h2>
              <div className={`flex items-center space-x-2 ${
                isGain ? 'text-gain-600' : 'text-loss-600'
              }`}>
                {isGain ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="text-lg font-medium">
                  {formatCurrency(Math.abs(portfolioMetrics?.totalPnL || 0))} ({formatPercent(portfolioMetrics?.totalPnLPercent || 0)})
                </span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-8 text-sm text-neutral-600 dark:text-neutral-400">
              <div>
                <span className="mr-2">Today:</span>
                <span className={isGain ? 'text-gain-600' : 'text-loss-600'}>
                  {formatCurrency(portfolioMetrics?.totalPnL || 0)}
                </span>
              </div>
              <div>
                <span className="mr-2">Cash:</span>
                <span>{formatCurrency(portfolioMetrics?.cashBalance || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Holdings
          </h3>
          <button className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add to Portfolio</span>
          </button>
        </div>

        {/* Holdings List */}
        <div className="space-y-3">
          {currentPortfolio?.holdings?.map((holding) => {
            const currentPrice = holding.current_price || holding.avg_price
            const totalValue = holding.quantity * currentPrice
            const pnl = holding.quantity * (currentPrice - holding.avg_price)
            const pnlPercent = ((currentPrice - holding.avg_price) / holding.avg_price) * 100
            const isHoldingGain = pnl >= 0

            return (
              <div
                key={holding.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                          {holding.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-white">
                          {holding.symbol}
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {holding.company_name || holding.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(totalValue)}
                    </div>
                    <div className={`text-sm flex items-center justify-end space-x-1 ${
                      isHoldingGain ? 'text-gain-600' : 'text-loss-600'
                    }`}>
                      {isHoldingGain ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {formatCurrency(Math.abs(pnl))} ({formatPercent(pnlPercent)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {!currentPortfolio?.holdings?.length && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No holdings yet
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Start building your portfolio by adding your first stock
            </p>
            <button className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Your First Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-left hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white">
                  Invest
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Buy stocks and ETFs
                </p>
              </div>
            </div>
          </button>
          
          <button className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-left hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white">
                  Watchlist
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Track your interests
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
