import cron from 'node-cron'
import { marketDataService } from './marketDataService.js'
import { redisClient } from '../config/redis.js'

class SchedulerService {
  constructor() {
    this.jobs = new Map()
    this.isRunning = false
  }

  // Start all scheduled jobs
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running')
      return
    }

    console.log('🚀 Starting market data scheduler...')
    this.isRunning = true

    // Schedule popular stocks update every 5 minutes
    this.schedulePopularStocksUpdate()
    
    // Schedule cache cleanup every hour
    this.scheduleCacheCleanup()
    
    // Schedule market data health check every 15 minutes
    this.scheduleHealthCheck()

    console.log('✅ Market data scheduler started successfully')
  }

  // Stop all scheduled jobs
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running')
      return
    }

    console.log('🛑 Stopping market data scheduler...')
    
    this.jobs.forEach((job, name) => {
      job.stop()
      console.log(`Stopped job: ${name}`)
    })
    
    this.jobs.clear()
    this.isRunning = false
    
    console.log('✅ Market data scheduler stopped')
  }

  // Schedule popular stocks update (every 5 minutes)
  schedulePopularStocksUpdate() {
    const job = cron.schedule('*/5 * * * *', async () => {
      console.log('📈 Scheduled: Updating popular stocks cache...')
      try {
        await marketDataService.updatePopularStocksCache()
        console.log('✅ Popular stocks cache updated successfully')
      } catch (error) {
        console.error('❌ Failed to update popular stocks cache:', error.message)
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York' // Market timezone
    })

    this.jobs.set('popularStocksUpdate', job)
    job.start()
    console.log('📅 Scheduled: Popular stocks update (every 5 minutes)')
  }

  // Schedule cache cleanup (every hour)
  scheduleCacheCleanup() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('🧹 Scheduled: Cleaning up expired cache entries...')
      try {
        // Get all cache keys
        const keys = await redisClient.keys('stock:*')
        let cleanedCount = 0
        
        for (const key of keys) {
          const ttl = await redisClient.ttl(key)
          if (ttl === -1) { // No expiration set
            await redisClient.expire(key, 3600) // Set 1 hour expiration
            cleanedCount++
          }
        }
        
        console.log(`✅ Cache cleanup completed. Processed ${keys.length} keys, cleaned ${cleanedCount}`)
      } catch (error) {
        console.error('❌ Failed to clean cache:', error.message)
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    })

    this.jobs.set('cacheCleanup', job)
    job.start()
    console.log('📅 Scheduled: Cache cleanup (every hour)')
  }

  // Schedule health check (every 15 minutes)
  scheduleHealthCheck() {
    const job = cron.schedule('*/15 * * * *', async () => {
      console.log('🏥 Scheduled: Running market data health check...')
      try {
        const stats = await marketDataService.getCacheStats()
        const isConfigured = marketDataService.isConfigured()
        
        console.log('📊 Market Data Health Check:')
        console.log(`  - API Configured: ${isConfigured ? '✅' : '❌'}`)
        console.log(`  - Cache Entries: ${stats.totalCacheEntries || 0}`)
        console.log(`  - Rate Limit Entries: ${stats.rateLimitEntries || 0}`)
        console.log(`  - Popular Stocks Cached: ${stats.popularStocksCached ? '✅' : '❌'}`)
        
        // Test API connection if configured
        if (isConfigured) {
          try {
            const testQuote = await marketDataService.getStockQuote('AAPL')
            console.log(`  - API Test: ${testQuote ? '✅' : '❌'}`)
          } catch (error) {
            console.log(`  - API Test: ❌ (${error.message})`)
          }
        }
        
        console.log('✅ Health check completed')
      } catch (error) {
        console.error('❌ Health check failed:', error.message)
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    })

    this.jobs.set('healthCheck', job)
    job.start()
    console.log('📅 Scheduled: Health check (every 15 minutes)')
  }

  // Manually trigger popular stocks update
  async triggerPopularStocksUpdate() {
    console.log('🔄 Manually triggering popular stocks update...')
    try {
      await marketDataService.updatePopularStocksCache()
      console.log('✅ Manual popular stocks update completed')
      return true
    } catch (error) {
      console.error('❌ Manual popular stocks update failed:', error.message)
      return false
    }
  }

  // Manually trigger cache cleanup
  async triggerCacheCleanup() {
    console.log('🧹 Manually triggering cache cleanup...')
    try {
      await marketDataService.clearCache()
      console.log('✅ Manual cache cleanup completed')
      return true
    } catch (error) {
      console.error('❌ Manual cache cleanup failed:', error.message)
      return false
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    }
  }

  // Get job details
  getJobDetails() {
    const details = {}
    this.jobs.forEach((job, name) => {
      details[name] = {
        running: job.running,
        nextDate: job.nextDate(),
        lastDate: job.lastDate()
      }
    })
    return details
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService()

