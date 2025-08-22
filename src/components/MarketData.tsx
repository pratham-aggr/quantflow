import React, { useState } from 'react'
import { MarketNewsFeed } from './MarketNewsFeed'
import { InteractiveStockChart } from './InteractiveStockChart'
import { CurrencyConverter } from './CurrencyConverter'
import { TrendingUp, BarChart3, DollarSign, Globe } from 'lucide-react'

export const MarketData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'charts' | 'currency'>('news')

  const tabs = [
    { id: 'news', name: 'Market News', icon: <Globe className="w-4 h-4" /> },
    { id: 'charts', name: 'Stock Charts', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'currency', name: 'Currency', icon: <DollarSign className="w-4 h-4" /> }
  ] as const

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Market Data
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Real-time market information and financial data
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          {activeTab === 'news' && (
            <div className="p-6">
              <MarketNewsFeed 
                symbol=""
                category="general"
                maxItems={20}
                autoRefresh={true}
                refreshInterval={300000}
              />
            </div>
          )}
          
          {activeTab === 'charts' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Interactive Stock Charts
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter a stock symbol to view detailed charts and analysis
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Stock Chart Viewer
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Interactive charts with technical indicators and real-time data
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chart functionality is integrated into the main dashboard
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'currency' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Currency Converter
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Real-time currency exchange rates and conversion tools
                </p>
              </div>
              
              <CurrencyConverter />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
