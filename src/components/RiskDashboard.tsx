import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { riskService, PortfolioRiskAnalysis, RiskAlert } from '../lib/riskService'
import { AdvancedRiskDashboard } from './AdvancedRiskDashboard'
import { performanceMonitor } from '../lib/performance'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ShieldCheckIcon
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
                  <p className="robinhood-text-secondary mt-1">Portfolio risk assessment</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Risk Analysis Content */}
        {currentPortfolio?.holdings && (
          <>
            {/* Advanced Risk Dashboard */}
            <div className="robinhood-card p-8">
              <AdvancedRiskDashboard
                holdings={currentPortfolio.holdings}
                riskTolerance={user?.risk_tolerance || 'moderate'}
                autoRefresh={false}
              />
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


          </>
        )}
      </div>
    </div>
  )
}
