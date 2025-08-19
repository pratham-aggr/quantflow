import React from 'react'
import { marketDataService } from '../lib/marketDataService'

export const MarketDataStatus: React.FC = () => {
  const isConfigured = marketDataService.isConfigured()

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Market Data Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Finnhub API</span>
          <span className={`text-sm font-medium ${
            isConfigured ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {isConfigured ? '✅ Connected' : '⚠️ Mock Data'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Rate Limit</span>
          <span className="text-sm text-gray-900">60 calls/minute</span>
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

      {!isConfigured && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Setup Required:</strong> Add your Finnhub API key to enable real-time market data.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Get a free API key at{' '}
            <a 
              href="https://finnhub.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-900"
            >
              finnhub.io
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
