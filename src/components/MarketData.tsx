import React, { useState } from 'react'
import { MarketNewsFeed } from './MarketNewsFeed'
import { TrendingUp, Globe } from 'lucide-react'
import { usePortfolio } from '../contexts/PortfolioContext'
import SentimentAnalysisChart from './dashboard/SentimentAnalysisChart'

export const MarketData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'sentiment'>('news')
  const { currentPortfolio } = usePortfolio()
  const holdings = currentPortfolio?.holdings || []

  const tabs = [
    { id: 'news', name: 'Market News', icon: <Globe className="w-4 h-4" /> },
    { id: 'sentiment', name: 'Sentiment Analysis', icon: <TrendingUp className="w-4 h-4" /> }
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-base flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
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
        <div>
          {activeTab === 'news' && (
            <div>
              <MarketNewsFeed 
                symbol=""
                category="general"
                maxItems={8}
                autoRefresh={true}
                refreshInterval={300000}
                portfolioHoldings={[]}
              />
            </div>
          )}
          
          {activeTab === 'sentiment' && (
            <div>
              <SentimentAnalysisChart 
                portfolioHoldings={holdings}
                className="mb-6"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
