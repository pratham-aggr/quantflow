import React, { useState, useEffect } from 'react'
import { marketDataService } from '../lib/marketDataService'

export const MarketDataStatus: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const isConfigured = marketDataService.isConfigured()

  const checkBackendHealth = async () => {
    if (!isConfigured) return
    
    setIsChecking(true)
    try {
      const health = await marketDataService.checkBackendHealth()
      setBackendHealth(health)
    } catch (error) {
      setBackendHealth(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (isConfigured) {
      checkBackendHealth()
      // Check health every 30 seconds
      const interval = setInterval(checkBackendHealth, 30000)
      return () => clearInterval(interval)
    }
  }, [isConfigured])

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Market News Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Backend API</span>
          <div className="flex items-center space-x-2">
            {isChecking && (
              <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
            )}
            <span className={`text-sm font-medium ${
              !isConfigured ? 'text-red-600' : 
              backendHealth === null ? 'text-yellow-600' :
              backendHealth ? 'text-green-600' : 'text-red-600'
            }`}>
              {!isConfigured ? '❌ Not Configured' :
               backendHealth === null ? '⏳ Checking...' :
               backendHealth ? '✅ Connected' : '❌ Connection Failed'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Data Source</span>
          <span className="text-sm text-gray-900">yfinance</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Cache Duration</span>
          <span className="text-sm text-gray-900">15 minutes</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Auto Refresh</span>
          <span className="text-sm text-gray-900">30 seconds</span>
        </div>
      </div>

      {isConfigured && (
        <div className="mt-3 flex justify-between items-center">
          <button
            onClick={checkBackendHealth}
            disabled={isChecking}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
      )}

      {!isConfigured && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Configuration Required:</strong> Backend API URL not configured.
          </p>
          <p className="text-xs text-red-700 mt-1">
            Add <code className="bg-red-100 px-1 rounded">REACT_APP_BACKEND_API_URL=your_backend_url</code> to your environment variables
          </p>
        </div>
      )}

      {isConfigured && backendHealth === false && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Backend Unavailable:</strong> Market data service is temporarily unavailable.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            This may be due to rate limiting or server maintenance. Data will be available when the backend is restored.
          </p>
        </div>
      )}
    </div>
  )
}
