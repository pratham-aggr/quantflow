// Backend-aware Market Data Service
// This service tries to use the backend server first, then falls back to frontend service

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

interface SearchResult {
  count: number
  result: Array<{
    description: string
    displaySymbol: string
    symbol: string
    type: string
  }>
}

class BackendMarketDataService {
  private backendUrl: string
  private useBackend: boolean

  constructor() {
    // Try to use backend server if available
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'
    this.useBackend = true // Default to using backend
  }

  // Check if backend is available
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Short timeout to avoid hanging
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch (error) {
      console.log('Backend not available, will use frontend service:', error)
      return false
    }
  }

  // Get stock quote with backend fallback
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // First try backend
      if (this.useBackend) {
        const isBackendHealthy = await this.checkBackendHealth()
        if (isBackendHealthy) {
          console.log(`Using backend for quote: ${symbol}`)
          const response = await fetch(`${this.backendUrl}/api/market-data/quote/${symbol}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              return data.data
            }
          } else {
            console.log(`Backend quote failed for ${symbol}, status: ${response.status}`)
          }
        } else {
          this.useBackend = false // Disable backend for future requests
        }
      }

      // Fallback to frontend service
      console.log(`Using frontend service for quote: ${symbol}`)
      const { marketDataService } = await import('./marketDataService')
      return await marketDataService.getStockQuote(symbol)
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error)
      return null
    }
  }

  // Search stocks with backend fallback
  async searchStocks(query: string): Promise<SearchResult | null> {
    if (query.length < 2) return null

    try {
      // First try backend
      if (this.useBackend) {
        const isBackendHealthy = await this.checkBackendHealth()
        if (isBackendHealthy) {
          console.log(`Using backend for search: ${query}`)
          const response = await fetch(`${this.backendUrl}/api/market-data/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              return data.data
            }
          } else {
            console.log(`Backend search failed for ${query}, status: ${response.status}`)
          }
        } else {
          this.useBackend = false // Disable backend for future requests
        }
      }

      // Fallback to frontend service
      console.log(`Using frontend service for search: ${query}`)
      const { marketDataService } = await import('./marketDataService')
      return await marketDataService.searchStocks(query)
    } catch (error) {
      console.error(`Failed to search for ${query}:`, error)
      return null
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    // Always return true since we have fallback options
    return true
  }

  // Get service status
  async getStatus(): Promise<{ backend: boolean; frontend: boolean }> {
    const backendHealthy = await this.checkBackendHealth()
    const { marketDataService } = await import('./marketDataService')
    const frontendConfigured = marketDataService.isConfigured()
    
    return {
      backend: backendHealthy,
      frontend: frontendConfigured
    }
  }
}

// Export singleton instance
export const backendMarketDataService = new BackendMarketDataService()

// Export types
export type { StockQuote, SearchResult }
