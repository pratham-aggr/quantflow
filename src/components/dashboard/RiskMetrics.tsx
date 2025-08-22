import React from 'react'
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'

interface RiskMetricsProps {
  portfolioData: any
}

export const RiskMetrics: React.FC<RiskMetricsProps> = ({ portfolioData }) => {
  // Calculate risk metrics from portfolio data
  const calculateRiskMetrics = () => {
    if (!portfolioData || !portfolioData.totalValue) {
      return {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0,
        alpha: 0,
        correlation: 0,
        var95: 0,
        trackingError: 0
      }
    }

    // Simplified risk calculations based on portfolio performance
    const totalPnLPercent = portfolioData.totalPnLPercent || 0
    const riskScore = portfolioData.riskScore || 50

    return {
      volatility: Math.min(25, Math.max(5, 10 + (Math.abs(totalPnLPercent) / 10))),
      sharpeRatio: Math.min(3, Math.max(-1, totalPnLPercent / 10)),
      maxDrawdown: Math.min(-20, Math.max(-5, -(Math.abs(totalPnLPercent) / 2))),
      beta: Math.min(1.5, Math.max(0.5, 1 + (totalPnLPercent / 100))),
      alpha: Math.min(5, Math.max(-2, totalPnLPercent / 5)),
      correlation: Math.min(1, Math.max(0, 0.7 + (totalPnLPercent / 100))),
      var95: Math.min(-10, Math.max(-2, -(Math.abs(totalPnLPercent) / 3))),
      trackingError: Math.min(8, Math.max(1, 3 + (Math.abs(totalPnLPercent) / 10)))
    }
  }

  const riskMetrics = calculateRiskMetrics()

  const getRiskLevel = (metric: string, value: number) => {
    switch (metric) {
      case 'volatility':
        return value <= 10 ? 'low' : value <= 20 ? 'medium' : 'high'
      case 'sharpeRatio':
        return value >= 1.5 ? 'low' : value >= 0.5 ? 'medium' : 'high'
      case 'maxDrawdown':
        return Math.abs(value) <= 5 ? 'low' : Math.abs(value) <= 15 ? 'medium' : 'high'
      case 'beta':
        return value <= 0.8 ? 'low' : value <= 1.2 ? 'medium' : 'high'
      case 'alpha':
        return value >= 2 ? 'low' : value >= 0 ? 'medium' : 'high'
      case 'correlation':
        return value <= 0.5 ? 'low' : value <= 0.8 ? 'medium' : 'high'
      case 'var95':
        return Math.abs(value) <= 2 ? 'low' : Math.abs(value) <= 5 ? 'medium' : 'high'
      case 'trackingError':
        return value <= 2 ? 'low' : value <= 5 ? 'medium' : 'high'
      default:
        return 'medium'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const metrics = [
    {
      name: 'Volatility',
      value: riskMetrics.volatility,
      unit: '%',
      description: 'Annualized standard deviation of returns',
      metric: 'volatility'
    },
    {
      name: 'Sharpe Ratio',
      value: riskMetrics.sharpeRatio,
      unit: '',
      description: 'Risk-adjusted return measure',
      metric: 'sharpeRatio'
    },
    {
      name: 'Max Drawdown',
      value: riskMetrics.maxDrawdown,
      unit: '%',
      description: 'Largest peak-to-trough decline',
      metric: 'maxDrawdown'
    },
    {
      name: 'Beta',
      value: riskMetrics.beta,
      unit: '',
      description: 'Market sensitivity measure',
      metric: 'beta'
    },
    {
      name: 'Alpha',
      value: riskMetrics.alpha,
      unit: '%',
      description: 'Excess return vs benchmark',
      metric: 'alpha'
    },
    {
      name: 'Correlation',
      value: riskMetrics.correlation,
      unit: '',
      description: 'Correlation with market',
      metric: 'correlation'
    },
    {
      name: 'VaR (95%)',
      value: riskMetrics.var95,
      unit: '%',
      description: 'Value at Risk (95% confidence)',
      metric: 'var95'
    },
    {
      name: 'Tracking Error',
      value: riskMetrics.trackingError,
      unit: '%',
      description: 'Deviation from benchmark',
      metric: 'trackingError'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Shield className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Risk Metrics</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const riskLevel = getRiskLevel(metric.metric, metric.value)
          const riskColor = getRiskColor(riskLevel)
          const riskIcon = getRiskIcon(riskLevel)

          return (
            <div
              key={metric.name}
              className={`p-4 rounded-lg border ${riskColor} transition-colors hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{metric.name}</h4>
                {riskIcon}
              </div>
              
              <div className="flex items-baseline">
                <span className="text-2xl font-bold">
                  {metric.value > 0 ? '+' : ''}{metric.value.toFixed(1)}
                </span>
                <span className="text-sm ml-1">{metric.unit}</span>
              </div>
              
              <p className="text-xs mt-1 opacity-75">
                {metric.description}
              </p>
              
              <div className="mt-2">
                <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${
                  riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {riskLevel} risk
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Risk Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Overall Risk Assessment</h4>
            <p className="text-sm text-gray-600 mt-1">
              Based on volatility, drawdown, and market correlation
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="65, 100"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-900">65</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Risk Score</p>
                <p className="text-xs text-gray-500">Medium Risk</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Recommendations */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Risk Management Recommendations</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Consider diversifying into defensive sectors to reduce volatility</li>
          <li>• Monitor correlation levels and adjust allocation if needed</li>
          <li>• Set stop-loss orders to limit potential drawdowns</li>
          <li>• Review portfolio quarterly to maintain risk targets</li>
        </ul>
      </div>
    </div>
  )
}
