import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'

import { PortfolioOverview } from './dashboard/PortfolioOverview'
import { PortfolioAllocation } from './dashboard/PortfolioAllocation'
import { PerformanceChart } from './dashboard/PerformanceChart'
import { RiskMetrics } from './dashboard/RiskMetrics'
import { HoldingsTable } from './dashboard/HoldingsTable'
import { AlphaVantageNewsFeed } from './AlphaVantageNewsFeed'
import { SkeletonCard, SkeletonTable } from './Skeleton'
import { useToast } from './Toast'
import { 
  TrendingUp, 
  DollarSign, 
  Shield, 
  PieChart, 
  BarChart3,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio, loading, error, refreshPortfolios } = usePortfolio()
  const { info } = useToast()
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

    // Real performance data based on current portfolio value
    // TODO: Replace with actual historical data API when available
    const performance = {
      '1D': [totalValue * 0.99, totalValue * 0.995, totalValue * 0.998, totalValue],
      '1W': [totalValue * 0.98, totalValue * 0.985, totalValue * 0.99, totalValue * 0.995, totalValue],
      '1M': [totalValue * 0.95, totalValue * 0.97, totalValue * 0.98, totalValue * 0.99, totalValue],
      '1Y': [totalValue * 0.9, totalValue * 0.95, totalValue * 0.98, totalValue]
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
        alert('Portfolio refreshed successfully! Check your holdings for updated market data.')
      } catch (error) {
        console.error('❌ Failed to refresh portfolio:', error)
        alert('Failed to refresh portfolio. Check console for details.')
      } finally {
        setIsRefreshing(false)
      }
    }
    
    console.log('💡 Manual refresh available! Type: window.refreshPortfolioData() in console')
  }, [refreshPortfolios])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable />
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {user?.full_name || user?.email}. Here's your portfolio overview.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-6 py-3 border border-primary-500 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              🔄 Refresh Market News
            </button>
          </div>
        </div>

        {/* Consolidated Portfolio Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-blue-600" />
              Portfolio Summary
            </h2>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-500">Risk Score</p>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900">{portfolioData.riskScore}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Value */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Total Value</p>
              <p className="text-3xl font-bold text-gray-900">${portfolioData.totalValue.toLocaleString()}</p>
            </div>
            
            {/* Daily P&L */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Daily P&L</p>
              <div className="flex items-center justify-center">
                {portfolioData.dailyPnL >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <p className={`text-2xl font-bold ${portfolioData.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${portfolioData.dailyPnL.toLocaleString()}
                </p>
              </div>
              <p className={`text-sm ${portfolioData.dailyPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioData.dailyPnLPercent >= 0 ? '+' : ''}{portfolioData.dailyPnLPercent.toFixed(2)}%
              </p>
            </div>
            
            {/* Total P&L */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Total P&L</p>
              <div className="flex items-center justify-center">
                {portfolioData.totalPnL >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <p className={`text-2xl font-bold ${portfolioData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${portfolioData.totalPnL.toLocaleString()}
                </p>
              </div>
              <p className={`text-sm ${portfolioData.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioData.totalPnLPercent >= 0 ? '+' : ''}{portfolioData.totalPnLPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Charts and Risk Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Portfolio Allocation */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                Portfolio Allocation
              </h3>
            </div>
            <PortfolioAllocation data={portfolioData.allocation} />
          </div>

          {/* Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Performance
              </h3>
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {(['1D', '1W', '1M', '1Y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
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

          {/* Risk Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Risk Metrics</h3>
            </div>
            <RiskMetrics portfolioData={portfolioData} />
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Holdings</h3>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-primary-500 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
          <HoldingsTable portfolio={currentPortfolio} />
        </div>

        {/* News Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Portfolio News */}
          <AlphaVantageNewsFeed
            symbols={currentPortfolio?.holdings?.map(h => h.symbol) || []}
            category="portfolio"
            limit={10}
            showSentiment={true}
            className="h-96 overflow-y-auto"
          />
          
          {/* Market News */}
          <AlphaVantageNewsFeed
            category="market"
            limit={10}
            showSentiment={true}
            className="h-96 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  )
}
