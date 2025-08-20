import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// Upstash Redis REST API configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Cache configuration
const CACHE_CONFIG = {
  STOCK_QUOTE_TTL: 15 * 60, // 15 minutes in seconds
  COMPANY_PROFILE_TTL: 60 * 60, // 1 hour in seconds
  SEARCH_RESULT_TTL: 30 * 60, // 30 minutes in seconds
  POPULAR_STOCKS_TTL: 5 * 60, // 5 minutes in seconds
  RATE_LIMIT_TTL: 60, // 1 minute in seconds
}

// Cache keys
const CACHE_KEYS = {
  STOCK_QUOTE: (symbol) => `stock:quote:${symbol.toUpperCase()}`,
  COMPANY_PROFILE: (symbol) => `stock:profile:${symbol.toUpperCase()}`,
  SEARCH_RESULT: (query) => `stock:search:${query.toLowerCase()}`,
  POPULAR_STOCKS: 'stock:popular',
  RATE_LIMIT: (key) => `rate_limit:${key}`,
  API_CALLS_COUNT: 'api:calls:count',
  API_CALLS_RESET: 'api:calls:reset'
}

// Upstash Redis REST API client
class UpstashRedisClient {
  constructor() {
    this.baseUrl = UPSTASH_REDIS_REST_URL
    this.token = UPSTASH_REDIS_REST_TOKEN
    
    if (!this.baseUrl || !this.token) {
      console.warn('⚠️ Upstash Redis credentials not configured. Some features may be limited.')
    }
  }

  async request(command, args = []) {
    if (!this.baseUrl || !this.token) {
      throw new Error('Upstash Redis not configured')
    }

    try {
      const response = await axios({
        method: 'POST',
        url: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        data: {
          command: command,
          args: args
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Upstash Redis API error:', error.response?.data || error.message)
      throw error
    }
  }

  // GET key
  async get(key) {
    const response = await this.request('GET', [key])
    return response.result
  }

  // SET key value [EX seconds]
  async set(key, value, ex = null) {
    const args = [key, value]
    if (ex) {
      args.push('EX', ex.toString())
    }
    
    const response = await this.request('SET', args)
    return response.result
  }

  // DEL key1 [key2 ...]
  async del(...keys) {
    const response = await this.request('DEL', keys)
    return response.result
  }

  // INCR key
  async incr(key) {
    const response = await this.request('INCR', [key])
    return response.result
  }

  // EXPIRE key seconds
  async expire(key, seconds) {
    const response = await this.request('EXPIRE', [key, seconds.toString()])
    return response.result
  }

  // TTL key
  async ttl(key) {
    const response = await this.request('TTL', [key])
    return response.result
  }

  // EXISTS key1 [key2 ...]
  async exists(...keys) {
    const response = await this.request('EXISTS', keys)
    return response.result
  }

  // KEYS pattern
  async keys(pattern) {
    const response = await this.request('KEYS', [pattern])
    return response.result || []
  }
}

// Create singleton instance
const redisClient = new UpstashRedisClient()

// Connect to Redis (no-op for REST API, but keeping interface consistent)
const connectRedis = async () => {
  try {
    // Test connection by making a simple request
    await redisClient.set('test_connection', 'ok', 60)
    const result = await redisClient.get('test_connection')
    console.log('✅ Upstash Redis connected successfully')
    return true
  } catch (error) {
    console.error('Failed to connect to Upstash Redis:', error.message)
    return false
  }
}

// Disconnect from Redis (no-op for REST API)
const disconnectRedis = async () => {
  console.log('Upstash Redis disconnected')
}

export {
  redisClient,
  connectRedis,
  disconnectRedis,
  CACHE_CONFIG,
  CACHE_KEYS
}
