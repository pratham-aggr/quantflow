import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'

import { PortfolioOverview } from './dashboard/PortfolioOverview'
import { PortfolioAllocation } from './dashboard/PortfolioAllocation'
import { PerformanceChart } from './dashboard/PerformanceChart'
import { RiskMetrics } from './dashboard/RiskMetrics'
import { HoldingsTable } from './dashboard/HoldingsTable'
import { SkeletonCard, SkeletonTable } from './Skeleton'
import { useToast } from './Toast'
import { 
  TrendingUp, 
  DollarSign, 
  Shield, 
  PieChart, 
  BarChart3,
  Activity,
  RefreshCw
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
      // Return sample data for testing if no holdings
      return {
        totalValue: 125000.00,
        dailyPnL: 1250.00,
        dailyPnLPercent: 1.01,
        totalPnL: 15000.00,
        totalPnLPercent: 13.64,
        riskScore: 65.00,
        allocation: [
          { sector: 'Technology', value: 45000.00, percentage: 36.00 },
          { sector: 'Healthcare', value: 30000.00, percentage: 24.00 },
          { sector: 'Finance', value: 25000.00, percentage: 20.00 },
          { sector: 'Consumer', value: 15000.00, percentage: 12.00 },
          { sector: 'Energy', value: 10000.00, percentage: 8.00 }
        ],
        performance: {
          '1D': [120000, 121000, 122500, 123000, 124500, 125000],
          '1W': [118000, 119500, 121000, 122000, 123500, 124000, 125000],
          '1M': [110000, 112000, 115000, 118000, 120000, 122000, 125000],
          '1Y': [100000, 105000, 110000, 115000, 120000, 125000]
        }
      }
    }

    const holdings = currentPortfolio.holdings
    
    // Add sample current prices if missing
    const holdingsWithPrices = holdings.map(holding => {
      // Generate a consistent price variation based on symbol
      const symbolHash = holding.symbol.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
      const variation = ((symbolHash % 20) - 10) / 100 // ±10% variation based on symbol
      const sectorIndex = symbolHash % 5
      
      return {
        ...holding,
        current_price: holding.current_price || Math.round(holding.avg_price * (1 + variation) * 100) / 100,
        sector: holding.sector || ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy'][sectorIndex]
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

    // Mock performance data for now - replace with real historical data API
    const performance = {
      '1D': [totalValue * 0.99, totalValue * 0.995, totalValue * 0.998, totalValue],
      '1W': [totalValue * 0.98, totalValue * 0.985, totalValue * 0.99, totalValue * 0.995, totalValue],
      '1M': [totalValue * 0.95, totalValue * 0.97, totalValue * 0.98, totalValue * 0.99, totalValue],
      '1Y': [totalValue * 0.9, totalValue * 0.95, totalValue * 0.98, totalValue]
    }

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      dailyPnL: Math.round(totalPnL * 0.1 * 100) / 100, // Simplified daily P&L calculation
      dailyPnLPercent: Math.round(totalPnLPercent * 0.1 * 100) / 100,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PortfolioOverview
            title="Total Value"
            value={`$${portfolioData.totalValue.toLocaleString()}`}
            change={portfolioData.dailyPnL}
            changePercent={portfolioData.dailyPnLPercent}
            icon={DollarSign}
            trend={portfolioData.dailyPnL >= 0 ? 'up' : 'down'}
          />
          <PortfolioOverview
            title="Daily P&L"
            value={`$${portfolioData.dailyPnL.toLocaleString()}`}
            change={portfolioData.dailyPnLPercent}
            changePercent={portfolioData.dailyPnLPercent}
            icon={Activity}
            trend={portfolioData.dailyPnL >= 0 ? 'up' : 'down'}
            isPercentage
          />
          <PortfolioOverview
            title="Total P&L"
            value={`$${portfolioData.totalPnL.toLocaleString()}`}
            change={portfolioData.totalPnLPercent}
            changePercent={portfolioData.totalPnLPercent}
            icon={BarChart3}
            trend={portfolioData.totalPnL >= 0 ? 'up' : 'down'}
            isPercentage
          />
          <PortfolioOverview
            title="Risk Score"
            value={portfolioData.riskScore.toString()}
            change={null}
            changePercent={null}
            icon={Shield}
            trend="neutral"
            isRisk
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
        </div>

        {/* Risk Metrics */}
        <div className="mb-8">
          <RiskMetrics portfolioData={portfolioData} />
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Holdings</h3>
          </div>
          <HoldingsTable portfolio={currentPortfolio} />
        </div>
      </div>
    </div>
  )
}
