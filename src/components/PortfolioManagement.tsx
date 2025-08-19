import React, { useState } from 'react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAuth } from '../contexts/AuthContext'
import { Navigation } from './Navigation'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { PortfolioCreationForm } from './PortfolioCreationForm'
import { HoldingsTable } from './HoldingsTable'
import { AddStockForm } from './AddStockForm'
import { TransactionHistory } from './TransactionHistory'
import { PortfolioSelector } from './PortfolioSelector'
import { PortfolioSummary } from './PortfolioSummary'

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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
            <p className="mt-2 text-gray-600">Manage your investment portfolios and track your holdings</p>
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Your First Portfolio</h2>
              <PortfolioCreationForm />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Portfolio Selector */}
              <div className="bg-white rounded-lg shadow p-6">
                <PortfolioSelector 
                  portfolios={portfolios}
                  currentPortfolio={currentPortfolio}
                  onSelectPortfolio={selectPortfolio}
                />
              </div>

              {/* Portfolio Summary */}
              {currentPortfolio && (
                <div className="bg-white rounded-lg shadow p-6">
                  <PortfolioSummary portfolio={currentPortfolio} />
                </div>
              )}

              {/* Navigation Tabs */}
              {currentPortfolio && (
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6">
                      {[
                        { id: 'overview', name: 'Overview', icon: '📊' },
                        { id: 'holdings', name: 'Holdings', icon: '📈' },
                        { id: 'transactions', name: 'Transactions', icon: '📋' },
                        { id: 'add-stock', name: 'Add Stock', icon: '➕' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="mr-2">{tab.icon}</span>
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
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-900">Total Value</h3>
                            <p className="text-2xl font-bold text-blue-700">
                              ${(currentPortfolio.cash_balance + 
                                currentPortfolio.holdings.reduce((sum, holding) => 
                                  sum + (holding.quantity * holding.avg_price), 0
                                )).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-900">Cash Balance</h3>
                            <p className="text-2xl font-bold text-green-700">
                              ${currentPortfolio.cash_balance.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-purple-900">Total Holdings</h3>
                            <p className="text-2xl font-bold text-purple-700">
                              {currentPortfolio.holdings.length}
                            </p>
                          </div>
                        </div>
                        
                        {currentPortfolio.holdings.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Holdings</h3>
                            <HoldingsTable holdings={currentPortfolio.holdings.slice(0, 5)} compact />
                          </div>
                        )}
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
        </div>
      </main>
    </div>
  )
}
