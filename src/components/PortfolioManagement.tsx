import React, { useState } from 'react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'

import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { PortfolioCreationForm } from './PortfolioCreationForm'
import { HoldingsTable } from './HoldingsTable'
import { AddStockForm } from './AddStockForm'
import { TransactionHistory } from './TransactionHistory'
import { PortfolioSelector } from './PortfolioSelector'
import { PortfolioSummary } from './PortfolioSummary'
import { MarketDataStatus } from './MarketDataStatus'

export const PortfolioManagement: React.FC = () => {
  const { user } = useAuth()
  const { 
    portfolios, 
    currentPortfolio, 
    loading, 
    error, 
    selectPortfolio,
    clearError 
  } = usePortfolio()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'transactions' | 'add-stock'>('overview')

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary flex items-center justify-center">
        <div className="robinhood-card p-8 text-center">
          <p className="robinhood-text-primary text-lg">Please log in to access portfolio management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold robinhood-text-primary mb-3">Portfolio Management</h1>
          <p className="robinhood-text-secondary text-lg">Manage your investment portfolios and track your holdings</p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={clearError}
            className="mb-6"
          />
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Portfolio Creation or Selection */}
        {portfolios.length === 0 ? (
          <div className="robinhood-card p-8">
            <h2 className="text-2xl font-semibold robinhood-text-primary mb-6">Create Your First Portfolio</h2>
            <PortfolioCreationForm />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Selector */}
            <div className="robinhood-card p-6">
              <PortfolioSelector 
                portfolios={portfolios}
                currentPortfolio={currentPortfolio}
                onSelectPortfolio={selectPortfolio}
              />
            </div>

            {/* Portfolio Summary */}
            {currentPortfolio && (
              <div className="robinhood-card p-6">
                <PortfolioSummary portfolio={currentPortfolio} />
              </div>
            )}

            {/* Navigation Tabs */}
            {currentPortfolio && (
              <div className="robinhood-card">
                <div className="border-b border-neutral-200 dark:border-robinhood-dark-border">
                  <nav className="-mb-px flex space-x-8 px-8">
                    {[
                      { id: 'overview', name: 'Overview' },
                      { id: 'holdings', name: 'Holdings' },
                      { id: 'transactions', name: 'Transactions' },
                      { id: 'add-stock', name: 'Add Stock' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-base transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent robinhood-text-secondary hover:robinhood-text-primary hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                  {activeTab === 'overview' && currentPortfolio && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-6 rounded-robinhood border border-primary-200 dark:border-primary-800">
                          <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">Total Value</h3>
                          <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                            ${(currentPortfolio.cash_balance + 
                              currentPortfolio.holdings.reduce((sum, holding) => 
                                sum + (holding.quantity * holding.avg_price), 0
                              )).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-gain-50 to-gain-100 dark:from-gain-900/20 dark:to-gain-800/20 p-6 rounded-robinhood border border-gain-200 dark:border-gain-800">
                          <h3 className="text-sm font-medium text-gain-900 dark:text-gain-100 mb-2">Cash Balance</h3>
                          <p className="text-3xl font-bold text-gain-700 dark:text-gain-300">
                            ${currentPortfolio.cash_balance.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 p-6 rounded-robinhood border border-neutral-200 dark:border-neutral-700">
                          <h3 className="text-sm font-medium robinhood-text-primary mb-2">Total Holdings</h3>
                          <p className="text-3xl font-bold robinhood-text-primary">
                            {currentPortfolio.holdings.length}
                          </p>
                        </div>
                      </div>
                      
                      {currentPortfolio.holdings.length > 0 && (
                        <div>
                          <h3 className="text-xl font-semibold robinhood-text-primary mb-6">Recent Holdings</h3>
                          <HoldingsTable holdings={currentPortfolio.holdings.slice(0, 5)} compact />
                        </div>
                      )}
                      
                      {/* Market Data Status */}
                      <MarketDataStatus />
                    </div>
                  )}

                  {activeTab === 'holdings' && currentPortfolio && (
                    <HoldingsTable holdings={currentPortfolio.holdings} />
                  )}

                  {activeTab === 'transactions' && currentPortfolio && (
                    <TransactionHistory portfolioId={currentPortfolio.id} />
                  )}

                  {activeTab === 'add-stock' && currentPortfolio && (
                    <AddStockForm portfolioId={currentPortfolio.id} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
