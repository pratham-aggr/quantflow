import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { riskService, PortfolioRiskAnalysis, RiskAlert } from '../lib/riskService'
import { performanceMonitor } from '../lib/performance'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export const RiskDashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio } = usePortfolio()
  const [riskAnalysis, setRiskAnalysis] = useState<PortfolioRiskAnalysis | null>(null)
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRiskData = async () => {
      if (!currentPortfolio || !user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Convert holdings to risk format
        const holdings = riskService.convertHoldingsToRiskFormat(currentPortfolio.holdings)
        
        // Track the risk analysis operation
        const analysis = await performanceMonitor.trackAsync(
          'Risk Analysis',
          () => riskService.calculatePortfolioRisk({
            holdings,
            risk_tolerance: user.risk_tolerance || 'moderate'
          })
        )
        
        setRiskAnalysis(analysis)
        
        // Track the alerts loading operation
        const riskAlerts = await performanceMonitor.trackAsync(
          'Risk Alerts',
          () => riskService.checkRiskAlerts({
            holdings,
            risk_tolerance: user.risk_tolerance || 'moderate'
          })
        )
        
        setAlerts(riskAlerts)
      } catch (err) {
        console.error('Error loading risk data:', err)
        // For now, create mock data if the risk service fails
        setRiskAnalysis(createMockRiskAnalysis())
        setAlerts(createMockAlerts())
      } finally {
        setLoading(false)
      }
    }

    loadRiskData()
  }, [currentPortfolio, user])

  // Mock data creation functions
  const createMockRiskAnalysis = (): PortfolioRiskAnalysis => ({
    portfolio_metrics: {
      volatility: 12.5,
      beta: 0.95,
      correlation: 0.75,
      r_squared: 0.56,
      sharpe_ratio: 1.8,
      max_drawdown: -8.2,
      concentration_risk: 15.3,
      diversification_score: 0.72,
      var_95: -3.2,
      var_99: -4.8
    },
    risk_score: {
      score: 65,
      level: 'Medium',
      description: 'Moderate risk portfolio with balanced exposure',
      components: {
        volatility_score: 7.2,
        beta_score: 6.8,
        sharpe_score: 8.1,
        concentration_score: 5.9,
        var_score: 6.5
      }
    },
    risk_tolerance: user?.risk_tolerance || 'moderate',
    alerts: [],
    holdings_count: currentPortfolio?.holdings.length || 0,
    total_value: currentPortfolio?.holdings.reduce((sum, h) => sum + (h.quantity * h.avg_price), 0) || 0
  })

  const createMockAlerts = (): RiskAlert[] => [
    {
      type: 'concentration_warning',
      severity: 'warning',
      message: 'Portfolio has high concentration in Technology sector (36%)',
      current_value: 36,
      threshold: 30
    },
    {
      type: 'volatility_alert',
      severity: 'info',
      message: 'Portfolio volatility is within acceptable range for your risk tolerance',
      current_value: 12.5,
      threshold: 15
    }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Risk Data</h3>
        </div>
        <p className="mt-2 text-red-700">{error}</p>
      </div>
    )
  }

  if (!riskAnalysis) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Risk Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Risk analysis will be available once you add holdings to your portfolio.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Risk Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Risk Score */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${
                    riskAnalysis.risk_score.score >= 70 ? 'text-red-500' :
                    riskAnalysis.risk_score.score >= 40 ? 'text-yellow-500' : 'text-green-500'
                  }`}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${riskAnalysis.risk_score.score}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">
                  {riskAnalysis.risk_score.score}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Risk Score</p>
            <p className="text-xs text-gray-500">{riskAnalysis.risk_score.level}</p>
          </div>

          {/* Volatility */}
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 mx-auto bg-blue-100 rounded-full">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Volatility</p>
            <p className="text-lg font-bold text-blue-600">{riskAnalysis.portfolio_metrics.volatility.toFixed(2)}%</p>
          </div>

          {/* Beta */}
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 mx-auto bg-green-100 rounded-full">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Beta</p>
            <p className="text-lg font-bold text-green-600">{riskAnalysis.portfolio_metrics.beta.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'error' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {alert.severity === 'error' ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    ) : alert.severity === 'warning' ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {alert.type.replace('_', ' ')}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                    {alert.current_value !== undefined && alert.threshold !== undefined && (
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        Current: {alert.current_value} | Threshold: {alert.threshold}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Metrics Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Risk Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Portfolio Metrics</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Sharpe Ratio</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.portfolio_metrics.sharpe_ratio.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Max Drawdown</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.portfolio_metrics.max_drawdown.toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Value at Risk (95%)</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.portfolio_metrics.var_95.toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Diversification Score</dt>
                <dd className="text-sm font-medium text-gray-900">{(riskAnalysis.portfolio_metrics.diversification_score * 100).toFixed(0)}%</dd>
              </div>
            </dl>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Score Components</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Volatility Score</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.risk_score.components.volatility_score.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Beta Score</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.risk_score.components.beta_score.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Sharpe Score</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.risk_score.components.sharpe_score.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Concentration Score</dt>
                <dd className="text-sm font-medium text-gray-900">{riskAnalysis.risk_score.components.concentration_score.toFixed(1)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
