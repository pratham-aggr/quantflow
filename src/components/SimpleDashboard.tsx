import React, { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, Plus, RefreshCw, BarChart3, Activity, PieChart } from 'lucide-react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { CumulativeReturnsChart } from './dashboard/CumulativeReturnsChart'
import { PortfolioDrawdownChart } from './dashboard/PortfolioDrawdownChart'

export const SimpleDashboard: React.FC = () => {
  const { currentPortfolio, refreshCurrentPortfolio, loading } = usePortfolio()
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {greeting}, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Message */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Getting your portfolio data...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Fetching latest stock quotes and market data
                </p>
              </div>
            </div>
          </div>
        )}
        

        
        {/* Portfolio Overview Cards */}
        {portfolioMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Value */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(portfolioMetrics.totalValue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Total P&L */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total P&L</p>
                  <p className={`text-2xl font-bold mt-1 ${isGain ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(portfolioMetrics.totalPnL)}
                  </p>
                  <p className={`text-sm mt-1 ${isGain ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(portfolioMetrics.totalPnLPercent)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isGain ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {isGain ? (
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Cash Balance */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cash Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(portfolioMetrics.cashBalance)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </div>

            {/* Holdings Count */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Holdings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {currentPortfolio?.holdings?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Holdings Section */}
        {currentPortfolio?.holdings && currentPortfolio.holdings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
              <Activity className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Portfolio Holdings
            </h2>
            <div className="space-y-3">
              {currentPortfolio.holdings.map((holding) => {
                const totalValue = holding.quantity * (holding.current_price || holding.avg_price)
                const totalCost = holding.quantity * holding.avg_price
                const pnl = totalValue - totalCost
                const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0
                const isHoldingGain = pnl >= 0

                return (
                  <div key={holding.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {holding.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {holding.symbol}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {holding.quantity} shares @ {formatCurrency(holding.avg_price)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          {formatCurrency(totalValue)}
                        </div>
                        <div className={`text-xs font-medium flex items-center justify-end space-x-1 ${
                          isHoldingGain ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
          </div>
        )}

        {/* Cumulative Returns Chart */}
        {currentPortfolio && currentPortfolio.holdings && currentPortfolio.holdings.length > 0 && (
          <div className="mb-8">
            <CumulativeReturnsChart 
              portfolioHoldings={currentPortfolio.holdings}
            />
          </div>
        )}

        {/* Portfolio Drawdown Chart */}
        {currentPortfolio && currentPortfolio.holdings && currentPortfolio.holdings.length > 0 && (
          <div className="mb-8">
            <PortfolioDrawdownChart 
              portfolioHoldings={currentPortfolio.holdings}
            />
          </div>
        )}



        {/* Empty State */}
        {!currentPortfolio?.holdings?.length && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
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
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span>
                {currentPortfolio ? 'Add Your First Stock' : 'Create Portfolio'}
              </span>
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => navigate('/portfolios')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
          
          <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
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
