import React from 'react'
import { AdvancedRiskDashboard } from './AdvancedRiskDashboard'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'

export const RiskAnalysis: React.FC = () => {
  const { currentPortfolio } = usePortfolio()
  const { user } = useAuth()

  if (!currentPortfolio?.holdings) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Risk Analysis
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Please add some holdings to your portfolio to view risk analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Risk Analysis
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Advanced risk assessment and portfolio analytics
          </p>
        </div>
        
        <AdvancedRiskDashboard 
          holdings={currentPortfolio.holdings}
          riskTolerance={user?.risk_tolerance || 'moderate'}
        />
      </div>
    </div>
  )
}
