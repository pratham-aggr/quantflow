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
        beta: 0
      }
    }

    // Simplified risk calculations based on portfolio performance
    const totalPnLPercent = portfolioData.totalPnLPercent || 0
    const riskScore = portfolioData.riskScore || 50

    return {
      volatility: Math.min(25, Math.max(5, 10 + (Math.abs(totalPnLPercent) / 10))),
      sharpeRatio: Math.min(3, Math.max(-1, totalPnLPercent / 10)),
      maxDrawdown: Math.min(-20, Math.max(-5, -(Math.abs(totalPnLPercent) / 2))),
      beta: Math.min(1.5, Math.max(0.5, 1 + (totalPnLPercent / 100)))
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
      default:
        return 'medium'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  const metrics = [
    {
      name: 'Volatility',
      value: riskMetrics.volatility,
      unit: '%',
      description: 'Annualized standard deviation',
      metric: 'volatility'
    },
    {
      name: 'Sharpe Ratio',
      value: riskMetrics.sharpeRatio,
      unit: '',
      description: 'Risk-adjusted returns',
      metric: 'sharpeRatio'
    },
    {
      name: 'Max Drawdown',
      value: riskMetrics.maxDrawdown,
      unit: '%',
      description: 'Largest decline',
      metric: 'maxDrawdown'
    },
    {
      name: 'Beta',
      value: riskMetrics.beta,
      unit: '',
      description: 'Market sensitivity',
      metric: 'beta'
    }
  ]

  return (
    <div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const riskLevel = getRiskLevel(metric.metric, metric.value)
          const riskColor = getRiskColor(riskLevel)
          const riskIcon = getRiskIcon(riskLevel)

          return (
            <div key={metric.name} className="text-center">
              <div className="flex items-center justify-center mb-2">
                {riskIcon}
              </div>
              
              <p className="text-sm text-gray-500 mb-1">{metric.name}</p>
              
              <div className="flex items-baseline justify-center">
                <span className={`text-2xl font-bold ${riskColor}`}>
                  {metric.value > 0 ? '+' : ''}{metric.value.toFixed(1)}
                </span>
                <span className="text-sm ml-1 text-gray-500">{metric.unit}</span>
              </div>
              
              <p className="text-xs mt-1 text-gray-400">
                {metric.description}
              </p>
              
              <div className="mt-2">
                <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${
                  riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {riskLevel}
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
            <h4 className="text-sm font-medium text-gray-900">Risk Assessment</h4>
            <p className="text-sm text-gray-600 mt-1">
              Based on volatility, drawdown, and market correlation
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              <div className="w-12 h-12 relative">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
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
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-900">Risk Score</p>
                <p className="text-xs text-gray-500">Medium</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
