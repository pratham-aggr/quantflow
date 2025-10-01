import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'

import { PerformanceChart } from './dashboard/PerformanceChart'
import { HoldingsTable } from './dashboard/HoldingsTable'
import { SkeletonDashboard, SkeletonHoldingsTable } from './Skeleton'
import { useToast } from './Toast'
import { RefreshCw, Shield, AlertCircle } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio, loading, error, refreshPortfolios } = usePortfolio()
  const { info, success: showSuccess, error: showError } = useToast()
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate real portfolio data from current portfolio
  const calculatePortfolioData = () => {
    if (!currentPortfolio?.holdings || currentPortfolio.holdings.length === 0) {
      // Return empty data structure when no holdings exist
      return {
        totalValue: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        riskScore: 0,
        allocation: [],
        performance: {
          '1D': [0],
          '1W': [0],
          '1M': [0],
          '1Y': [0]
        }
      }
    }

    const holdings = currentPortfolio.holdings
    
    // Use real market prices from holdings (already fetched by portfolio service)
    const holdingsWithPrices = holdings.map(holding => {
      return {
        ...holding,
        current_price: holding.current_price || holding.avg_price, // Fallback to avg_price if no current_price
        sector: holding.sector || 'Technology' // Default sector
      }
    })
    
    const totalValue = holdingsWithPrices.reduce((sum, holding) => {
      return sum + (holding.quantity * holding.current_price)
    }, 0)

    const totalCost = holdingsWithPrices.reduce((sum, holding) => {
      return sum + (holding.quantity * holding.avg_price)
    }, 0)

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    // Calculate daily P&L based on real market data changes
    const dailyPnL = holdingsWithPrices.reduce((sum, holding) => {
      const dailyChange = (holding.change || 0) * holding.quantity
      return sum + dailyChange
    }, 0)
    
    const dailyPnLPercent = totalValue > 0 ? (dailyPnL / totalValue) * 100 : 0

    // Calculate sector allocation
    const sectorMap = new Map<string, number>()
    holdingsWithPrices.forEach(holding => {
      const sector = holding.sector
      const value = holding.quantity * holding.current_price
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
    })

    const allocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
      sector,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))

    // Performance data will be fetched from historical API
    // For now, return empty arrays - will be populated by PerformanceChart component
    const performance = {
      '1D': [],
      '1W': [],
      '1M': [],
      '1Y': []
    }

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      dailyPnL: Math.round(dailyPnL * 100) / 100, // Real daily P&L based on market changes
      dailyPnLPercent: Math.round(dailyPnLPercent * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      totalPnLPercent: Math.round(totalPnLPercent * 100) / 100,
      riskScore: Math.round(Math.min(100, Math.max(0, 50 + (totalPnLPercent / 2))) * 100) / 100, // Simplified risk score
      allocation: allocation.map(item => ({
        ...item,
        value: Math.round(item.value * 100) / 100,
        percentage: Math.round(item.percentage * 100) / 100
      })),
      performance
    }
  }

  const portfolioData = calculatePortfolioData()
  
  // Debug logging
  console.log('Dashboard Debug:', {
    currentPortfolio,
    holdings: currentPortfolio?.holdings,
    portfolioData
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshPortfolios()
      info('Portfolio Updated', 'Your portfolio data has been refreshed.')
    } catch (error) {
      console.error('Failed to refresh portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Add global function for manual refresh from console
  React.useEffect(() => {
    // @ts-ignore
    window.refreshPortfolioData = async () => {
      console.log('🔄 Manual portfolio refresh triggered...')
      setIsRefreshing(true)
      try {
        await refreshPortfolios()
        console.log('✅ Portfolio refreshed successfully!')
        showSuccess('Portfolio Refreshed', 'Holdings updated with latest market data')
      } catch (error) {
        console.error('❌ Failed to refresh portfolio:', error)
        showError('Refresh Failed', 'Unable to update portfolio data. Please try again.')
      } finally {
        setIsRefreshing(false)
      }
    }
    
    console.log('💡 Manual refresh available! Type: window.refreshPortfolioData() in console')
  }, [refreshPortfolios])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonDashboard />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-red-400 mr-2" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Portfolio</h3>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Clean Portfolio Summary */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Total Value */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${portfolioData.totalValue.toLocaleString()}
            </p>
          </div>
          
          {/* Total P&L */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Return</p>
            <p className={`text-3xl font-bold ${portfolioData.totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ${Math.abs(portfolioData.totalPnL).toLocaleString()}
            </p>
            <p className={`text-sm ${portfolioData.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioData.totalPnLPercent >= 0 ? '+' : ''}{portfolioData.totalPnLPercent.toFixed(2)}%
            </p>
          </div>
          
          {/* Daily P&L */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Today</p>
            <p className={`text-3xl font-bold ${portfolioData.dailyPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ${Math.abs(portfolioData.dailyPnL).toLocaleString()}
            </p>
            <p className={`text-sm ${portfolioData.dailyPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioData.dailyPnLPercent >= 0 ? '+' : ''}{portfolioData.dailyPnLPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Performance Chart - Clean */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h3>
            <div className="flex space-x-2">
              {(['1D', '1W', '1M', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    timeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <PerformanceChart 
            data={portfolioData.performance[timeRange]} 
            timeRange={timeRange}
          />
        </div>

        {/* Holdings Table - Clean */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Holdings</h3>
          </div>
          <HoldingsTable portfolio={currentPortfolio} />
        </div>
      </div>
    </div>
  )
}
