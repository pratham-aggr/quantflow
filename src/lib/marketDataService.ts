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
  private apiKey: string
  private baseUrl = 'https://finnhub.io/api/v1'
  private rateLimiter = new RateLimiter()
  private cache = new CacheManager()

  constructor() {
    this.apiKey = process.env.REACT_APP_FINNHUB_API_KEY || ''
    
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured. Please set REACT_APP_FINNHUB_API_KEY environment variable.')
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('API key not configured')
    }

    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.append('token', this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`Making API request to: ${url.toString()}`)

    return this.rateLimiter.execute(async () => {
      console.log(`Executing API request for ${endpoint}...`)
      const response = await fetch(url.toString())
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
      return data
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
      
      // Map Finnhub API response to our StockQuote interface
      if (rawData && rawData.c) {
        const mappedData: StockQuote = {
          symbol: symbol.toUpperCase(),
          price: rawData.c, // current price
          change: rawData.d, // change
          changePercent: rawData.dp, // change percent
          high: rawData.h, // high
          low: rawData.l, // low
          open: rawData.o, // open
          previousClose: rawData.pc, // previous close
          volume: rawData.v || 0, // volume
          timestamp: Date.now() // current timestamp
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
    return !!this.apiKey
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService()

// Export types
export type { StockQuote, CompanyProfile, SearchResult }
