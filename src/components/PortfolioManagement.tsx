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

import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  Plus,
  RefreshCw
} from 'lucide-react'

export const PortfolioManagement: React.FC = () => {
  const { user } = useAuth()
  const { 
    portfolios, 
    currentPortfolio, 
    loading, 
    error, 
    selectPortfolio,
    clearError,
    refreshCurrentPortfolio
  } = usePortfolio()
  
  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions' | 'add-stock'>('holdings')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshCurrentPortfolio()
    } catch (error) {
      console.error('Failed to refresh portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Briefcase className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please log in to access portfolio management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Portfolios</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your investment portfolios</p>
            </div>
            {currentPortfolio && (
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-primary-500 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="pb-4">
              <ErrorMessage 
                message={error} 
                onDismiss={clearError}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Portfolio Creation or Selection */}
        {portfolios.length === 0 ? (
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Create Your First Portfolio</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start building your investment portfolio today</p>
            <PortfolioCreationForm />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Selector */}
            <div>
              <PortfolioSelector 
                portfolios={portfolios}
                currentPortfolio={currentPortfolio}
                onSelectPortfolio={selectPortfolio}
              />
            </div>

            {/* Portfolio Summary */}
            {currentPortfolio && (
              <div>
                <PortfolioSummary portfolio={currentPortfolio} />
              </div>
            )}

            {/* Navigation Tabs */}
            {currentPortfolio && (
              <div>
                <div className="border-b border-gray-200 dark:border-gray-800">
                  <nav className="flex space-x-8">
                    {[
                      { id: 'holdings', name: 'Holdings', icon: TrendingUp },
                      { id: 'transactions', name: 'Transactions', icon: DollarSign },
                      { id: 'add-stock', name: 'Add Stock', icon: Plus }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-8">
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
    </div>
  )
}
