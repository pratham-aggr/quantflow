import React, { useState } from 'react'
import { MarketNewsFeed } from './MarketNewsFeed'
import { TrendingUp, BarChart3, Globe } from 'lucide-react'

export const MarketData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'charts'>('news')

  const tabs = [
    { id: 'news', name: 'Market News', icon: <Globe className="w-4 h-4" /> },
    { id: 'charts', name: 'Stock Charts', icon: <BarChart3 className="w-4 h-4" /> }
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold robinhood-text-primary mb-3">
            Market News
          </h1>
          <p className="robinhood-text-secondary text-lg">
            Real-time market news and financial insights
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-neutral-200 dark:border-robinhood-dark-border">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-base flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent robinhood-text-secondary hover:robinhood-text-primary hover:border-neutral-300 dark:hover:border-neutral-600'
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
        <div className="robinhood-card">
          {activeTab === 'news' && (
            <div className="p-8">
              <MarketNewsFeed 
                symbol=""
                category="general"
                maxItems={8}
                autoRefresh={true}
                refreshInterval={300000}
              />
            </div>
          )}
          
          {activeTab === 'charts' && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold robinhood-text-primary mb-3">
                  Interactive Stock Charts
                </h2>
                <p className="robinhood-text-secondary text-lg">
                  Enter a stock symbol to view detailed charts and analysis
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold robinhood-text-primary mb-3">
                  Stock Chart Viewer
                </h3>
                <p className="robinhood-text-secondary text-lg mb-6">
                  Interactive charts with technical indicators and real-time data
                </p>
                <p className="robinhood-text-tertiary">
                  Chart functionality is integrated into the main dashboard
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
