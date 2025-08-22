import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { Navigation } from './Navigation'
import { PortfolioOverview } from './dashboard/PortfolioOverview'
import { PortfolioAllocation } from './dashboard/PortfolioAllocation'
import { PerformanceChart } from './dashboard/PerformanceChart'
import { RiskMetrics } from './dashboard/RiskMetrics'
import { HoldingsTable } from './dashboard/HoldingsTable'
import { SkeletonCard, SkeletonTable } from './Skeleton'
import { useToast } from './Toast'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  PieChart, 
  BarChart3,
  Activity,
  Calendar,
  RefreshCw
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const { portfolios, currentPortfolio, loading, error, refreshPortfolios } = usePortfolio()
  const { info } = useToast()
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mock data for demonstration - replace with real API calls
  const mockPortfolioData = {
    totalValue: 125000,
    dailyPnL: 1250,
    dailyPnLPercent: 1.01,
    totalPnL: 15000,
    totalPnLPercent: 13.64,
    riskScore: 65,
    allocation: [
      { sector: 'Technology', value: 45000, percentage: 36 },
      { sector: 'Healthcare', value: 30000, percentage: 24 },
      { sector: 'Finance', value: 25000, percentage: 20 },
      { sector: 'Consumer', value: 15000, percentage: 12 },
      { sector: 'Energy', value: 10000, percentage: 8 }
    ],
    performance: {
      '1D': [120000, 121000, 122500, 123000, 124500, 125000],
      '1W': [118000, 119500, 121000, 122000, 123500, 124000, 125000],
      '1M': [110000, 112000, 115000, 118000, 120000, 122000, 125000],
      '1Y': [100000, 105000, 110000, 115000, 120000, 125000]
    }
  }

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
        <Navigation />
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
        <Navigation />
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
      <Navigation />
      
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
            value={`$${mockPortfolioData.totalValue.toLocaleString()}`}
            change={mockPortfolioData.dailyPnL}
            changePercent={mockPortfolioData.dailyPnLPercent}
            icon={DollarSign}
            trend={mockPortfolioData.dailyPnL >= 0 ? 'up' : 'down'}
          />
          <PortfolioOverview
            title="Daily P&L"
            value={`$${mockPortfolioData.dailyPnL.toLocaleString()}`}
            change={mockPortfolioData.dailyPnLPercent}
            changePercent={mockPortfolioData.dailyPnLPercent}
            icon={Activity}
            trend={mockPortfolioData.dailyPnL >= 0 ? 'up' : 'down'}
            isPercentage
          />
          <PortfolioOverview
            title="Total P&L"
            value={`$${mockPortfolioData.totalPnL.toLocaleString()}`}
            change={mockPortfolioData.totalPnLPercent}
            changePercent={mockPortfolioData.totalPnLPercent}
            icon={BarChart3}
            trend={mockPortfolioData.totalPnL >= 0 ? 'up' : 'down'}
            isPercentage
          />
          <PortfolioOverview
            title="Risk Score"
            value={mockPortfolioData.riskScore.toString()}
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
            <PortfolioAllocation data={mockPortfolioData.allocation} />
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
              data={mockPortfolioData.performance[timeRange]} 
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="mb-8">
          <RiskMetrics portfolioData={mockPortfolioData} />
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
