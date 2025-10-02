// Market Data Service with Rate Limiting and Caching
// Market data service using backend API (yfinance)

interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  timestamp: number
}

interface CompanyProfile {
  symbol: string
  name: string
  currency: string
  exchange: string
  ipo: string
  marketCapitalization: number
  phone: string
  shareOutstanding: number
  weburl: string
  logo: string
  industry: string
}

interface SearchResult {
  count: number
  result: Array<{
    description: string
    displaySymbol: string
    symbol: string
    type: string
  }>
}

interface HistoricalData {
  symbol: string
  timestamps: number[]
  closes: number[]
  opens: number[]
  highs: number[]
  lows: number[]
  volumes: number[]
}

interface MarketNews {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

interface CurrencyExchange {
  base: string
  target: string
  rate: number
  timestamp: number
}

interface WebSocketMessage {
  type: 'trade' | 'ping'
  data?: Array<{
    s: string  // symbol
    p: number  // price
    t: number  // timestamp
    v: number  // volume
  }>
}

interface RealTimeSubscription {
  symbol: string
  callback: (data: StockQuote) => void
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  lastAccessed: number
  accessCount: number
  isStale: boolean
}

// Rate limiting configuration for API calls
const RATE_LIMIT = {
  callsPerMinute: 60, // Free plan: 60 calls per minute
  callsPerSecond: 1,  // Free plan: 1 call per second
  retryDelay: 1000,   // 1 second
  maxRetries: 3
}

// Enhanced cache configuration
const CACHE_CONFIG = {
  // Different cache durations for different data types
  durations: {
    quotes: 2 * 60 * 1000,        // 2 minutes for stock quotes (frequently changing)
    profiles: 60 * 60 * 1000,     // 1 hour for company profiles (rarely change)
    search: 30 * 60 * 1000,       // 30 minutes for search results
    historical: 15 * 60 * 1000,   // 15 minutes for historical data
    news: 5 * 60 * 1000,          // 5 minutes for news (time-sensitive)
    forex: 10 * 60 * 1000,        // 10 minutes for forex rates
  },
  // Auto-refresh thresholds
  autoRefresh: {
    quotes: 30 * 1000,            // Auto-refresh quotes after 30 seconds if accessed
    maxAge: 5 * 60 * 1000,        // Maximum age before forcing refresh
  },
  // Cache size limits
  maxSize: {
    memory: 100,                  // Max 100 items in memory cache
    localStorage: 50,             // Max 50 items in localStorage
  }
}

class RateLimiter {
  private callCount = 0
  private lastReset = Date.now()
  private queue: Array<() => Promise<any>> = []
  private processing = false

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      // Reset counter if a minute has passed
      if (Date.now() - this.lastReset >= 60000) {
        this.callCount = 0
        this.lastReset = Date.now()
      }

      // Check rate limit
      if (this.callCount >= RATE_LIMIT.callsPerMinute) {
        const waitTime = 60000 - (Date.now() - this.lastReset)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.callCount = 0
        this.lastReset = Date.now()
      }

      // Execute request
      const request = this.queue.shift()
      if (request) {
        this.callCount++
        await request()
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000 / RATE_LIMIT.callsPerSecond))
      }
    }

    this.processing = false
  }
}

class EnhancedCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private backgroundRefreshQueue = new Set<string>()
  private refreshTimeouts = new Map<string, NodeJS.Timeout>()

  set<T>(key: string, data: T, type: keyof typeof CACHE_CONFIG.durations = 'quotes'): void {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      isStale: false
    }

    // Update memory cache
    this.memoryCache.set(key, entry)
    
    // Manage cache size
    this.enforceMemoryCacheLimit()
    
    // Store in localStorage for persistence (except for frequently changing data)
    if (type !== 'quotes') {
      try {
        const localStorageKey = `market_data_${key}`
        const existingKeys = Object.keys(localStorage).filter(k => k.startsWith('market_data_'))
        
        // Enforce localStorage limit
        if (existingKeys.length >= CACHE_CONFIG.maxSize.localStorage) {
          const oldestKey = this.findOldestLocalStorageKey(existingKeys)
          if (oldestKey) {
            localStorage.removeItem(oldestKey)
          }
        }
        
        localStorage.setItem(localStorageKey, JSON.stringify({
          ...entry,
          type
        }))
      } catch (error) {
        console.warn('Failed to store in localStorage:', error)
      }
    }

    // Schedule background refresh for quotes
    if (type === 'quotes') {
      this.scheduleBackgroundRefresh(key)
    }
  }

  get<T>(key: string, type: keyof typeof CACHE_CONFIG.durations = 'quotes'): T | null {
    const now = Date.now()
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    if (memoryEntry) {
      const age = now - memoryEntry.timestamp
      const duration = CACHE_CONFIG.durations[type]
      
      // Update access stats
      memoryEntry.lastAccessed = now
      memoryEntry.accessCount++
      
      // Check if data is still valid
      if (age < duration) {
        // Check if we should auto-refresh (for quotes)
        if (type === 'quotes' && age > CACHE_CONFIG.autoRefresh.quotes) {
          this.queueBackgroundRefresh(key)
        }
        
        return memoryEntry.data
      } else {
        // Mark as stale but return it while refreshing in background
        memoryEntry.isStale = true
        this.queueBackgroundRefresh(key)
        return memoryEntry.data
      }
    }

    // Check localStorage for non-quote data
    if (type !== 'quotes') {
      try {
        const stored = localStorage.getItem(`market_data_${key}`)
        if (stored) {
          const item = JSON.parse(stored)
          const age = now - item.timestamp
          const duration = CACHE_CONFIG.durations[type]
          
          if (age < duration) {
            // Update memory cache
            const entry: CacheEntry<T> = {
              data: item.data,
              timestamp: item.timestamp,
              lastAccessed: now,
              accessCount: 1,
              isStale: false
            }
            this.memoryCache.set(key, entry)
            return item.data
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error)
      }
    }

    return null
  }

  isStale(key: string): boolean {
    const entry = this.memoryCache.get(key)
    return entry?.isStale || false
  }

  private queueBackgroundRefresh(key: string): void {
    if (!this.backgroundRefreshQueue.has(key)) {
      this.backgroundRefreshQueue.add(key)
      // Process background refresh queue
      setTimeout(() => this.processBackgroundRefreshQueue(), 100)
    }
  }

  private async processBackgroundRefreshQueue(): Promise<void> {
    const keys = Array.from(this.backgroundRefreshQueue)
    this.backgroundRefreshQueue.clear()
    
    for (const key of keys) {
      // Extract symbol from key (e.g., "quote_AAPL" -> "AAPL")
      const symbol = key.replace('quote_', '')
      if (symbol) {
        try {
          // Trigger a background refresh (this will be handled by the service)
          console.log(`🔄 Background refresh queued for ${symbol}`)
        } catch (error) {
          console.warn(`Background refresh failed for ${symbol}:`, error)
        }
      }
    }
  }

  private scheduleBackgroundRefresh(key: string): void {
    // Clear existing timeout
    const existingTimeout = this.refreshTimeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Schedule new refresh
    const timeout = setTimeout(() => {
      this.queueBackgroundRefresh(key)
      this.refreshTimeouts.delete(key)
    }, CACHE_CONFIG.autoRefresh.quotes)
    
    this.refreshTimeouts.set(key, timeout)
  }

  private enforceMemoryCacheLimit(): void {
    if (this.memoryCache.size > CACHE_CONFIG.maxSize.memory) {
      // Remove least recently used items
      const entries = Array.from(this.memoryCache.entries())
      entries.sort((a, b) => {
        const aScore = a[1].accessCount * (Date.now() - a[1].lastAccessed)
        const bScore = b[1].accessCount * (Date.now() - b[1].lastAccessed)
        return aScore - bScore
      })
      
      const toRemove = entries.slice(0, this.memoryCache.size - CACHE_CONFIG.maxSize.memory)
      toRemove.forEach(([key]) => {
        this.memoryCache.delete(key)
      })
    }
  }

  private findOldestLocalStorageKey(keys: string[]): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const item = JSON.parse(stored)
          if (item.timestamp < oldestTime) {
            oldestTime = item.timestamp
            oldestKey = key
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }
    
    return oldestKey
  }



  getStats(): { memorySize: number; backgroundQueueSize: number } {
    return {
      memorySize: this.memoryCache.size,
      backgroundQueueSize: this.backgroundRefreshQueue.size
    }
  }

  // Add cleanup method to clear all cached data
  clear(): void {
    // Clear memory cache
    this.memoryCache.clear()
    
    // Clear background refresh queue
    this.backgroundRefreshQueue.clear()
    
    // Clear all refresh timeouts
    this.refreshTimeouts.forEach(timeout => clearTimeout(timeout))
    this.refreshTimeouts.clear()
    
    // Clear localStorage cache
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('market_data_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }
}

class MarketDataService {
  private serverUrl: string
  private rateLimiter = new RateLimiter()
  private cache = new EnhancedCacheManager()
  private websocket: WebSocket | null = null
  private subscriptions = new Map<string, RealTimeSubscription[]>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private backgroundRefreshEnabled = true
  private backgroundRefreshInterval: NodeJS.Timeout | null = null
  private pendingRequests = new Map<string, Promise<StockQuote | null>>()

  constructor() {
    // Use the backend API for market data
    this.serverUrl = process.env.REACT_APP_BACKEND_API_URL || ''
    
    if (!this.serverUrl) {
      console.warn('⚠️ Backend API URL not configured. Market data features will not be available.')
    } else {
      console.log('✅ Market data service initialized with backend:', this.serverUrl)
    }

    // Start background refresh process
    this.startBackgroundRefresh()
  }

  // Add cleanup method to stop all background processes
  public cleanup(): void {
    // Disable background refresh
    this.backgroundRefreshEnabled = false
    
    // Clear background refresh interval
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval)
      this.backgroundRefreshInterval = null
    }
    
    // Close websocket connection
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    
    // Clear subscriptions
    this.subscriptions.clear()
    
    // Clear pending requests
    this.pendingRequests.clear()
    
    // Clear cache
    this.cache.clear()
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.serverUrl) {
      throw new Error('Server URL not configured')
    }

    const url = new URL(`${this.serverUrl}/api/market-data${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    return this.rateLimiter.execute(async () => {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.error(`❌ API request failed: ${endpoint} (${response.status})`)
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please try again later')
        }
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error && errorData.error.includes('Rate limited')) {
            throw new Error('Rate limited - please try again later')
          }
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.data || data // Handle both wrapped and unwrapped responses
    })
  }

  async getStockQuote(symbol: string, forceRefresh: boolean = false): Promise<StockQuote | null> {
    const cacheKey = `quote_${symbol.toUpperCase()}`
    
    // Check for pending request first (deduplication)
    if (!forceRefresh) {
      const pending = this.pendingRequests.get(cacheKey)
      if (pending) {
        return pending
      }
    }
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cache.get<StockQuote>(cacheKey, 'quotes')
      if (cached) {
        // If data is stale, trigger background refresh
        if (this.cache.isStale(cacheKey)) {
          this.queueBackgroundRefresh(symbol)
        }
        
        return cached
      }
    }
    
    // Create and store the promise to prevent duplicate requests
    const requestPromise = (async () => {
      try {
        const rawData = await this.makeRequest<any>(`/quote/${symbol.toUpperCase()}`)
        
        // Map yfinance API response to our StockQuote interface
        if (rawData && rawData.price) {
          const mappedData: StockQuote = {
            symbol: symbol.toUpperCase(),
            price: rawData.price,
            change: rawData.change,
            changePercent: rawData.changePercent,
            high: rawData.high,
            low: rawData.low,
            open: rawData.open,
            previousClose: rawData.previousClose,
            volume: rawData.volume || 0,
            timestamp: rawData.timestamp || Date.now()
          }
          
          this.cache.set(cacheKey, mappedData, 'quotes')
          return mappedData
        } else {
          if (rawData && rawData.error) {
            console.warn(`⚠️ ${symbol} may not be available (US stocks only)`)
          }
        }
        
        return null
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('Rate limited') || errorMessage.includes('Rate limit exceeded')) {
          console.warn(`⚠️ Rate limited for ${symbol} - will retry later`)
        } else {
          console.error(`❌ Failed to fetch quote for ${symbol}:`, error)
        }
        return null
      } finally {
        // Remove from pending requests when done
        this.pendingRequests.delete(cacheKey)
      }
    })()
    
    // Store the promise to deduplicate simultaneous requests
    this.pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  private queueBackgroundRefresh(symbol: string): void {
    if (!this.backgroundRefreshEnabled) return
    
    // Queue background refresh
    setTimeout(async () => {
      try {
        await this.getStockQuote(symbol, true)
      } catch (error) {
        // Silent fail for background refresh
      }
    }, 1000) // Small delay to avoid overwhelming the API
  }

  private startBackgroundRefresh(): void {
    // Periodically refresh frequently accessed quotes
    this.backgroundRefreshInterval = setInterval(() => {
      if (!this.backgroundRefreshEnabled) return
      
      // This could be enhanced to refresh the most frequently accessed quotes
    }, 60000) // Check every minute
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    const cacheKey = `profile_${symbol.toUpperCase()}`
    const cached = this.cache.get<CompanyProfile>(cacheKey, 'profiles')
    
    if (cached) {
      return cached
    }

    try {
      const data = await this.makeRequest<CompanyProfile>(`/stock/profile2`, { symbol: symbol.toUpperCase() })
      
      if (data && data.name) {
        this.cache.set(cacheKey, data, 'profiles')
        return data
      }
      
      return null
    } catch (error) {
      console.error(`Failed to fetch profile for ${symbol}:`, error)
      return null
    }
  }

  async searchStocks(query: string): Promise<SearchResult | null> {
    if (query.length < 2) return null

    const cacheKey = `search_${query.toLowerCase()}`
    const cached = this.cache.get<SearchResult>(cacheKey, 'search')
    
    if (cached) {
      return cached
    }

    try {
      const data = await this.makeRequest<SearchResult>(`/search`, { q: query })
      
      if (data && data.result) {
        this.cache.set(cacheKey, data, 'search')
        return data
      }
      
      return null
    } catch (error) {
      console.error(`Failed to search for ${query}:`, error)
      return null
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {}
    const uncachedSymbols: string[] = []

    // Check cache first
    symbols.forEach(symbol => {
      const cached = this.cache.get<StockQuote>(`quote_${symbol.toUpperCase()}`, 'quotes')
      if (cached) {
        results[symbol.toUpperCase()] = cached
      } else {
        uncachedSymbols.push(symbol)
      }
    })

    // Fetch uncached symbols using BATCH endpoint for speed
    if (uncachedSymbols.length > 0) {
      try {
        // For multiple symbols, use the batch endpoint (much faster!)
        if (uncachedSymbols.length >= 2) {
          const symbolsParam = uncachedSymbols.map(s => s.toUpperCase()).join(',')
          const batchData = await this.makeRequest<Record<string, any>>(`/quotes`, { symbols: symbolsParam })
          
          // Process batch results
          Object.entries(batchData).forEach(([symbol, rawData]) => {
            if (rawData && !rawData.error && rawData.price) {
              const mappedData: StockQuote = {
                symbol: symbol.toUpperCase(),
                price: rawData.price,
                change: rawData.change,
                changePercent: rawData.changePercent,
                high: rawData.high,
                low: rawData.low,
                open: rawData.open,
                previousClose: rawData.previousClose,
                volume: rawData.volume || 0,
                timestamp: rawData.timestamp || Date.now()
              }
              
              this.cache.set(`quote_${symbol}`, mappedData, 'quotes')
              results[symbol] = mappedData
            } else if (rawData && rawData.error) {
              if (rawData.error.includes('Rate limited') || rawData.error.includes('Too Many Requests')) {
                console.warn(`⚠️ Rate limited for ${symbol} - will retry later`)
              } else {
                console.warn(`⚠️ No data for ${symbol}: ${rawData.error}`)
              }
            } else {
              console.warn(`⚠️ No data for ${symbol}`)
            }
          })
        } else {
          // For single symbol, use individual request
          const quote = await this.getStockQuote(uncachedSymbols[0])
          if (quote) {
            results[uncachedSymbols[0].toUpperCase()] = quote
          }
        }
      } catch (error) {
        console.error('❌ Batch request failed, using fallback')
        
        // Fallback to individual requests with reduced stagger
        const quotePromises = uncachedSymbols.map(async (symbol, index) => {
          await new Promise(resolve => setTimeout(resolve, index * 100)) // 100ms between requests
          return this.getStockQuote(symbol)
        })

        const quoteResults = await Promise.allSettled(quotePromises)
        
        quoteResults.forEach((result, index) => {
          const symbol = uncachedSymbols[index]
          if (result.status === 'fulfilled' && result.value) {
            results[symbol.toUpperCase()] = result.value
          }
        })
      }
    }

    return results
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { memorySize: number; backgroundQueueSize: number } {
    return this.cache.getStats()
  }

  enableBackgroundRefresh(enabled: boolean): void {
    this.backgroundRefreshEnabled = enabled
    console.log(`Background refresh ${enabled ? 'enabled' : 'disabled'}`)
  }

  isConfigured(): boolean {
    return !!this.serverUrl
  }

  async checkBackendHealth(): Promise<boolean> {
    if (!this.serverUrl) return false
    
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend health check passed:', data)
        return true
      } else {
        console.warn('⚠️ Backend health check failed:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ Backend health check error:', error)
      return false
    }
  }

  // ========== WOW FACTOR ENHANCEMENTS ==========

  // Real-time WebSocket streaming
  connectWebSocket(): void {
    if (!this.serverUrl) {
      console.warn('Server URL not configured, WebSocket connection skipped')
      return
    }

    try {
      // Use server WebSocket endpoint for real-time updates
      const wsUrl = this.serverUrl.replace('http', 'ws')
      this.websocket = new WebSocket(`${wsUrl}/api/market-data/ws`)
      
      this.websocket.onopen = () => {
        console.log('📡 WebSocket connected for real-time market data')
        this.reconnectAttempts = 0
      }

      this.websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          if (message.type === 'trade' && message.data) {
            this.handleRealtimeData(message.data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.websocket.onclose = () => {
        console.log('📡 WebSocket disconnected')
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        } else {
          console.log('Max WebSocket reconnection attempts reached - continuing without real-time data')
        }
      }

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      console.log('Continuing without real-time market data')
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.pow(2, this.reconnectAttempts) * 1000 // Exponential backoff
      console.log(`🔄 Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
      
      setTimeout(() => {
        this.connectWebSocket()
      }, delay)
    } else {
      console.log('Max WebSocket reconnection attempts reached - continuing without real-time data')
    }
  }

  private handleRealtimeData(trades: Array<{ s: string; p: number; t: number; v: number }>): void {
    trades.forEach(trade => {
      const subscriptions = this.subscriptions.get(trade.s)
      if (subscriptions) {
        const quote: StockQuote = {
          symbol: trade.s,
          price: trade.p,
          change: 0, // Calculate based on previous close
          changePercent: 0,
          high: trade.p,
          low: trade.p,
          open: trade.p,
          previousClose: trade.p,
          volume: trade.v,
          timestamp: trade.t
        }

        subscriptions.forEach(subscription => {
          subscription.callback(quote)
        })

        // Update cache with real-time data
        this.cache.set(`quote_${trade.s}`, quote, 'quotes')
      }
    })
  }

  subscribeToRealTimeUpdates(symbol: string, callback: (data: StockQuote) => void): () => void {
    const subscription: RealTimeSubscription = { symbol, callback }
    
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, [])
      
      // Subscribe to symbol via WebSocket
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'subscribe', symbol }))
      }
    }
    
    this.subscriptions.get(symbol)?.push(subscription)

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(symbol)
      if (subs) {
        const index = subs.indexOf(subscription)
        if (index > -1) {
          subs.splice(index, 1)
        }
        
        if (subs.length === 0) {
          this.subscriptions.delete(symbol)
          // Unsubscribe from WebSocket
          if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'unsubscribe', symbol }))
          }
        }
      }
    }
  }

  // Historical price data with technical indicators
  async getHistoricalData(symbol: string, from: Date, to: Date, resolution: 'D' | 'W' | 'M' = 'D'): Promise<HistoricalData | null> {
    const cacheKey = `historical_${symbol}_${from.getTime()}_${to.getTime()}_${resolution}`
    const cached = this.cache.get<HistoricalData>(cacheKey, 'historical')
    
    if (cached) {
      return cached
    }

    try {
      const fromTimestamp = Math.floor(from.getTime() / 1000)
      const toTimestamp = Math.floor(to.getTime() / 1000)
      
      const data = await this.makeRequest<any>('/stock/candle', {
        symbol: symbol.toUpperCase(),
        resolution,
        from: fromTimestamp.toString(),
        to: toTimestamp.toString()
      })

      if (data && data.s === 'ok') {
        const historicalData: HistoricalData = {
          symbol: symbol.toUpperCase(),
          timestamps: data.t || [],
          closes: data.c || [],
          opens: data.o || [],
          highs: data.h || [],
          lows: data.l || [],
          volumes: data.v || []
        }
        
        this.cache.set(cacheKey, historicalData, 'historical')
        return historicalData
      }
      
      return null
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error)
      return null
    }
  }

  // Market news integration
  async getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general', limit: number = 20): Promise<MarketNews[]> {
    const cacheKey = `news_${category}_${limit}`
    const cached = this.cache.get<MarketNews[]>(cacheKey, 'news')
    
    if (cached) {
      return cached
    }

    try {
      const data = await this.makeRequest<MarketNews[]>('/news', {
        category,
        minId: '0'
      })

      if (data && Array.isArray(data)) {
        const news = data.slice(0, limit)
        this.cache.set(cacheKey, news, 'news')
        return news
      }
      
      return []
    } catch (error) {
      console.error(`Failed to fetch market news:`, error)
      return []
    }
  }

  // Company-specific news
  async getCompanyNews(symbol: string, from: Date, to: Date): Promise<MarketNews[]> {
    const cacheKey = `company_news_${symbol}_${from.getTime()}_${to.getTime()}`
    const cached = this.cache.get<MarketNews[]>(cacheKey, 'news')
    
    if (cached) {
      return cached
    }

    try {
      const fromStr = from.toISOString().split('T')[0]
      const toStr = to.toISOString().split('T')[0]
      
      const data = await this.makeRequest<MarketNews[]>('/company-news', {
        symbol: symbol.toUpperCase(),
        from: fromStr,
        to: toStr
      })

      if (data && Array.isArray(data)) {
        this.cache.set(cacheKey, data, 'news')
        return data
      }
      
      return []
    } catch (error) {
      console.error(`Failed to fetch company news for ${symbol}:`, error)
      return []
    }
  }

  // Currency conversion for international stocks
  async getCurrencyExchange(base: string, target: string): Promise<CurrencyExchange | null> {
    const cacheKey = `forex_${base}_${target}`
    const cached = this.cache.get<CurrencyExchange>(cacheKey, 'forex')
    
    if (cached) {
      return cached
    }

    try {
      // Try using the forex/candle endpoint as a fallback for free plan
      console.log(`Attempting forex conversion for ${base}/${target}...`)
      
      // First try the rates endpoint
      try {
        const data = await this.makeRequest<any>('/forex/rates', {
          base: base.toUpperCase()
        })

        console.log(`Forex rates API response for ${base}/${target}:`, data)

        if (data && data.quote && data.quote[target.toUpperCase()]) {
          const exchange: CurrencyExchange = {
            base: base.toUpperCase(),
            target: target.toUpperCase(),
            rate: data.quote[target.toUpperCase()],
            timestamp: Date.now()
          }
          
          this.cache.set(cacheKey, exchange, 'forex')
          return exchange
        }
      } catch (ratesError) {
        console.log(`Forex rates endpoint failed for ${base}/${target}:`, ratesError)
      }
      
      // Try reverse conversion if direct conversion fails
      try {
        console.log(`Trying reverse conversion for ${target}/${base}`)
        const reverseData = await this.makeRequest<any>('/forex/rates', {
          base: target.toUpperCase()
        })
        
        if (reverseData && reverseData.quote && reverseData.quote[base.toUpperCase()]) {
          const exchange: CurrencyExchange = {
            base: base.toUpperCase(),
            target: target.toUpperCase(),
            rate: 1 / reverseData.quote[base.toUpperCase()],
            timestamp: Date.now()
          }
          
          this.cache.set(cacheKey, exchange, 'forex')
          return exchange
        }
      } catch (reverseError) {
        console.log(`Reverse conversion failed for ${target}/${base}:`, reverseError)
      }
      
      // Fallback: Try using forex/candle endpoint (might work better with free plan)
      try {
        console.log(`Trying forex candle endpoint for ${base}${target}`)
        const candleData = await this.makeRequest<any>('/forex/candle', {
          symbol: `${base.toUpperCase()}${target.toUpperCase()}`,
          resolution: '1',
          from: (Math.floor(Date.now() / 1000) - 3600).toString(), // 1 hour ago
          to: Math.floor(Date.now() / 1000).toString()
        })
        
        console.log(`Forex candle API response for ${base}${target}:`, candleData)
        
        if (candleData && candleData.c && candleData.c.length > 0) {
          const latestPrice = candleData.c[candleData.c.length - 1]
          const exchange: CurrencyExchange = {
            base: base.toUpperCase(),
            target: target.toUpperCase(),
            rate: latestPrice,
            timestamp: Date.now()
          }
          
          this.cache.set(cacheKey, exchange, 'forex')
          return exchange
        }
      } catch (candleError) {
        console.log(`Forex candle endpoint failed for ${base}${target}:`, candleError)
      }
      
      console.warn(`All forex endpoints failed for ${base}/${target}. This currency pair is not available with the current API plan.`)
      return null
    } catch (error) {
      console.error(`Failed to fetch currency exchange ${base}/${target}:`, error)
      return null
    }
  }

  // Convert price to different currency
  async convertPrice(amount: number, fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) return amount

    const exchange = await this.getCurrencyExchange(fromCurrency, toCurrency)
    if (exchange) {
      return amount * exchange.rate
    }
    
    return null
  }

  // Technical indicators calculation
  calculateMovingAverage(prices: number[], period: number): number[] {
    const ma: number[] = []
    
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      ma.push(sum / period)
    }
    
    return ma
  }

  calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    // Calculate RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      const rs = avgGain / avgLoss
      const rsiValue = 100 - (100 / (1 + rs))
      rsi.push(rsiValue)
    }

    return rsi
  }

  // Disconnect WebSocket when service is destroyed
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.subscriptions.clear()
  }
}

// Create a global instance
const marketDataService = new MarketDataService()

// Export the service instance
export { marketDataService }

// Export a global cleanup function
export const cleanupMarketDataService = () => {
  marketDataService.cleanup()
}

// Export the service class for testing
export { MarketDataService }

// Export types
export type { 
  StockQuote, 
  CompanyProfile, 
  SearchResult, 
  HistoricalData, 
  MarketNews, 
  CurrencyExchange,
  WebSocketMessage,
  RealTimeSubscription
}
