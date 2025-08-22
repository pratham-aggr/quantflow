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
    return <div>Please log in to access portfolio management.</div>
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Portfolio Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage your investment portfolios and track your holdings</p>
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
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Portfolio Creation or Selection */}
        {portfolios.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Create Your First Portfolio</h2>
            <PortfolioCreationForm />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Portfolio Selector */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <PortfolioSelector 
                portfolios={portfolios}
                currentPortfolio={currentPortfolio}
                onSelectPortfolio={selectPortfolio}
              />
            </div>

            {/* Portfolio Summary */}
            {currentPortfolio && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
                <PortfolioSummary portfolio={currentPortfolio} />
              </div>
            )}

            {/* Navigation Tabs */}
            {currentPortfolio && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="border-b border-neutral-200 dark:border-neutral-700">
                  <nav className="-mb-px flex space-x-8 px-6">
                    {[
                      { id: 'overview', name: 'Overview' },
                      { id: 'holdings', name: 'Holdings' },
                      { id: 'transactions', name: 'Transactions' },
                      { id: 'add-stock', name: 'Add Stock' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && currentPortfolio && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-800">
                          <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100">Total Value</h3>
                          <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                            ${(currentPortfolio.cash_balance + 
                              currentPortfolio.holdings.reduce((sum, holding) => 
                                sum + (holding.quantity * holding.avg_price), 0
                              )).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gain-50 dark:bg-gain-900/20 p-4 rounded-lg border border-gain-200 dark:border-gain-800">
                          <h3 className="text-sm font-medium text-gain-900 dark:text-gain-100">Cash Balance</h3>
                          <p className="text-2xl font-bold text-gain-700 dark:text-gain-300">
                            ${currentPortfolio.cash_balance.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Total Holdings</h3>
                          <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                            {currentPortfolio.holdings.length}
                          </p>
                        </div>
                      </div>
                      
                      {currentPortfolio.holdings.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Recent Holdings</h3>
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
