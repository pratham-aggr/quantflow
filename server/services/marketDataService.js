import axios from 'axios'
import { redisClient, CACHE_CONFIG, CACHE_KEYS } from '../config/redis.js'

// Finnhub API configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Rate limiting configuration for Finnhub Free Plan
const RATE_LIMIT = {
  callsPerMinute: 60,
  callsPerSecond: 1,
  retryDelay: 1000,
  maxRetries: 3
}

// Popular stocks to cache frequently
const POPULAR_STOCKS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JPM', 'JNJ',
  'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'ADBE', 'CRM'
]

class MarketDataService {
  constructor() {
    this.apiKey = FINNHUB_API_KEY
    this.baseUrl = FINNHUB_BASE_URL
    
    if (!this.apiKey) {
      console.warn('⚠️ Finnhub API key not configured. Market data service will use cached data only.')
    }
  }

  // Check if API is configured
  isConfigured() {
    return !!this.apiKey
  }

  // Rate limiting check
  async checkRateLimit() {
    try {
      const currentTime = Math.floor(Date.now() / 1000)
      const rateLimitKey = CACHE_KEYS.RATE_LIMIT('finnhub')
      
      // Get current call count
      const callCount = await redisClient.get(rateLimitKey) || 0
      
      if (parseInt(callCount) >= RATE_LIMIT.callsPerMinute) {
        const resetTime = await redisClient.get(CACHE_KEYS.API_CALLS_RESET) || currentTime
        const timeToReset = parseInt(resetTime) - currentTime
        
        if (timeToReset > 0) {
          throw new Error(`Rate limit exceeded. Try again in ${timeToReset} seconds.`)
        } else {
          // Reset counter
          await redisClient.set(rateLimitKey, '0', 'EX', 60)
          await redisClient.set(CACHE_KEYS.API_CALLS_RESET, currentTime + 60, 'EX', 60)
        }
      }
      
      // Increment call count
      await redisClient.incr(rateLimitKey)
      await redisClient.expire(rateLimitKey, 60)
      
      return true
    } catch (error) {
      console.error('Rate limit check failed:', error)
      return false
    }
  }

  // Make API request with rate limiting and retries
  async makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
      throw new Error('API key not configured')
    }

    // Check rate limit
    const canProceed = await this.checkRateLimit()
    if (!canProceed) {
      throw new Error('Rate limit exceeded')
    }

    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.append('token', this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`Making API request to: ${url.toString()}`)

    let lastError
    for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
      try {
        const response = await axios.get(url.toString(), {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'QuantFlow/1.0'
          }
        })

        console.log(`API response status: ${response.status}`)
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded')
        }
        
        if (response.status !== 200) {
          throw new Error(`API request failed: ${response.status}`)
        }

        return response.data
      } catch (error) {
        lastError = error
        console.error(`API request attempt ${attempt} failed:`, error.message)
        
        if (attempt < RATE_LIMIT.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
        }
      }
    }

    throw lastError || new Error('API request failed after all retries')
  }

  // Get stock quote with caching
  async getStockQuote(symbol) {
    const cacheKey = CACHE_KEYS.STOCK_QUOTE(symbol)
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        console.log(`Returning cached quote for ${symbol}`)
        return JSON.parse(cached)
      }

      // Fetch from API
      console.log(`Fetching quote for ${symbol} from API...`)
      const rawData = await this.makeRequest('/quote', { symbol: symbol.toUpperCase() })
      
      if (rawData && rawData.c) {
        const mappedData = {
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
        
        // Cache the result
        await redisClient.set(cacheKey, JSON.stringify(mappedData), 'EX', CACHE_CONFIG.STOCK_QUOTE_TTL)
        
        console.log(`Cached quote for ${symbol}`)
        return mappedData
      }
      
      return null
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error.message)
      return null
    }
  }

  // Get company profile with caching
  async getCompanyProfile(symbol) {
    const cacheKey = CACHE_KEYS.COMPANY_PROFILE(symbol)
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Fetch from API
      const data = await this.makeRequest('/stock/profile2', { symbol: symbol.toUpperCase() })
      
      if (data && data.name) {
        // Cache the result
        await redisClient.set(cacheKey, JSON.stringify(data), 'EX', CACHE_CONFIG.COMPANY_PROFILE_TTL)
        return data
      }
      
      return null
    } catch (error) {
      console.error(`Failed to fetch profile for ${symbol}:`, error.message)
      return null
    }
  }

  // Search stocks with caching
  async searchStocks(query) {
    if (query.length < 2) return null

    const cacheKey = CACHE_KEYS.SEARCH_RESULT(query)
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Fetch from API
      const data = await this.makeRequest('/search', { q: query })
      
      if (data && data.result) {
        // Cache the result
        await redisClient.set(cacheKey, JSON.stringify(data), 'EX', CACHE_CONFIG.SEARCH_RESULT_TTL)
        return data
      }
      
      return null
    } catch (error) {
      console.error(`Failed to search for ${query}:`, error.message)
      return null
    }
  }

  // Get multiple quotes with batching
  async getMultipleQuotes(symbols) {
    console.log(`Getting multiple quotes for symbols:`, symbols)
    const results = {}
    const uncachedSymbols = []

    // Check cache first
    for (const symbol of symbols) {
      const cacheKey = CACHE_KEYS.STOCK_QUOTE(symbol)
      const cached = await redisClient.get(cacheKey)
      
      if (cached) {
        console.log(`Using cached quote for ${symbol}`)
        results[symbol.toUpperCase()] = JSON.parse(cached)
      } else {
        uncachedSymbols.push(symbol)
      }
    }

    console.log(`Uncached symbols to fetch:`, uncachedSymbols)

    // Fetch uncached symbols with rate limiting
    if (uncachedSymbols.length > 0) {
      for (const symbol of uncachedSymbols) {
        try {
          console.log(`Fetching quote for ${symbol}...`)
          const quote = await this.getStockQuote(symbol)
          if (quote) {
            console.log(`Successfully fetched quote for ${symbol}`)
            results[symbol.toUpperCase()] = quote
          }
          
          // Add delay between requests to respect rate limits
          if (uncachedSymbols.indexOf(symbol) < uncachedSymbols.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error(`Failed to fetch quote for ${symbol}:`, error.message)
        }
      }
    }

    return results
  }

  // Update popular stocks cache
  async updatePopularStocksCache() {
    console.log('Updating popular stocks cache...')
    
    try {
      const quotes = await this.getMultipleQuotes(POPULAR_STOCKS)
      
      if (Object.keys(quotes).length > 0) {
        await redisClient.set(
          CACHE_KEYS.POPULAR_STOCKS, 
          JSON.stringify(quotes), 
          'EX', 
          CACHE_CONFIG.POPULAR_STOCKS_TTL
        )
        console.log(`Updated popular stocks cache with ${Object.keys(quotes).length} stocks`)
      }
    } catch (error) {
      console.error('Failed to update popular stocks cache:', error.message)
    }
  }

  // Get popular stocks from cache
  async getPopularStocks() {
    try {
      const cached = await redisClient.get(CACHE_KEYS.POPULAR_STOCKS)
      return cached ? JSON.parse(cached) : {}
    } catch (error) {
      console.error('Failed to get popular stocks from cache:', error.message)
      return {}
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const keys = await redisClient.keys('stock:*')
      if (keys.length > 0) {
        await redisClient.del(keys)
        console.log(`Cleared ${keys.length} cache entries`)
      }
    } catch (error) {
      console.error('Failed to clear cache:', error.message)
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const keys = await redisClient.keys('stock:*')
      const rateLimitKeys = await redisClient.keys('rate_limit:*')
      
      return {
        totalCacheEntries: keys.length,
        rateLimitEntries: rateLimitKeys.length,
        popularStocksCached: await redisClient.exists(CACHE_KEYS.POPULAR_STOCKS),
        cacheKeys: keys.slice(0, 10) // First 10 keys for debugging
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error.message)
      return {}
    }
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService()

