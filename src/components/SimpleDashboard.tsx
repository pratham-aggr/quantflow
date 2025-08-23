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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-robinhood-dark/80 backdrop-blur-robinhood border-b border-neutral-200 dark:border-robinhood-dark-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold robinhood-text-primary mb-2">
              Good morning, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor'}
            </h1>
            <p className="robinhood-text-secondary text-lg">
              Here's your portfolio performance
            </p>
          </div>

          {/* Portfolio Value Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-5xl font-bold robinhood-text-primary mb-3">
                {formatCurrency(portfolioMetrics?.totalValue || 0)}
              </h2>
              <div className={`flex items-center space-x-3 text-xl font-semibold ${
                isGain ? 'robinhood-gain' : 'robinhood-loss'
              }`}>
                {isGain ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
                <span>
                  {formatCurrency(Math.abs(portfolioMetrics?.totalPnL || 0))} ({formatPercent(portfolioMetrics?.totalPnLPercent || 0)})
                </span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-8 text-sm robinhood-text-secondary">
              <div className="flex items-center space-x-2">
                <span>Today:</span>
                <span className={`font-medium ${isGain ? 'robinhood-gain' : 'robinhood-loss'}`}>
                  {formatCurrency(portfolioMetrics?.totalPnL || 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Cash:</span>
                <span className="font-medium robinhood-text-primary">
                  {formatCurrency(portfolioMetrics?.cashBalance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-semibold robinhood-text-primary">
            Holdings
          </h3>
          <button className="robinhood-btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            <span>Add to Portfolio</span>
          </button>
        </div>

        {/* Holdings List */}
        <div className="space-y-4">
          {currentPortfolio?.holdings?.map((holding) => {
            const currentPrice = holding.current_price || holding.avg_price
            const totalValue = holding.quantity * currentPrice
            const pnl = holding.quantity * (currentPrice - holding.avg_price)
            const pnlPercent = ((currentPrice - holding.avg_price) / holding.avg_price) * 100
            const isHoldingGain = pnl >= 0

            return (
              <div
                key={holding.id}
                className="robinhood-card-hover p-6 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-robinhood flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                          {holding.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg robinhood-text-primary">
                          {holding.symbol}
                        </h4>
                        <p className="robinhood-text-secondary">
                          {holding.company_name || holding.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-xl robinhood-text-primary">
                      {formatCurrency(totalValue)}
                    </div>
                    <div className={`text-lg font-medium flex items-center justify-end space-x-2 ${
                      isHoldingGain ? 'robinhood-gain' : 'robinhood-loss'
                    }`}>
                      {isHoldingGain ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
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
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-2xl font-semibold robinhood-text-primary mb-3">
              No holdings yet
            </h3>
            <p className="robinhood-text-secondary text-lg mb-8 max-w-md mx-auto">
              Start building your portfolio by adding your first stock
            </p>
            <button className="robinhood-btn-primary text-lg px-8 py-4">
              <Plus className="w-5 h-5 mr-2" />
              <span>Add Your First Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="robinhood-card-hover p-6 text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-robinhood flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h4 className="font-semibold text-lg robinhood-text-primary">
                  Invest
                </h4>
                <p className="robinhood-text-secondary">
                  Buy stocks and ETFs
                </p>
              </div>
            </div>
          </button>
          
          <button className="robinhood-card-hover p-6 text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-robinhood flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h4 className="font-semibold text-lg robinhood-text-primary">
                  Watchlist
                </h4>
                <p className="robinhood-text-secondary">
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
