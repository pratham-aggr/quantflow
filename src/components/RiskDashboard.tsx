import React, { useState, useEffect, useCallback } from 'react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'
import { riskService, PortfolioRiskAnalysis, RiskAlert } from '../lib/riskService'
import { usePerformanceMonitor } from '../lib/performance'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

// Simple debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const RiskDashboard: React.FC = () => {
  const { currentPortfolio } = usePortfolio()
  const { user } = useAuth()
  const { timeAsync } = usePerformanceMonitor()
  const [riskAnalysis, setRiskAnalysis] = useState<PortfolioRiskAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentPortfolio && currentPortfolio.holdings.length > 0) {
      // Add a small delay to prevent excessive API calls during navigation
      const timer = setTimeout(() => {
        calculateRiskAnalysis()
      }, 500)
      
      return () => clearTimeout(timer)
    } else {
      setRiskAnalysis(null)
    }
  }, [currentPortfolio])

  const calculateRiskAnalysis = async () => {
    if (!currentPortfolio || !user) return

    setLoading(true)
    setError(null)

    try {
      const holdings = riskService.convertHoldingsToRiskFormat(currentPortfolio.holdings)
      const analysis = await timeAsync('risk-analysis', () => 
        riskService.calculatePortfolioRisk({
          holdings,
          risk_tolerance: user.risk_tolerance || 'moderate'
        })
      )
      setRiskAnalysis(analysis)
    } catch (err: any) {
      console.error('Error calculating risk analysis:', err)
      setError(err.message || 'Failed to calculate risk metrics')
    } finally {
      setLoading(false)
    }
  }

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback(
    debounce(() => {
      calculateRiskAnalysis()
    }, 1000),
    [currentPortfolio, user]
  )

  if (!currentPortfolio) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Analysis</h2>
        <p className="text-gray-500">Select a portfolio to view risk metrics</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Analysis</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Calculating risk metrics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Analysis</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!riskAnalysis) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Analysis</h2>
        <p className="text-gray-500">No risk data available</p>
      </div>
    )
  }

  const formattedMetrics = riskService.formatRiskMetrics(riskAnalysis.portfolio_metrics)
  const riskLevelColor = riskService.getRiskLevelColor(riskAnalysis.risk_score.level)

  return (
    <div className="space-y-6">
      {/* Risk Score Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Portfolio Risk Score</h2>
          <button
            onClick={calculateRiskAnalysis}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk Score */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${riskLevelColor} mb-3`}>
              <span className="text-2xl font-bold">{riskAnalysis.risk_score.score}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">{riskAnalysis.risk_score.level}</h3>
            <p className="text-sm text-gray-600 mt-1">{riskAnalysis.risk_score.description}</p>
          </div>

          {/* Portfolio Summary */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {currentPortfolio.holdings.length}
            </div>
            <p className="text-sm text-gray-600">Holdings</p>
            <div className="text-lg font-semibold text-gray-900 mt-2">
              ${riskAnalysis.total_value.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">Total Value</p>
          </div>

          {/* Risk Tolerance */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 capitalize">
              {riskAnalysis.risk_tolerance}
            </div>
            <p className="text-sm text-gray-600">Risk Tolerance</p>
            <div className="text-sm text-gray-500 mt-2">
              {user?.risk_tolerance === 'conservative' && 'Conservative approach'}
              {user?.risk_tolerance === 'moderate' && 'Balanced approach'}
              {user?.risk_tolerance === 'aggressive' && 'Growth-focused approach'}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Volatility"
            value={formattedMetrics.volatility}
            description="Annualized volatility"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Beta"
            value={formattedMetrics.beta}
            description="Market sensitivity"
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Sharpe Ratio"
            value={formattedMetrics.sharpe_ratio}
            description="Risk-adjusted return"
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Max Drawdown"
            value={formattedMetrics.max_drawdown}
            description="Largest decline"
            icon={<ArrowTrendingDownIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="VaR (95%)"
            value={formattedMetrics.var_95}
            description="Value at Risk"
            icon={<ShieldExclamationIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Concentration"
            value={formattedMetrics.concentration_risk}
            description="Portfolio concentration"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Diversification"
            value={formattedMetrics.diversification_score}
            description="Diversification score"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <MetricCard
            title="Correlation"
            value={formattedMetrics.correlation}
            description="Market correlation"
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Risk Alerts */}
      {riskAnalysis.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Alerts</h3>
          <div className="space-y-3">
            {riskAnalysis.alerts.map((alert, index) => (
              <RiskAlertCard key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Risk Score Components */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Score Breakdown</h3>
        <div className="space-y-3">
          <ScoreComponent
            label="Volatility Score"
            score={riskAnalysis.risk_score.components.volatility_score}
            weight={25}
          />
          <ScoreComponent
            label="Beta Score"
            score={riskAnalysis.risk_score.components.beta_score}
            weight={20}
          />
          <ScoreComponent
            label="Sharpe Score"
            score={riskAnalysis.risk_score.components.sharpe_score}
            weight={15}
          />
          <ScoreComponent
            label="Concentration Score"
            score={riskAnalysis.risk_score.components.concentration_score}
            weight={20}
          />
          <ScoreComponent
            label="VaR Score"
            score={riskAnalysis.risk_score.components.var_score}
            weight={20}
          />
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, icon }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="text-gray-400">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <p className="text-xs text-gray-500 mt-1">{description}</p>
  </div>
)

interface RiskAlertCardProps {
  alert: RiskAlert
}

const RiskAlertCard: React.FC<RiskAlertCardProps> = ({ alert }) => {
  const severityColor = riskService.getAlertSeverityColor(alert.severity)
  const Icon = alert.severity === 'error' ? ExclamationTriangleIcon : 
               alert.severity === 'warning' ? ExclamationTriangleIcon : 
               InformationCircleIcon

  return (
    <div className={`border rounded-md p-4 ${severityColor}`}>
      <div className="flex">
        <Icon className="h-5 w-5 mt-0.5" />
        <div className="ml-3">
          <h4 className="text-sm font-medium capitalize">
            {alert.type.replace('_', ' ')}
          </h4>
          <p className="text-sm mt-1">{alert.message}</p>
          {alert.current_value !== undefined && alert.threshold !== undefined && (
            <p className="text-xs mt-1">
              Current: {alert.current_value} | Threshold: {alert.threshold}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface ScoreComponentProps {
  label: string
  score: number
  weight: number
}

const ScoreComponent: React.FC<ScoreComponentProps> = ({ label, score, weight }) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{weight}% weight</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(score / 10) * 100}%` }}
        ></div>
      </div>
    </div>
    <span className="ml-4 text-sm font-medium text-gray-900 w-8 text-right">
      {score.toFixed(1)}
    </span>
  </div>
)
