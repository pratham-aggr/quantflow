import React, { useState, useEffect, useMemo } from 'react'
import { AdvancedRiskDashboard } from './AdvancedRiskDashboard'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Activity,
  Target,
  RefreshCw,
  Info
} from 'lucide-react'

// Local risk calculation functions
const calculateLocalRiskMetrics = (holdings: any[]) => {
  if (!holdings || holdings.length === 0) {
    return {
      riskScore: 0,
      riskLevel: 'No Data',
      portfolioVolatility: 0,
      sharpeRatio: 0,
      var95: 0,
      totalValue: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      sectorAllocation: {},
      concentrationRisk: 0,
      diversificationScore: 0
    }
  }

  // Calculate total portfolio value and P&L
  const totalValue = holdings.reduce((sum, holding) => {
    const currentValue = holding.quantity * (holding.current_price || holding.avg_price)
    return sum + currentValue
  }, 0)

  const totalCost = holdings.reduce((sum, holding) => {
    return sum + (holding.quantity * holding.avg_price)
  }, 0)

  const totalPnL = totalValue - totalCost
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  // Calculate sector allocation
  const sectorMap = new Map<string, number>()
  holdings.forEach(holding => {
    const sector = holding.sector || 'Unknown'
    const value = holding.quantity * (holding.current_price || holding.avg_price)
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
  })

  const sectorAllocation: Record<string, number> = {}
  sectorMap.forEach((value, sector) => {
    sectorAllocation[sector] = totalValue > 0 ? (value / totalValue) * 100 : 0
  })

  // Calculate concentration risk (how much is in top holdings)
  const sortedHoldings = [...holdings].sort((a, b) => {
    const aValue = a.quantity * (a.current_price || a.avg_price)
    const bValue = b.quantity * (b.current_price || b.avg_price)
    return bValue - aValue
  })

  const topHoldingsValue = sortedHoldings.slice(0, 3).reduce((sum, holding) => {
    return sum + (holding.quantity * (holding.current_price || holding.avg_price))
  }, 0)

  const concentrationRisk = totalValue > 0 ? topHoldingsValue / totalValue : 0

  // Calculate diversification score based on number of holdings and sectors
  const numHoldings = holdings.length
  const numSectors = sectorMap.size
  const diversificationScore = Math.min(1, (numHoldings * numSectors) / 50) // Normalize to 0-1

  // Calculate risk score based on multiple factors
  let riskScore = 5 // Base moderate risk

  // Adjust based on P&L
  if (totalPnLPercent > 20) riskScore += 2
  else if (totalPnLPercent < -10) riskScore -= 1

  // Adjust based on concentration
  if (concentrationRisk > 0.6) riskScore += 2
  else if (concentrationRisk < 0.3) riskScore -= 1

  // Adjust based on diversification
  if (diversificationScore < 0.3) riskScore += 2
  else if (diversificationScore > 0.7) riskScore -= 1

  // Adjust based on number of holdings
  if (numHoldings < 5) riskScore += 1
  else if (numHoldings > 15) riskScore -= 1

  // Clamp risk score to 1-10
  riskScore = Math.max(1, Math.min(10, riskScore))

  // Calculate risk level
  const getRiskLevel = (score: number) => {
    if (score <= 2) return 'Very Low'
    if (score <= 4) return 'Low'
    if (score <= 6) return 'Moderate'
    if (score <= 8) return 'High'
    return 'Very High'
  }

  // Estimate volatility based on P&L volatility and concentration
  const estimatedVolatility = Math.min(0.5, Math.max(0.05, 
    (Math.abs(totalPnLPercent) / 100) + (concentrationRisk * 0.3)
  ))

  // Calculate Sharpe ratio (simplified)
  const riskFreeRate = 0.02 // Assume 2% risk-free rate
  const sharpeRatio = estimatedVolatility > 0 ? (totalPnLPercent / 100 - riskFreeRate) / estimatedVolatility : 0

  // Calculate VaR (simplified)
  const var95 = totalValue * estimatedVolatility * 1.645 * Math.sqrt(1/252) // Daily VaR

  return {
    riskScore: Math.round(riskScore * 10) / 10,
    riskLevel: getRiskLevel(riskScore),
    portfolioVolatility: estimatedVolatility,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    var95: Math.round(var95 * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPercent: Math.round(totalPnLPercent * 100) / 100,
    sectorAllocation,
    concentrationRisk: Math.round(concentrationRisk * 100) / 100,
    diversificationScore: Math.round(diversificationScore * 100) / 100
  }
}

export const RiskAnalysis: React.FC = () => {
  const { currentPortfolio } = usePortfolio()
  const { user } = useAuth()
  const { info, error: showError } = useToast()
  const [useAdvancedEngine, setUseAdvancedEngine] = useState(true)
  const [engineAvailable, setEngineAvailable] = useState(false)
  const [isCheckingEngine, setIsCheckingEngine] = useState(true)

  // Check if advanced risk engine is available
  useEffect(() => {
    const checkEngineAvailability = async () => {
      setIsCheckingEngine(true)
      try {
        console.log('Checking risk engine availability...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        // Check if we have a risk engine URL configured
        const riskEngineUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'https://quantflow-production.up.railway.app'
        
        console.log('🔍 Risk engine URL from env:', process.env.REACT_APP_RISK_ENGINE_URL)
        console.log('🔍 Final risk engine URL:', riskEngineUrl)
        console.log('🔍 All env vars:', Object.keys(process.env).filter(key => key.includes('RISK')))
        console.log('🔍 Attempting to fetch from:', `${riskEngineUrl}/health`)
        
        const response = await fetch(`${riskEngineUrl}/health`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        console.log('🔍 Risk engine response status:', response.status, response.statusText)
        console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          try {
            const responseText = await response.text()
            console.log('🔍 Raw response text:', responseText)
            const data = JSON.parse(responseText)
            console.log('Risk engine data:', data)
            setEngineAvailable(true)
            info('Advanced Engine Available', 'Using advanced risk analysis engine')
          } catch (parseError) {
            console.error('🔍 JSON parse error:', parseError)
            console.error('🔍 Response text that failed to parse:', await response.text())
            setEngineAvailable(false)
            setUseAdvancedEngine(false)
            showError('Engine Unavailable', 'Advanced engine response format error')
          }
        } else {
          console.log('Risk engine not responding properly:', response.status)
          setEngineAvailable(false)
          setUseAdvancedEngine(false)
          showError('Engine Unavailable', 'Advanced engine unavailable, using local analysis')
        }
      } catch (err) {
        console.error('🔍 Risk engine check error:', err)
        if (err instanceof Error) {
          console.error('🔍 Error type:', err.constructor.name)
          console.error('🔍 Error message:', err.message)
          if (err instanceof TypeError) {
            console.error('🔍 This might be a CORS or network error')
          }
        }
        setEngineAvailable(false)
        setUseAdvancedEngine(false)
        showError('Engine Unavailable', 'Advanced engine unavailable, using local analysis')
      } finally {
        setIsCheckingEngine(false)
      }
    }

    checkEngineAvailability()
  }, []) // Remove dependencies to prevent infinite re-runs

  // Calculate local risk metrics
  const localRiskMetrics = useMemo(() => {
    return calculateLocalRiskMetrics(currentPortfolio?.holdings || [])
  }, [currentPortfolio?.holdings])

  if (!currentPortfolio?.holdings || currentPortfolio.holdings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary flex items-center justify-center">
        <div className="robinhood-card p-12 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold robinhood-text-primary mb-4">
            Risk Analysis
          </h2>
          <p className="robinhood-text-secondary text-lg mb-6">
            Please add some holdings to your portfolio to view risk analysis.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Info className="w-5 h-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Risk analysis requires portfolio holdings with market data.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isCheckingEngine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary flex items-center justify-center">
        <div className="robinhood-card p-12 text-center">
          <RefreshCw className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-3xl font-bold robinhood-text-primary mb-4">
            Initializing Risk Analysis
          </h2>
          <p className="robinhood-text-secondary text-lg">
            Checking advanced risk engine availability...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold robinhood-text-primary mb-3">
                Risk Analysis
              </h1>
              <p className="robinhood-text-secondary text-lg">
                {useAdvancedEngine ? 'Advanced risk assessment and portfolio analytics' : 'Local portfolio risk analysis'}
              </p>
            </div>
            
            {/* Engine Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${engineAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {engineAvailable ? 'Advanced Engine Available' : 'Advanced Engine Offline'}
                </span>
              </div>
              
              {engineAvailable && (
                <button
                  onClick={() => setUseAdvancedEngine(!useAdvancedEngine)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: useAdvancedEngine ? '#3B82F6' : '#6B7280',
                    color: 'white'
                  }}
                >
                  {useAdvancedEngine ? 'Advanced Mode' : 'Local Mode'}
                </button>
              )}
            </div>
          </div>

          {/* Engine Status Alert */}
          {!engineAvailable && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Advanced Risk Engine Unavailable
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Using local risk analysis. For advanced features like Monte Carlo simulations, 
                    ensure the risk engine is running on port 5001.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Render appropriate dashboard */}
        {useAdvancedEngine && engineAvailable ? (
          <AdvancedRiskDashboard 
            holdings={currentPortfolio.holdings}
            riskTolerance={user?.risk_tolerance || 'moderate'}
          />
        ) : (
          <LocalRiskDashboard 
            holdings={currentPortfolio.holdings}
            riskMetrics={localRiskMetrics}
            riskTolerance={user?.risk_tolerance || 'moderate'}
          />
        )}
      </div>
    </div>
  )
}

// Local Risk Dashboard Component
interface LocalRiskDashboardProps {
  holdings: any[]
  riskMetrics: ReturnType<typeof calculateLocalRiskMetrics>
  riskTolerance: string
}

const LocalRiskDashboard: React.FC<LocalRiskDashboardProps> = ({ 
  holdings, 
  riskMetrics, 
  riskTolerance 
}) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Very Low': return 'text-green-600 bg-green-50'
      case 'Low': return 'text-green-500 bg-green-50'
      case 'Moderate': return 'text-yellow-600 bg-yellow-50'
      case 'High': return 'text-orange-600 bg-orange-50'
      case 'Very High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const generateRecommendations = () => {
    const recommendations: string[] = []
    
    if (riskMetrics.concentrationRisk > 60) {
      recommendations.push('Consider diversifying your top holdings to reduce concentration risk')
    }
    
    if (riskMetrics.diversificationScore < 30) {
      recommendations.push('Add more holdings or sectors to improve diversification')
    }
    
    if (riskMetrics.totalPnLPercent < -10) {
      recommendations.push('Review underperforming positions and consider rebalancing')
    }
    
    if (holdings.length < 5) {
      recommendations.push('Consider adding more holdings to reduce portfolio risk')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your portfolio appears well-balanced for your risk tolerance')
    }
    
    return recommendations
  }

  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">{riskMetrics.riskScore}/10</p>
              <p className={`text-sm font-medium ${getRiskColor(riskMetrics.riskLevel)}`}>
                {riskMetrics.riskLevel}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${riskMetrics.totalValue.toLocaleString()}
              </p>
              <p className={`text-sm font-medium ${riskMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {riskMetrics.totalPnL >= 0 ? '+' : ''}${riskMetrics.totalPnL.toLocaleString()} ({riskMetrics.totalPnLPercent.toFixed(2)}%)
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concentration Risk</p>
              <p className="text-2xl font-bold text-gray-900">{riskMetrics.concentrationRisk}%</p>
              <p className="text-sm text-gray-500">Top 3 holdings</p>
            </div>
            <PieChart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Diversification</p>
              <p className="text-2xl font-bold text-gray-900">{riskMetrics.diversificationScore}%</p>
              <p className="text-sm text-gray-500">{holdings.length} holdings</p>
            </div>
            <Activity className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Sector Allocation */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-blue-600" />
          Sector Allocation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(riskMetrics.sectorAllocation).map(([sector, percentage]) => (
            <div key={sector} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">{sector}</span>
              <span className="text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-600" />
          Risk Recommendations
        </h3>
        <div className="space-y-3">
          {generateRecommendations().map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Holdings Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holdings.map((holding, index) => {
                const currentPrice = holding.current_price || holding.avg_price
                const value = holding.quantity * currentPrice
                const pnl = value - (holding.quantity * holding.avg_price)
                const pnlPercent = (holding.quantity * holding.avg_price) > 0 ? 
                  (pnl / (holding.quantity * holding.avg_price)) * 100 : 0
                
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {holding.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holding.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${holding.avg_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${value.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
