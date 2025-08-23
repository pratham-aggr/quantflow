import express from 'express'
import { marketDataService } from '../services/marketDataService.js'
import { schedulerService } from '../services/schedulerService.js'

// Get market data service (only real service)
const getMarketDataService = () => {
  return marketDataService
}

const router = express.Router()

// Middleware to validate stock symbol
const validateSymbol = (req, res, next) => {
  const { symbol } = req.params
  if (!symbol || symbol.length < 1 || symbol.length > 10) {
    return res.status(400).json({ 
      error: 'Invalid symbol. Must be 1-10 characters long.' 
    })
  }
  next()
}

// Middleware to validate search query
const validateSearchQuery = (req, res, next) => {
  const { q } = req.query
  if (!q || q.length < 2) {
    return res.status(400).json({ 
      error: 'Search query must be at least 2 characters long.' 
    })
  }
  next()
}

// GET /api/market-data/quote/:symbol - Get stock quote
router.get('/quote/:symbol', validateSymbol, async (req, res) => {
  try {
    const { symbol } = req.params
    console.log(`API: Fetching quote for ${symbol}`)
    
    const quote = await getMarketDataService().getStockQuote(symbol)
    
    if (!quote) {
      return res.status(404).json({ 
        error: `No data available for symbol: ${symbol}` 
      })
    }
    
    res.json({
      success: true,
      data: quote,
      cached: true, // Always true since we use Redis caching
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`API Error: Failed to fetch quote for ${req.params.symbol}:`, error.message)
    res.status(500).json({ 
      error: 'Failed to fetch stock quote',
      details: error.message 
    })
  }
})

// GET /api/market-data/quotes - Get multiple stock quotes
router.get('/quotes', async (req, res) => {
  try {
    const { symbols } = req.query
    
    if (!symbols) {
      return res.status(400).json({ 
        error: 'Symbols parameter is required. Use comma-separated values.' 
      })
    }
    
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0)
    
    if (symbolArray.length === 0) {
      return res.status(400).json({ 
        error: 'No valid symbols provided' 
      })
    }
    
    if (symbolArray.length > 50) {
      return res.status(400).json({ 
        error: 'Maximum 50 symbols allowed per request' 
      })
    }
    
    console.log(`API: Fetching quotes for ${symbolArray.length} symbols`)
    
    const quotes = await getMarketDataService().getMultipleQuotes(symbolArray)
    
    res.json({
      success: true,
      data: quotes,
      requested: symbolArray,
      found: Object.keys(quotes).length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error: Failed to fetch multiple quotes:', error.message)
    res.status(500).json({ 
      error: 'Failed to fetch stock quotes',
      details: error.message 
    })
  }
})

// GET /api/market-data/profile/:symbol - Get company profile
router.get('/profile/:symbol', validateSymbol, async (req, res) => {
  try {
    const { symbol } = req.params
    console.log(`API: Fetching profile for ${symbol}`)
    
    const profile = await getMarketDataService().getCompanyProfile(symbol)
    
    if (!profile) {
      return res.status(404).json({ 
        error: `No profile available for symbol: ${symbol}` 
      })
    }
    
    res.json({
      success: true,
      data: profile,
      cached: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`API Error: Failed to fetch profile for ${req.params.symbol}:`, error.message)
    res.status(500).json({ 
      error: 'Failed to fetch company profile',
      details: error.message 
    })
  }
})

// GET /api/market-data/search - Search stocks
router.get('/search', validateSearchQuery, async (req, res) => {
  try {
    const { q } = req.query
    console.log(`API: Searching for "${q}"`)
    
    const results = await getMarketDataService().searchStocks(q)
    
    if (!results) {
      return res.json({
        success: true,
        data: { count: 0, result: [] },
        query: q,
        timestamp: new Date().toISOString()
      })
    }
    
    res.json({
      success: true,
      data: results,
      query: q,
      cached: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`API Error: Failed to search for "${req.query.q}":`, error.message)
    res.status(500).json({ 
      error: 'Failed to search stocks',
      details: error.message 
    })
  }
})

// GET /api/market-data/popular - Get popular stocks
router.get('/popular', async (req, res) => {
  try {
    console.log('API: Fetching popular stocks')
    
    const popularStocks = await getMarketDataService().getPopularStocks()
    
    res.json({
      success: true,
      data: popularStocks,
      count: Object.keys(popularStocks).length,
      cached: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error: Failed to fetch popular stocks:', error.message)
    res.status(500).json({ 
      error: 'Failed to fetch popular stocks',
      details: error.message 
    })
  }
})

// GET /api/market-data/status - Get service status
router.get('/status', async (req, res) => {
  try {
    const currentService = getMarketDataService()
    const isConfigured = currentService.isConfigured()
    const cacheStats = await currentService.getCacheStats()
    const schedulerStatus = schedulerService.getStatus()
    
    res.json({
      success: true,
      data: {
        api: {
          configured: isConfigured,
          provider: 'Finnhub.io',
          rateLimit: '60 calls/minute'
        },
        cache: {
          ...cacheStats,
          popularStocksCount: Object.keys(await marketDataService.getPopularStocks()).length
        },
        scheduler: schedulerStatus,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('API Error: Failed to get status:', error.message)
    res.status(500).json({ 
      error: 'Failed to get service status',
      details: error.message 
    })
  }
})

// POST /api/market-data/refresh - Manually trigger cache refresh
router.post('/refresh', async (req, res) => {
  try {
    const { type } = req.body
    
    if (type === 'popular') {
      const success = await schedulerService.triggerPopularStocksUpdate()
      res.json({
        success,
        message: success ? 'Popular stocks cache refreshed' : 'Failed to refresh popular stocks cache'
      })
    } else if (type === 'cache') {
      const success = await schedulerService.triggerCacheCleanup()
      res.json({
        success,
        message: success ? 'Cache cleared' : 'Failed to clear cache'
      })
    } else {
      res.status(400).json({ 
        error: 'Invalid refresh type. Use "popular" or "cache"' 
      })
    }
  } catch (error) {
    console.error('API Error: Failed to refresh cache:', error.message)
    res.status(500).json({ 
      error: 'Failed to refresh cache',
      details: error.message 
    })
  }
})

// DELETE /api/market-data/cache/:symbol - Clear specific cache entry
router.delete('/cache/:symbol', validateSymbol, async (req, res) => {
  try {
    const { symbol } = req.params
    const { redisClient, CACHE_KEYS } = await import('../config/redis.js')
    
    const quoteKey = CACHE_KEYS.STOCK_QUOTE(symbol)
    const profileKey = CACHE_KEYS.COMPANY_PROFILE(symbol)
    
    await redisClient.del(quoteKey, profileKey)
    
    res.json({
      success: true,
      message: `Cache cleared for ${symbol}`,
      cleared: [quoteKey, profileKey]
    })
  } catch (error) {
    console.error(`API Error: Failed to clear cache for ${req.params.symbol}:`, error.message)
    res.status(500).json({ 
      error: 'Failed to clear cache',
      details: error.message 
    })
  }
})

export default router

