import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'

export const DemoTest: React.FC = () => {
  const { user, enterDemoMode, logout } = useAuth()
  const { currentPortfolio, portfolios, loading } = usePortfolio()

  const handleEnterDemo = async () => {
    try {
      await enterDemoMode()
    } catch (error) {
      console.error('Failed to enter demo mode:', error)
    }
  }

  const handleExitDemo = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to exit demo mode:', error)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Demo Portfolio Test</h1>
      
      <div className="space-y-6">
        {/* User Status */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">User Status</h2>
          <div className="space-y-2">
            <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
            {user && (
              <>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.full_name}</p>
                <p><strong>Demo Mode:</strong> {user.isDemo ? 'Yes' : 'No'}</p>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            {!user ? (
              <button
                onClick={handleEnterDemo}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Enter Demo Mode
              </button>
            ) : (
              <button
                onClick={handleExitDemo}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Exit Demo Mode
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Status */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Portfolio Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Portfolios Count:</strong> {portfolios.length}</p>
            <p><strong>Current Portfolio:</strong> {currentPortfolio ? 'Loaded' : 'None'}</p>
          </div>
        </div>

        {/* Current Portfolio Details */}
        {currentPortfolio && (
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Current Portfolio Details</h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {currentPortfolio.name}</p>
              <p><strong>ID:</strong> {currentPortfolio.id}</p>
              <p><strong>Cash Balance:</strong> ${currentPortfolio.cash_balance?.toLocaleString()}</p>
              <p><strong>Total Value:</strong> ${currentPortfolio.total_value?.toLocaleString()}</p>
              <p><strong>Total P&L:</strong> ${currentPortfolio.total_pnl?.toLocaleString()}</p>
              <p><strong>Risk Score:</strong> {currentPortfolio.risk_score}</p>
              <p><strong>Holdings Count:</strong> {currentPortfolio.holdings.length}</p>
            </div>

            {/* Holdings List */}
            {currentPortfolio.holdings.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Holdings:</h3>
                <div className="space-y-1">
                  {currentPortfolio.holdings.map((holding) => (
                    <div key={holding.id} className="flex justify-between text-sm">
                      <span>{holding.symbol} - {holding.company_name}</span>
                      <span>
                        {holding.quantity} @ ${holding.avg_price} 
                        {holding.current_price && ` (Current: $${holding.current_price})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
