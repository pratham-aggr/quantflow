import dotenv from 'dotenv'
import { connectRedis, disconnectRedis } from './config/redis.js'
import { marketDataService } from './services/marketDataService.js'
import { schedulerService } from './services/schedulerService.js'

dotenv.config()

async function testMarketDataService() {
  console.log('🧪 Testing QuantFlow Market Data Service...\n')

  try {
    // Test Redis connection
    console.log('1. Testing Redis connection...')
    const redisConnected = await connectRedis()
    if (redisConnected) {
      console.log('✅ Redis connected successfully')
    } else {
      console.log('❌ Redis connection failed')
      return
    }

    // Test market data service configuration
    console.log('\n2. Testing market data service configuration...')
    const isConfigured = marketDataService.isConfigured()
    console.log(`API Configured: ${isConfigured ? '✅' : '❌'}`)
    
    if (!isConfigured) {
      console.log('⚠️  Set FINNHUB_API_KEY environment variable to test API functionality')
    }

    // Test cache operations
    console.log('\n3. Testing cache operations...')
    const cacheStats = await marketDataService.getCacheStats()
    console.log('Cache Stats:', cacheStats)

    // Test popular stocks cache
    console.log('\n4. Testing popular stocks cache...')
    const popularStocks = await marketDataService.getPopularStocks()
    console.log(`Popular stocks cached: ${Object.keys(popularStocks).length}`)

    // Test scheduler
    console.log('\n5. Testing scheduler...')
    const schedulerStatus = schedulerService.getStatus()
    console.log('Scheduler Status:', schedulerStatus)

    // Test API endpoints (if configured)
    if (isConfigured) {
      console.log('\n6. Testing API functionality...')
      
      // Test single quote
      console.log('Testing single stock quote...')
      const aaplQuote = await marketDataService.getStockQuote('AAPL')
      if (aaplQuote) {
        console.log('✅ AAPL quote fetched:', {
          symbol: aaplQuote.symbol,
          price: aaplQuote.price,
          change: aaplQuote.change
        })
      } else {
        console.log('❌ Failed to fetch AAPL quote')
      }

      // Test multiple quotes
      console.log('\nTesting multiple stock quotes...')
      const multipleQuotes = await marketDataService.getMultipleQuotes(['AAPL', 'GOOGL'])
      console.log(`✅ Fetched ${Object.keys(multipleQuotes).length} quotes`)

      // Test company profile
      console.log('\nTesting company profile...')
      const profile = await marketDataService.getCompanyProfile('AAPL')
      if (profile) {
        console.log('✅ Company profile fetched:', {
          name: profile.name,
          industry: profile.finnhubIndustry
        })
      } else {
        console.log('❌ Failed to fetch company profile')
      }

      // Test search
      console.log('\nTesting stock search...')
      const searchResults = await marketDataService.searchStocks('apple')
      if (searchResults) {
        console.log(`✅ Search results: ${searchResults.count} found`)
      } else {
        console.log('❌ Failed to search stocks')
      }
    }

    // Test cache operations
    console.log('\n7. Testing cache operations...')
    await marketDataService.updatePopularStocksCache()
    console.log('✅ Popular stocks cache updated')

    // Final cache stats
    console.log('\n8. Final cache statistics...')
    const finalStats = await marketDataService.getCacheStats()
    console.log('Final Cache Stats:', finalStats)

    console.log('\n🎉 Market Data Service Test Completed Successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    // Cleanup
    await disconnectRedis()
    console.log('\n🧹 Cleanup completed')
  }
}

// Run the test
testMarketDataService()

