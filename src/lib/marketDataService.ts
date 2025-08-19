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

// Rate limiting configuration
const RATE_LIMIT = {
  callsPerMinute: 60,
  callsPerSecond: 1,
  retryDelay: 1000, // 1 second
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
      console.warn('Finnhub API key not found. Using mock data.')
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
      const data = await this.makeRequest<StockQuote>(`/quote`, { symbol: symbol.toUpperCase() })
      console.log(`API response for ${symbol}:`, data)
      
      if (data && data.price > 0) {
        console.log(`Valid quote received for ${symbol}:`, data)
        this.cache.set(cacheKey, data)
        return data
      } else {
        console.log(`Invalid quote data for ${symbol}:`, data)
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
    const results: Record<string, StockQuote> = {}
    const uncachedSymbols: string[] = []

    // Check cache first
    symbols.forEach(symbol => {
      const cached = this.cache.get(`quote_${symbol.toUpperCase()}`)
      if (cached) {
        results[symbol.toUpperCase()] = cached
      } else {
        uncachedSymbols.push(symbol)
      }
    })

    // Fetch uncached symbols
    if (uncachedSymbols.length > 0) {
      const promises = uncachedSymbols.map(async (symbol) => {
        const quote = await this.getStockQuote(symbol)
        if (quote) {
          results[symbol.toUpperCase()] = quote
        }
      })

      await Promise.all(promises)
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
