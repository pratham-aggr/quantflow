// Market Data Service with Rate Limiting and Caching
// Using Finnhub.io API (60 calls/minute free tier)

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
  finnhubIndustry: string
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

// Rate limiting configuration for Finnhub Free Plan
const RATE_LIMIT = {
  callsPerMinute: 60, // Free plan: 60 calls per minute
  callsPerSecond: 1,  // Free plan: 1 call per second
  retryDelay: 1000,   // 1 second
  maxRetries: 3
}

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds

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

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>()

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
    
    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`market_data_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn('Failed to store in localStorage:', error)
    }
  }

  get(key: string): any | null {
    // Check memory cache first
    const memoryItem = this.cache.get(key)
    if (memoryItem && Date.now() - memoryItem.timestamp < CACHE_DURATION) {
      return memoryItem.data
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`market_data_${key}`)
      if (stored) {
        const item = JSON.parse(stored)
        if (Date.now() - item.timestamp < CACHE_DURATION) {
          // Update memory cache
          this.cache.set(key, item)
          return item.data
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
    }

    return null
  }

  clear(): void {
    this.cache.clear()
    // Clear localStorage items
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('market_data_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }
}

class MarketDataService {
  private serverUrl: string
  private rateLimiter = new RateLimiter()
  private cache = new CacheManager()
  private websocket: WebSocket | null = null
  private subscriptions = new Map<string, RealTimeSubscription[]>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor() {
    // Use the backend API for market data
    this.serverUrl = process.env.REACT_APP_BACKEND_API_URL || ''
    
    if (!this.serverUrl) {
      console.warn('Backend API URL not configured. Some features will not be available.')
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.serverUrl) {
      throw new Error('Server URL not configured')
    }

    const url = new URL(`${this.serverUrl}/api/market-data${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`Making API request to: ${this.serverUrl}/api/market-data${endpoint}`)

    return this.rateLimiter.execute(async () => {
      console.log(`Executing API request for ${endpoint}...`)
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log(`API response status: ${response.status}`)
      
      if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`)
        if (response.status === 429) {
          throw new Error('Rate limit exceeded')
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log(`API response data:`, data)
      return data.data || data // Handle both wrapped and unwrapped responses
    })
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    const cacheKey = `quote_${symbol.toUpperCase()}`
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      console.log(`Returning cached quote for ${symbol}:`, cached)
      return cached
    }

    console.log(`Fetching quote for ${symbol} from API...`)
    try {
      const rawData = await this.makeRequest<any>(`/quote`, { symbol: symbol.toUpperCase() })
      console.log(`API response for ${symbol}:`, rawData)
      
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
        
        console.log(`Mapped quote data for ${symbol}:`, mappedData)
        this.cache.set(cacheKey, mappedData)
        return mappedData
      } else {
        console.log(`Invalid quote data for ${symbol}:`, rawData)
        // Check if it's a non-US stock (free plan limitation)
        if (rawData && rawData.error) {
          console.warn(`Free plan limitation: ${symbol} may not be available (US stocks only)`)
        }
      }
      
      return null
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    const cacheKey = `profile_${symbol.toUpperCase()}`
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const data = await this.makeRequest<CompanyProfile>(`/stock/profile2`, { symbol: symbol.toUpperCase() })
      
      if (data && data.name) {
        this.cache.set(cacheKey, data)
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
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const data = await this.makeRequest<SearchResult>(`/search`, { q: query })
      
      if (data && data.result) {
        this.cache.set(cacheKey, data)
        return data
      }
      
      return null
    } catch (error) {
      console.error(`Failed to search for ${query}:`, error)
      return null
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    console.log(`Getting multiple quotes for symbols:`, symbols)
    const results: Record<string, StockQuote> = {}
    const uncachedSymbols: string[] = []

    // Check cache first
    symbols.forEach(symbol => {
      const cached = this.cache.get(`quote_${symbol.toUpperCase()}`)
      if (cached) {
        console.log(`Using cached quote for ${symbol}:`, cached)
        results[symbol.toUpperCase()] = cached
      } else {
        uncachedSymbols.push(symbol)
      }
    })

    console.log(`Uncached symbols to fetch:`, uncachedSymbols)

    // Fetch uncached symbols with rate limiting (1 call per second for free plan)
    if (uncachedSymbols.length > 0) {
      try {
        // Process symbols sequentially to respect rate limits
        for (const symbol of uncachedSymbols) {
          console.log(`Fetching quote for ${symbol}...`)
          const quote = await this.getStockQuote(symbol)
          if (quote) {
            console.log(`Successfully fetched quote for ${symbol}:`, quote)
            results[symbol.toUpperCase()] = quote
          } else {
            console.log(`Failed to fetch quote for ${symbol}`)
          }
          
          // Add delay between requests to respect rate limits (1 call per second)
          if (uncachedSymbols.indexOf(symbol) < uncachedSymbols.length - 1) {
            console.log(`Waiting 1 second before next request...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        console.log(`All quotes fetched. Results:`, results)
      } catch (error) {
        console.error('Error in getMultipleQuotes:', error)
        throw error
      }
    }

    return results
  }

  clearCache(): void {
    this.cache.clear()
  }

  isConfigured(): boolean {
    return !!this.serverUrl
  }

  // ========== WOW FACTOR ENHANCEMENTS ==========

  // Real-time WebSocket streaming
  connectWebSocket(): void {
    if (!this.serverUrl) {
      console.warn('Server URL not configured, WebSocket connection skipped')
      return
    }

    try {
      // Use server WebSocket endpoint instead of direct Finnhub
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
        this.cache.set(`quote_${trade.s}`, quote)
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
    const cached = this.cache.get(cacheKey)
    
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
        
        this.cache.set(cacheKey, historicalData)
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
    const cached = this.cache.get(cacheKey)
    
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
        this.cache.set(cacheKey, news)
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
    const cached = this.cache.get(cacheKey)
    
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
        this.cache.set(cacheKey, data)
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
    const cached = this.cache.get(cacheKey)
    
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
          
          this.cache.set(cacheKey, exchange)
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
          
          this.cache.set(cacheKey, exchange)
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
          
          this.cache.set(cacheKey, exchange)
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

// Export singleton instance
export const marketDataService = new MarketDataService()

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
