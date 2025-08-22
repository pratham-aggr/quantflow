import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { Navigation } from './Navigation'
import { RiskDashboard } from './RiskDashboard'
 

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { portfolios, currentPortfolio } = usePortfolio()
  const [activeTab, setActiveTab] = useState<'overview' | 'risk'>('overview')

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('risk')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'risk'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Risk Analysis
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Risk Tolerance</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {user?.risk_tolerance || 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Investment Goals</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.investment_goals?.length ? user.investment_goals.join(', ') : 'Not set'}
                </p>
              </div>
            </div>



            {/* System Status */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">QuantFlow System Status</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>✅ Authentication system with Supabase</p>
                <p>✅ Portfolio management database</p>
                <p>✅ User profile management</p>
                <p>✅ Professional UI with Tailwind CSS</p>
                <p>✅ Portfolio context and state management</p>
                <p>✅ Protected routes with React Router</p>
              </div>
            </div>

            {/* Portfolio Information */}
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-900 mb-2">Portfolio Management</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>📊 Total Portfolios: {portfolios.length}</p>
                {currentPortfolio && (
                  <>
                    <p>🎯 Current Portfolio: {currentPortfolio.name}</p>
                    <p>💰 Cash Balance: ${currentPortfolio.cash_balance.toLocaleString()}</p>
                    <p>📈 Total Holdings: {currentPortfolio.holdings.length}</p>
                    <p>💵 Total Value: ${(currentPortfolio.cash_balance + currentPortfolio.holdings.reduce((sum, holding) => sum + (holding.quantity * holding.avg_price), 0)).toLocaleString()}</p>
                  </>
                )}
                {portfolios.length === 0 && (
                  <p>📝 No portfolios yet. Create your first portfolio to get started!</p>
                )}
              </div>
            </div>

            {/* Production Mode Indicator */}
            {!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL === 'https://placeholder.supabase.co' ? (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">🔄 Development Mode</h3>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>• Using mock authentication for development</p>
                  <p>• Demo login: <code className="bg-yellow-100 px-1 rounded">demo@quantflow.com</code></p>
                  <p>• Any password will work for demo account</p>
                  <p>• Set up Supabase for real authentication</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="text-sm font-medium text-green-900 mb-2">✅ Production Mode</h3>
                <div className="text-sm text-green-700">
                  <p>• Connected to Supabase for real authentication</p>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Risk Analysis Tab */}
          {activeTab === 'risk' && (
            <RiskDashboard />
          )}
        </div>
      </main>
    </div>
  )
}
