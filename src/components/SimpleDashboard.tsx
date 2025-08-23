import React, { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, Plus, RefreshCw } from 'lucide-react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export const SimpleDashboard: React.FC = () => {
  const { currentPortfolio, refreshCurrentPortfolio } = usePortfolio()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute to keep greeting current
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Get time-based greeting using current time
  const greeting = React.useMemo(() => {
    const hour = currentTime.getHours()
    
    if (hour >= 5 && hour < 12) {
      return 'Good morning'
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon'
    } else if (hour >= 17 && hour < 22) {
      return 'Good evening'
    } else {
      return 'Good night'
    }
  }, [currentTime])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshCurrentPortfolio()
      console.log('✅ Portfolio refreshed with current market data')
    } catch (error) {
      console.error('❌ Failed to refresh portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

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
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {greeting}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Here's your portfolio performance
            </p>
          </div>

          {/* Portfolio Value Section */}
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-3">
                  {formatCurrency(portfolioMetrics?.totalValue || 0)}
                </h2>
                <div className={`flex items-center space-x-3 text-xl font-semibold ${
                  isGain ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <span>Today:</span>
                <span className={`font-medium ${isGain ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(portfolioMetrics?.totalPnL || 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Cash:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(portfolioMetrics?.cashBalance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Holdings</h3>
          
          {/* Holdings List */}
          <div className="space-y-4">
            {currentPortfolio?.holdings?.map((holding) => {
              const totalValue = holding.quantity * (holding.current_price || holding.avg_price)

              return (
                <div key={holding.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                          {holding.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {holding.symbol}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {holding.company_name || holding.symbol}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-xl text-gray-900 dark:text-white">
                        {formatCurrency(totalValue)}
                      </div>
                      {/* Show daily change if available */}
                      {holding.change !== undefined && holding.changePercent !== undefined && (
                        <div className={`text-lg font-medium flex items-center justify-end space-x-2 ${
                          holding.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {holding.change >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {formatCurrency(Math.abs(holding.change))} ({formatPercent(holding.changePercent)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty State */}
          {!currentPortfolio?.holdings?.length && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                {currentPortfolio ? 'No holdings yet' : 'No portfolio yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
                {currentPortfolio 
                  ? 'Start building your portfolio by adding your first stock'
                  : 'Create your first portfolio to start investing'
                }
              </p>
              <button 
                onClick={() => navigate('/portfolios')}
                className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span>
                  {currentPortfolio ? 'Add Your First Stock' : 'Create Portfolio'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => navigate('/portfolios')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Invest
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentPortfolio ? 'Buy stocks and ETFs' : 'Create portfolio to start'}
                </p>
              </div>
            </div>
          </button>
          
          <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Watchlist
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
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
