import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  ExternalLink,
  Search,
  RefreshCw
} from 'lucide-react'
import { marketDataService, MarketNews } from '../lib/marketDataService'
import { alphaVantageNewsService, AlphaVantageNewsItem } from '../lib/alphaVantageNewsService'
import { useToast } from './Toast'

interface MarketNewsFeedProps {
  symbol?: string
  category?: 'general' | 'forex' | 'crypto' | 'merger'
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

export const MarketNewsFeed: React.FC<MarketNewsFeedProps> = ({
  symbol,
  category = 'general',
  maxItems = 6, // Reduced from 10 to 6 for cleaner look
  autoRefresh = false,
  refreshInterval = 300000
}) => {
  const [news, setNews] = useState<MarketNews[]>([])
  const [alphaVantageNews, setAlphaVantageNews] = useState<AlphaVantageNewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [useAlphaVantage, setUseAlphaVantage] = useState(false)
  const { error: showError } = useToast()

  // Fetch news data
  const fetchNews = async () => {
    setLoading(true)
    setError(null)

    try {
      let newsData: MarketNews[] = []
      let alphaVantageData: AlphaVantageNewsItem[] = []

      // Try primary news source first
      try {
        if (symbol) {
          const to = new Date()
          const from = new Date()
          from.setDate(from.getDate() - 30)
          newsData = await marketDataService.getCompanyNews(symbol, from, to)
        } else {
          newsData = await marketDataService.getMarketNews(category, maxItems)
        }
        setUseAlphaVantage(false)
      } catch (primaryError) {
        console.log('Primary news source failed, trying Alpha Vantage...')
        
        // Fallback to Alpha Vantage
        try {
          if (symbol) {
            const response = await alphaVantageNewsService.getCompanyNews(symbol, maxItems)
            alphaVantageData = response.news
          } else {
            const response = await alphaVantageNewsService.getMarketNews(maxItems)
            alphaVantageData = response.news
          }
          setUseAlphaVantage(true)
        } catch (alphaVantageError) {
          throw new Error('Both news sources failed')
        }
      }

      setNews(newsData)
      setAlphaVantageNews(alphaVantageData)
    } catch (err) {
      setError('Failed to fetch news')
      showError('News Error', 'Failed to load market news')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchNews()
  }, [symbol, category, maxItems])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchNews, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, symbol, category])

  // Filter news
  const filteredNews = useMemo(() => {
    if (useAlphaVantage) {
      let filtered = [...alphaVantageNews]

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(item =>
          item.title.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          item.source.toLowerCase().includes(term)
        )
      }

      return filtered.slice(0, maxItems)
    } else {
      let filtered = [...news]

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(item =>
          item.headline.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          item.source.toLowerCase().includes(term)
        )
      }

      // Sort by newest first and limit to maxItems
      filtered.sort((a, b) => b.datetime - a.datetime)
      return filtered.slice(0, maxItems)
    }
  }, [news, alphaVantageNews, searchTerm, maxItems, useAlphaVantage])

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - (timestamp * 1000)
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else {
      return `${minutes}m ago`
    }
  }

  return (
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold robinhood-text-primary">
            {symbol ? `${symbol} News` : 'Market News'}
          </h2>
          {useAlphaVantage && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              Alpha Vantage
            </span>
          )}
        </div>
        
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 text-sm robinhood-btn-secondary"
          title="Refresh News"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Simplified Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 robinhood-text-tertiary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search news..."
          className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-robinhood-dark-border rounded-robinhood focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-robinhood-dark-secondary robinhood-text-primary"
        />
      </div>

      {/* Loading State */}
      {loading && news.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 robinhood-text-secondary">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="robinhood-text-secondary mb-3">{error}</div>
          <button
            onClick={fetchNews}
            className="robinhood-btn-primary text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Simplified News List */}
      {!loading && !error && (
        <div className="space-y-3">
          {filteredNews.length === 0 ? (
            <div className="text-center py-8">
              <div className="robinhood-text-secondary">
                No news articles found
              </div>
            </div>
          ) : (
            filteredNews.map((item, index) => {
              if (useAlphaVantage) {
                // Alpha Vantage news item
                const alphaItem = item as AlphaVantageNewsItem
                return (
                  <div key={`${alphaItem.id}-${index}`} className="p-4 border-b border-neutral-200 dark:border-robinhood-dark-border hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary transition-all duration-200">
                    <div className="space-y-3">
                      {/* News Header */}
                      <h3 className="text-base font-medium robinhood-text-primary leading-tight">
                        {alphaItem.title}
                      </h3>

                      {/* News Summary */}
                      <p className="text-sm robinhood-text-secondary leading-relaxed line-clamp-2">
                        {alphaItem.summary}
                      </p>

                      {/* News Meta */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-3 text-xs robinhood-text-tertiary">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {alphaItem.time_published ? new Date(alphaItem.time_published).toLocaleDateString() : 'N/A'}
                          </div>
                          <span className="font-medium robinhood-text-secondary">{alphaItem.source}</span>
                          {alphaItem.overall_sentiment_label && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              alphaItem.overall_sentiment_label.toLowerCase() === 'positive' ? 'bg-green-100 text-green-800' :
                              alphaItem.overall_sentiment_label.toLowerCase() === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {alphaItem.overall_sentiment_label}
                            </span>
                          )}
                        </div>
                        
                        <a
                          href={alphaItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          Read
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // Original news item
                const originalItem = item as MarketNews
                return (
                  <div key={originalItem.id} className="p-4 border-b border-neutral-200 dark:border-robinhood-dark-border hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary transition-all duration-200">
                    <div className="space-y-3">
                      {/* News Header */}
                      <h3 className="text-base font-medium robinhood-text-primary leading-tight">
                        {originalItem.headline}
                      </h3>

                      {/* News Summary */}
                      <p className="text-sm robinhood-text-secondary leading-relaxed line-clamp-2">
                        {originalItem.summary}
                      </p>

                      {/* News Meta */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-3 text-xs robinhood-text-tertiary">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatRelativeTime(originalItem.datetime)}
                          </div>
                          <span className="font-medium robinhood-text-secondary">{originalItem.source}</span>
                        </div>
                        
                        <a
                          href={originalItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          Read
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              }
            })
          )}
        </div>
      )}

      {/* Simple Results Summary */}
      {filteredNews.length > 0 && (
        <div className="text-center pt-2">
          <div className="text-xs robinhood-text-tertiary">
            Showing {filteredNews.length} articles
          </div>
        </div>
      )}
    </div>
  )
}
