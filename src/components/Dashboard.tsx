import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { Navigation } from './Navigation'
import { ConfigStatus } from './ConfigStatus'
 

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const { portfolios, currentPortfolio } = usePortfolio()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

            {/* Debug Environment Variables */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">🔧 Debug: Environment Variables</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>Supabase URL: {process.env.REACT_APP_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}</p>
                <p>Supabase Key: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}</p>
                <p>Environment: {process.env.NODE_ENV}</p>
                <p>User ID: {user?.id || 'Not logged in'}</p>
                <p>Portfolios Count: {portfolios.length}</p>
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

            {/* Configuration Status */}
            <ConfigStatus />
            
          </div>
        </div>
      </main>
    </div>
  )
}
