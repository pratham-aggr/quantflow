import React from 'react'
import { AdvancedRiskDashboard } from './AdvancedRiskDashboard'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'

export const RiskAnalysis: React.FC = () => {
  const { currentPortfolio } = usePortfolio()
  const { user } = useAuth()

  if (!currentPortfolio?.holdings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary flex items-center justify-center">
        <div className="robinhood-card p-12 text-center">
          <h2 className="text-3xl font-bold robinhood-text-primary mb-4">
            Risk Analysis
          </h2>
          <p className="robinhood-text-secondary text-lg">
            Please add some holdings to your portfolio to view risk analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold robinhood-text-primary mb-3">
            Risk Analysis
          </h1>
          <p className="robinhood-text-secondary text-lg">
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
