import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  ExternalLink,
  Search,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Share2,
  Filter
} from 'lucide-react'
import { marketDataService, MarketNews } from '../lib/marketDataService'
import { useToast } from './Toast'

interface MarketNewsFeedProps {
  symbol?: string
  category?: 'general' | 'forex' | 'crypto' | 'merger'
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

type NewsFilter = 'all' | 'today' | 'week'

export const MarketNewsFeed: React.FC<MarketNewsFeedProps> = ({
  symbol,
  category = 'general',
  maxItems = 10,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}) => {
  const [news, setNews] = useState<MarketNews[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<NewsFilter>('all')
  const [bookmarkedNews, setBookmarkedNews] = useState<Set<number>>(new Set())
  const { success, error: showError } = useToast()

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bookmarked_news')
      if (saved) {
        setBookmarkedNews(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.warn('Failed to load bookmarked news:', error)
    }
  }, [])

  // Save bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookmarked_news', JSON.stringify(Array.from(bookmarkedNews)))
    } catch (error) {
      console.warn('Failed to save bookmarked news:', error)
    }
  }, [bookmarkedNews])

  // Fetch news data
  const fetchNews = async () => {
    setLoading(true)
    setError(null)

    try {
      let newsData: MarketNews[] = []

      if (symbol) {
        // Fetch company-specific news
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 30) // Last 30 days
        
        newsData = await marketDataService.getCompanyNews(symbol, from, to)
      } else {
        // Fetch general market news
        newsData = await marketDataService.getMarketNews(category, maxItems)
      }

      setNews(newsData)
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
    let filtered = [...news]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.headline.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term)
      )
    }

    // Apply time filters
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)

    switch (selectedFilter) {
      case 'today':
        filtered = filtered.filter(item => item.datetime * 1000 >= oneDayAgo)
        break
      case 'week':
        filtered = filtered.filter(item => item.datetime * 1000 >= oneWeekAgo)
        break
    }

    // Sort by newest first
    filtered.sort((a, b) => b.datetime - a.datetime)

    return filtered.slice(0, maxItems)
  }, [news, searchTerm, selectedFilter, maxItems])

  const toggleBookmark = (newsId: number) => {
    const newBookmarks = new Set(bookmarkedNews)
    if (newBookmarks.has(newsId)) {
      newBookmarks.delete(newsId)
    } else {
      newBookmarks.add(newsId)
    }
    setBookmarkedNews(newBookmarks)
  }

  const shareNews = async (item: MarketNews) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.headline,
          text: item.summary,
          url: item.url
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(item.url)
        success('Link Copied', 'News article link copied to clipboard')
      } catch (error) {
        showError('Share Failed', 'Failed to copy link to clipboard')
      }
    }
  }

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
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold robinhood-text-primary">
            {symbol ? `${symbol} News` : 'Market News'}
          </h2>
          {autoRefresh && (
            <div className="flex items-center text-sm robinhood-text-secondary">
              <RefreshCw className="w-3 h-3 mr-1" />
              Auto-refresh
            </div>
          )}
        </div>
        
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 robinhood-btn-secondary"
          title="Refresh News"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 robinhood-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search news articles..."
            className="w-full pl-10 pr-4 py-3 border border-neutral-300 dark:border-robinhood-dark-border rounded-robinhood focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-robinhood-dark-secondary robinhood-text-primary"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 robinhood-text-tertiary" />
          <div className="flex space-x-1">
            {(['all', 'today', 'week'] as NewsFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-2 text-sm rounded-robinhood transition-colors ${
                  selectedFilter === filter
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-robinhood-dark-tertiary robinhood-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && news.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3 robinhood-text-secondary">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading news...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="robinhood-text-secondary mb-4">{error}</div>
          <button
            onClick={fetchNews}
            className="robinhood-btn-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* News List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <div className="robinhood-text-secondary">
                No news articles found
                {searchTerm && (
                  <div className="text-sm mt-1">
                    Try adjusting your search or filters
                  </div>
                )}
              </div>
            </div>
          ) : (
            filteredNews.map((item) => (
              <div key={item.id} className="robinhood-card p-6 hover:robinhood-card-hover transition-all duration-200">
                <div className="space-y-4">
                  {/* News Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold robinhood-text-primary leading-tight flex-1 pr-4">
                      {item.headline}
                    </h3>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleBookmark(item.id)}
                        className="p-2 text-neutral-400 hover:text-yellow-500 transition-colors rounded-robinhood hover:bg-neutral-100 dark:hover:bg-robinhood-dark-tertiary"
                        title={bookmarkedNews.has(item.id) ? 'Remove Bookmark' : 'Add Bookmark'}
                      >
                        {bookmarkedNews.has(item.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => shareNews(item)}
                        className="p-2 text-neutral-400 hover:text-primary-500 transition-colors rounded-robinhood hover:bg-neutral-100 dark:hover:bg-robinhood-dark-tertiary"
                        title="Share Article"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* News Summary */}
                  <p className="robinhood-text-secondary leading-relaxed">
                    {item.summary}
                  </p>

                  {/* News Meta */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-robinhood-dark-border">
                    <div className="flex items-center space-x-4 text-sm robinhood-text-tertiary">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatRelativeTime(item.datetime)}
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium robinhood-text-secondary">{item.source}</span>
                      </div>
                      {item.related && (
                        <div className="text-primary-600 dark:text-primary-400">
                          Related: {item.related}
                        </div>
                      )}
                    </div>
                    
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      Read Full Article
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results Summary */}
      {filteredNews.length > 0 && (
        <div className="text-center pt-4">
          <div className="text-sm robinhood-text-tertiary">
            Showing {filteredNews.length} of {news.length} articles
            {selectedFilter !== 'all' && ` (${selectedFilter} filter)`}
          </div>
        </div>
      )}
    </div>
  )
}
