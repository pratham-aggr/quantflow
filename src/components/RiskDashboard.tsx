import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { riskService, PortfolioRiskAnalysis, RiskAlert } from '../lib/riskService'
import { AdvancedRiskDashboard } from './AdvancedRiskDashboard'
import { performanceMonitor } from '../lib/performance'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

export const RiskDashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio } = usePortfolio()
  const [riskAnalysis, setRiskAnalysis] = useState<PortfolioRiskAnalysis | null>(null)
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false)

  useEffect(() => {
    const loadRiskData = async () => {
      if (!currentPortfolio || !user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Debug logging
        console.log('RiskDashboard Debug:', {
          currentPortfolio,
          holdings: currentPortfolio.holdings,
          user: user
        })
        
        // Convert holdings to risk format
        const holdings = riskService.convertHoldingsToRiskFormat(currentPortfolio.holdings)
        
        console.log('Converted holdings for risk engine:', holdings)
        
        // Track the risk analysis operation
        const analysis = await performanceMonitor.trackAsync(
          'Risk Analysis',
          () => riskService.calculatePortfolioRisk({
            holdings,
            risk_tolerance: user.risk_tolerance || 'moderate'
          })
        )
        
        console.log('Risk analysis result:', analysis)
        
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
        setError('Failed to load risk analysis data')
      } finally {
        setLoading(false)
      }
    }

    loadRiskData()
  }, [currentPortfolio, user])

  // Helper function to get risk level color
  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return { bg: 'bg-gradient-to-br from-loss-500 to-loss-600', text: 'text-loss-500', border: 'border-loss-200' }
    if (score >= 40) return { bg: 'bg-gradient-to-br from-yellow-500 to-orange-500', text: 'text-yellow-600', border: 'border-yellow-200' }
    return { bg: 'bg-gradient-to-br from-gain-500 to-gain-600', text: 'text-gain-500', border: 'border-gain-200' }
  }

  // Helper function to get risk level description
  const getRiskLevelDescription = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'Conservative portfolio with minimal risk exposure'
      case 'moderate': return 'Balanced portfolio with moderate risk-return profile'
      case 'high': return 'Aggressive portfolio with higher risk potential'
      default: return 'Portfolio risk assessment'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="robinhood-card p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 robinhood-shimmer rounded-robinhood w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="robinhood-shimmer rounded-robinhood p-6 h-32"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-loss-50 to-loss-100 dark:from-loss-900/20 dark:to-loss-800/20 border border-loss-200 dark:border-loss-700 rounded-robinhood-lg shadow-robinhood-lg p-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-loss-100 dark:bg-loss-800/50 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-loss-600 dark:text-loss-400" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-loss-900 dark:text-loss-100 mb-2">Error Loading Risk Data</h3>
                <p className="text-loss-700 dark:text-loss-300">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!riskAnalysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="robinhood-card p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheckIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-2xl font-semibold robinhood-text-primary mb-3">No Risk Data Available</h3>
              <p className="robinhood-text-secondary max-w-md mx-auto">
                Risk analysis will be available once you add holdings to your portfolio.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const riskColors = getRiskLevelColor(riskAnalysis.risk_score.score)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="robinhood-card p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-robinhood rounded-robinhood flex items-center justify-center shadow-robinhood">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold robinhood-text-primary">Portfolio Risk Analysis</h1>
                  <p className="robinhood-text-secondary mt-1">{getRiskLevelDescription(riskAnalysis.risk_score.level)}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
              className="robinhood-btn-primary"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              {showAdvancedAnalysis ? 'Show Basic' : 'Show Advanced'} Analysis
            </button>
          </div>
        </div>

        {/* Advanced Risk Analysis */}
        {showAdvancedAnalysis && currentPortfolio?.holdings && (
          <div className="robinhood-card p-8">
            <AdvancedRiskDashboard
              holdings={currentPortfolio.holdings}
              riskTolerance={user?.risk_tolerance || 'moderate'}
              autoRefresh={false}
            />
          </div>
        )}

        {/* Basic Risk Overview */}
        {!showAdvancedAnalysis && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Risk Score */}
              <div className="robinhood-card p-8">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-neutral-200 dark:text-neutral-700"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={riskColors.text}
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${riskAnalysis.risk_score.score}, 100`}
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold robinhood-text-primary">
                        {riskAnalysis.risk_score.score}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold robinhood-text-primary mb-2">Risk Score</h3>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${riskColors.border} ${riskColors.text} bg-opacity-10`}>
                    {riskAnalysis.risk_score.level}
                  </div>
                </div>
              </div>

              {/* Volatility */}
              <div className="robinhood-card p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ChartBarIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold robinhood-text-primary mb-2">Volatility</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{riskAnalysis.portfolio_metrics.volatility.toFixed(2)}%</p>
                  <p className="text-sm robinhood-text-tertiary">Annualized volatility</p>
                </div>
              </div>

              {/* Beta */}
              <div className="robinhood-card p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gain-100 to-gain-200 dark:from-gain-900/30 dark:to-gain-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CurrencyDollarIcon className="h-10 w-10 text-gain-600 dark:text-gain-400" />
                  </div>
                  <h3 className="text-lg font-semibold robinhood-text-primary mb-2">Beta</h3>
                  <p className="text-3xl font-bold text-gain-600 dark:text-gain-400 mb-2">{riskAnalysis.portfolio_metrics.beta.toFixed(2)}</p>
                  <p className="text-sm robinhood-text-tertiary">Market correlation</p>
                </div>
              </div>
            </div>

            {/* Risk Alerts */}
            {alerts.length > 0 && (
              <div className="robinhood-card p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-800/30 rounded-robinhood flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold robinhood-text-primary">Risk Alerts</h3>
                  <span className="bg-loss-100 dark:bg-loss-800/50 text-loss-800 dark:text-loss-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-6 rounded-robinhood border-2 transition-all duration-200 hover:shadow-robinhood ${
                        alert.severity === 'error' ? 'bg-gradient-to-br from-loss-50 to-loss-100 dark:from-loss-900/20 dark:to-loss-800/20 border-loss-200 dark:border-loss-700' :
                        alert.severity === 'warning' ? 'bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20 border-yellow-200 dark:border-yellow-700' :
                        'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {alert.severity === 'error' ? (
                            <div className="w-8 h-8 bg-loss-100 dark:bg-loss-800/50 rounded-full flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-4 w-4 text-loss-600 dark:text-loss-400" />
                            </div>
                          ) : alert.severity === 'warning' ? (
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800/50 rounded-full flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                              <InformationCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold robinhood-text-primary capitalize mb-2">
                            {alert.type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm robinhood-text-secondary mb-3">{alert.message}</p>
                          {alert.current_value !== undefined && alert.threshold !== undefined && (
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="robinhood-text-tertiary">Current: <span className="font-medium robinhood-text-primary">{alert.current_value}</span></span>
                              <span className="robinhood-text-tertiary">Threshold: <span className="font-medium robinhood-text-primary">{alert.threshold}</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Metrics Details */}
            <div className="robinhood-card p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-800/30 rounded-robinhood flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold robinhood-text-primary">Detailed Risk Metrics</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold robinhood-text-primary mb-4">Portfolio Metrics</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center">
                          <ArrowTrendingUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Sharpe Ratio</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.portfolio_metrics.sharpe_ratio.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-loss-100 dark:bg-loss-800/50 rounded-lg flex items-center justify-center">
                          <ArrowTrendingDownIcon className="h-4 w-4 text-loss-600 dark:text-loss-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Max Drawdown</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.portfolio_metrics.max_drawdown.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-800/50 rounded-lg flex items-center justify-center">
                          <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Value at Risk (95%)</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.portfolio_metrics.var_95.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gain-100 dark:bg-gain-800/50 rounded-lg flex items-center justify-center">
                          <ShieldCheckIcon className="h-4 w-4 text-gain-600 dark:text-gain-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Diversification Score</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{(riskAnalysis.portfolio_metrics.diversification_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold robinhood-text-primary mb-4">Risk Score Components</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center">
                          <ChartBarIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Volatility Score</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.risk_score.components.volatility_score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-800/50 rounded-lg flex items-center justify-center">
                          <CurrencyDollarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Beta Score</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.risk_score.components.beta_score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center">
                          <ArrowTrendingUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Sharpe Score</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.risk_score.components.sharpe_score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-800/50 rounded-lg flex items-center justify-center">
                          <MinusIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-sm font-medium robinhood-text-secondary">Concentration Score</span>
                      </div>
                      <span className="text-lg font-bold robinhood-text-primary">{riskAnalysis.risk_score.components.concentration_score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
