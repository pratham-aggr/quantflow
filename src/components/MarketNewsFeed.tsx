import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  ExternalLink,
  Filter,
  Search,
  TrendingUp,
  Globe,
  Building,
  Newspaper,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Share2,
  Eye
} from 'lucide-react'
import { marketDataService, MarketNews } from '../lib/marketDataService'
import { useToast } from './Toast'

interface MarketNewsFeedProps {
  symbol?: string
  category?: 'general' | 'forex' | 'crypto' | 'merger'
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
  showFilters?: boolean
  showBookmarks?: boolean
}

type NewsFilter = 'all' | 'today' | 'week' | 'bookmarked'
type SortBy = 'newest' | 'oldest' | 'relevance'

export const MarketNewsFeed: React.FC<MarketNewsFeedProps> = ({
  symbol,
  category = 'general',
  maxItems = 20,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  showFilters = true,
  showBookmarks = true
}) => {
  const [news, setNews] = useState<MarketNews[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<NewsFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [bookmarkedNews, setBookmarkedNews] = useState<Set<number>>(new Set())
  const [expandedNews, setExpandedNews] = useState<Set<number>>(new Set())
  const { success, error: showError, info } = useToast()

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

  // Filter and sort news
  const filteredAndSortedNews = useMemo(() => {
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
      case 'bookmarked':
        filtered = filtered.filter(item => bookmarkedNews.has(item.id))
        break
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.datetime - a.datetime)
        break
      case 'oldest':
        filtered.sort((a, b) => a.datetime - b.datetime)
        break
      case 'relevance':
        // For company news, sort by relevance (how many times the symbol appears)
        if (symbol) {
          filtered.sort((a, b) => {
            const aCount = (a.headline + a.summary).toLowerCase().split(symbol.toLowerCase()).length - 1
            const bCount = (b.headline + b.summary).toLowerCase().split(symbol.toLowerCase()).length - 1
            return bCount - aCount
          })
        }
        break
    }

    return filtered
  }, [news, searchTerm, selectedFilter, sortBy, bookmarkedNews, symbol])

  const toggleBookmark = (newsId: number) => {
    const newBookmarks = new Set(bookmarkedNews)
    if (newBookmarks.has(newsId)) {
      newBookmarks.delete(newsId)
      info('Bookmark Removed', 'Article removed from bookmarks')
    } else {
      newBookmarks.add(newsId)
      success('Bookmark Added', 'Article saved to bookmarks')
    }
    setBookmarkedNews(newBookmarks)
  }

  const toggleExpanded = (newsId: number) => {
    const newExpanded = new Set(expandedNews)
    if (newExpanded.has(newsId)) {
      newExpanded.delete(newsId)
    } else {
      newExpanded.add(newsId)
    }
    setExpandedNews(newExpanded)
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'forex':
        return <Globe className="w-4 h-4" />
      case 'crypto':
        return <TrendingUp className="w-4 h-4" />
      case 'merger':
        return <Building className="w-4 h-4" />
      default:
        return <Newspaper className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(category)}
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol ? `${symbol} News` : 'Market News'}
            </h3>
            {autoRefresh && (
              <div className="flex items-center text-sm text-gray-500">
                <RefreshCw className="w-3 h-3 mr-1" />
                Auto-refresh
              </div>
            )}
          </div>
          
          <button
            onClick={fetchNews}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh News"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters and Search */}
        {showFilters && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search news..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <div className="flex space-x-1">
                  {(['all', 'today', 'week', 'bookmarked'] as NewsFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        selectedFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'bookmarked' && showBookmarks ? (
                        <div className="flex items-center">
                          <Bookmark className="w-3 h-3 mr-1" />
                          Bookmarks
                        </div>
                      ) : (
                        filter.charAt(0).toUpperCase() + filter.slice(1)
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                {symbol && <option value="relevance">Most Relevant</option>}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* News List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && news.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading news...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-600 mb-2">{error}</div>
              <button
                onClick={fetchNews}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredAndSortedNews.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <Newspaper className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <div>No news articles found</div>
              {searchTerm && (
                <div className="text-sm mt-1">
                  Try adjusting your search or filters
                </div>
              )}
            </div>
          </div>
        )}

        {filteredAndSortedNews.map((item) => (
          <div key={item.id} className="p-4 border-b hover:bg-gray-50 transition-colors">
            <div className="flex items-start space-x-3">
              {/* News Image */}
              {item.image && (
                <div className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* News Header */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                    {item.headline}
                  </h4>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {showBookmarks && (
                      <button
                        onClick={() => toggleBookmark(item.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title={bookmarkedNews.has(item.id) ? 'Remove Bookmark' : 'Add Bookmark'}
                      >
                        {bookmarkedNews.has(item.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => shareNews(item)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Share Article"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* News Meta */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRelativeTime(item.datetime)}
                  </div>
                  <div className="flex items-center">
                    <Building className="w-3 h-3 mr-1" />
                    {item.source}
                  </div>
                  {item.related && (
                    <div className="text-blue-600">
                      Related: {item.related}
                    </div>
                  )}
                </div>

                {/* News Summary */}
                <p className={`text-sm text-gray-600 leading-relaxed ${
                  expandedNews.has(item.id) ? '' : 'line-clamp-2'
                }`}>
                  {item.summary}
                </p>

                {/* Expand/Collapse and Read More */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    {item.summary.length > 150 && (
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {expandedNews.has(item.id) ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Read Full Article
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredAndSortedNews.length > 0 && (
        <div className="p-4 border-t bg-gray-50 text-center">
          <div className="text-sm text-gray-500">
            Showing {filteredAndSortedNews.length} of {news.length} articles
            {selectedFilter !== 'all' && ` (${selectedFilter} filter)`}
          </div>
        </div>
      )}
    </div>
  )
}
