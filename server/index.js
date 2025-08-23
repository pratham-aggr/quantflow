import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Import our services
import { connectRedis, disconnectRedis } from './config/redis.js'
import { marketDataService } from './services/marketDataService.js'
import { mockMarketDataService } from './services/mockMarketDataService.js'
import { schedulerService } from './services/schedulerService.js'
import marketDataRoutes from './routes/marketData.js'

dotenv.config()

const app = express()
app.use(cors({ origin: ['http://localhost:3000'], credentials: true }))
app.use(express.json())

// Environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Auth middleware using Supabase JWT
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' })

    req.user = data.user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ error: 'Unauthorized' })
  }
}

// Initialize services
async function initializeServices() {
  console.log('🚀 Initializing QuantFlow API services...')
  
  // Connect to Redis
  const redisConnected = await connectRedis()
  if (!redisConnected) {
    console.warn('⚠️ Redis connection failed. Some features may be limited.')
  }
  
  // Initialize market data service
  if (marketDataService.isConfigured()) {
    console.log('✅ Market data service configured (using Finnhub API)')
    
    // Start scheduler
    schedulerService.start()
    
    // Initial popular stocks cache update
    try {
      await marketDataService.updatePopularStocksCache()
      console.log('✅ Initial popular stocks cache updated')
    } catch (error) {
      console.warn('⚠️ Failed to update initial popular stocks cache:', error.message)
    }
  } else {
    console.log('🔄 Market data service not configured - using mock data service')
    
    // Use mock service instead
    global.marketDataService = mockMarketDataService
    
    // Start scheduler with mock service
    schedulerService.start()
    
    // Initial popular stocks cache update with mock service
    try {
      await mockMarketDataService.updatePopularStocksCache()
      console.log('✅ Initial mock popular stocks cache updated')
    } catch (error) {
      console.warn('⚠️ Failed to update initial mock popular stocks cache:', error.message)
    }
  }
  
  console.log('✅ Services initialized successfully')
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'connected', // We'll assume it's connected if the server is running
      marketData: marketDataService.isConfigured(),
      scheduler: schedulerService.getStatus().isRunning
    }
  })
})

// Market data routes (public - no auth required for market data)
app.use('/api/market-data', marketDataRoutes)

// Protected example
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ message: 'Protected content', user_id: req.user.id, email: req.user.email })
})

// Current user profile from DB (example)
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ user: req.user, profile: data })
  } catch (err) {
    console.error('GET /api/me error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin routes for service management
app.get('/api/admin/services/status', requireAuth, async (req, res) => {
  try {
    const marketDataStatus = marketDataService.isConfigured()
    const schedulerStatus = schedulerService.getStatus()
    const cacheStats = await marketDataService.getCacheStats()
    
    res.json({
      marketData: {
        configured: marketDataStatus,
        provider: 'Finnhub.io'
      },
      scheduler: schedulerStatus,
      cache: cacheStats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Admin status error:', error)
    res.status(500).json({ error: 'Failed to get service status' })
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down QuantFlow API...')
  
  // Stop scheduler
  schedulerService.stop()
  
  // Disconnect Redis
  await disconnectRedis()
  
  console.log('✅ Shutdown complete')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  
  // Stop scheduler
  schedulerService.stop()
  
  // Disconnect Redis
  await disconnectRedis()
  
  console.log('✅ Shutdown complete')
  process.exit(0)
})

const PORT = process.env.PORT || 4000

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 QuantFlow API listening on http://localhost:${PORT}`)
  
  // Initialize services after server starts
  await initializeServices()
  
  console.log(`
📊 QuantFlow API Server Started Successfully!

🔗 API Endpoints:
   - Health Check: GET /api/health
   - Market Data: GET /api/market-data/*
   - Protected: GET /api/protected
   - User Profile: GET /api/me
   - Admin Status: GET /api/admin/services/status

📈 Market Data Features:
   - Stock Quotes: GET /api/market-data/quote/:symbol
   - Multiple Quotes: GET /api/market-data/quotes?symbols=AAPL,GOOGL
   - Company Profiles: GET /api/market-data/profile/:symbol
   - Stock Search: GET /api/market-data/search?q=apple
   - Popular Stocks: GET /api/market-data/popular
   - Service Status: GET /api/market-data/status

🔄 Scheduled Jobs:
   - Popular stocks update: Every 5 minutes
   - Cache cleanup: Every hour
   - Health check: Every 15 minutes

💾 Caching:
   - Stock quotes: 15 minutes
   - Company profiles: 1 hour
   - Search results: 30 minutes
   - Popular stocks: 5 minutes
  `)
})
