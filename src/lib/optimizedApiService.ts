// Optimized API Service with Request Batching and Intelligent Caching
import { marketDataService } from './marketDataService'

interface BatchedRequest {
  id: string
  symbol: string
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
}

class OptimizedApiService {
  private requestQueue: BatchedRequest[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 100 // 100ms batching window
  private readonly MAX_BATCH_SIZE = 10 // Maximum requests per batch
  private readonly REQUEST_TIMEOUT = 5000 // 5 second timeout per request

  // Batch stock quote requests for better performance
  async getStockQuote(symbol: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: BatchedRequest = {
        id: `${symbol}_${Date.now()}_${Math.random()}`,
        symbol,
        resolve,
        reject,
        timestamp: Date.now()
      }

      this.requestQueue.push(request)
      this.scheduleBatch()
    })
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) return

    this.batchTimeout = setTimeout(() => {
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  private async processBatch(): Promise<void> {
    if (this.requestQueue.length === 0) return

    const batch = this.requestQueue.splice(0, this.MAX_BATCH_SIZE)
    this.batchTimeout = null

    // Process remaining requests if any
    if (this.requestQueue.length > 0) {
      this.scheduleBatch()
    }

    try {
      // Extract unique symbols to avoid duplicate requests
      const symbolSet = new Set(batch.map(req => req.symbol))
      const uniqueSymbols = Array.from(symbolSet)
      
      console.log(`🚀 Processing batch of ${batch.length} requests for ${uniqueSymbols.length} unique symbols`)
      
      // Use the optimized market data service for batch fetching
      const quotes = await marketDataService.getMultipleQuotes(uniqueSymbols)
      
      // Resolve all requests in the batch
      batch.forEach(request => {
        const quote = quotes[request.symbol.toUpperCase()]
        if (quote) {
          request.resolve(quote)
        } else {
          request.reject(new Error(`No data available for ${request.symbol}`))
        }
      })
      
    } catch (error) {
      console.error('Batch processing failed:', error)
      // Reject all requests in the batch
      batch.forEach(request => {
        request.reject(error)
      })
    }
  }

  // Get multiple quotes with intelligent batching
  async getMultipleQuotes(symbols: string[]): Promise<Record<string, any>> {
    if (symbols.length === 0) return {}

    // For small batches, use direct API calls
    if (symbols.length <= 3) {
      return await marketDataService.getMultipleQuotes(symbols)
    }

    // For larger batches, use our batching system
    const promises = symbols.map(symbol => this.getStockQuote(symbol))
    const results = await Promise.allSettled(promises)
    
    const quotes: Record<string, any> = {}
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        quotes[symbols[index].toUpperCase()] = result.value
      }
    })

    return quotes
  }

  // Cleanup method
  cleanup(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
    
    // Reject all pending requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Service cleanup - request cancelled'))
    })
    
    this.requestQueue = []
  }
}

// Create singleton instance
const optimizedApiService = new OptimizedApiService()

export { optimizedApiService }
export default OptimizedApiService
