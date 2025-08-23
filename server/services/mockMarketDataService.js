// Mock Market Data Service for testing when Finnhub API is not available

// Mock stock data with realistic prices and daily changes
const MOCK_STOCK_DATA = {
  'AAPL': { price: 175.43, change: 2.15, changePercent: 1.24 },
  'GOOGL': { price: 142.56, change: -1.23, changePercent: -0.85 },
  'MSFT': { price: 378.85, change: 3.42, changePercent: 0.91 },
  'AMZN': { price: 145.24, change: 1.87, changePercent: 1.30 },
  'TSLA': { price: 248.50, change: -5.20, changePercent: -2.05 },
  'META': { price: 312.67, change: 4.33, changePercent: 1.40 },
  'NVDA': { price: 456.78, change: 12.45, changePercent: 2.80 },
  'NFLX': { price: 485.09, change: -8.76, changePercent: -1.77 },
  'JPM': { price: 156.78, change: 0.45, changePercent: 0.29 },
  'JNJ': { price: 167.89, change: -1.23, changePercent: -0.73 },
  'V': { price: 234.56, change: 2.34, changePercent: 1.01 },
  'PG': { price: 145.67, change: 0.78, changePercent: 0.54 },
  'UNH': { price: 523.45, change: -3.21, changePercent: -0.61 },
  'HD': { price: 312.34, change: 1.56, changePercent: 0.50 },
  'MA': { price: 378.90, change: 2.89, changePercent: 0.77 },
  'DIS': { price: 89.45, change: -2.34, changePercent: -2.55 },
  'PYPL': { price: 67.89, change: 1.23, changePercent: 1.85 },
  'BAC': { price: 34.56, change: -0.45, changePercent: -1.29 },
  'ADBE': { price: 456.78, change: 8.90, changePercent: 1.99 },
  'CRM': { price: 234.56, change: 3.45, changePercent: 1.49 }
}

// Popular stocks list
const POPULAR_STOCKS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JPM', 'JNJ',
  'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'ADBE', 'CRM'
]

class MockMarketDataService {
  constructor() {
    console.log('🔄 Mock Market Data Service initialized - using simulated stock data')
  }

  // Check if service is configured (always true for mock)
  isConfigured() {
    return true
  }

  // Get stock quote (matches real service interface)
  async getStockQuote(symbol) {
    const upperSymbol = symbol.toUpperCase()
    
    if (!MOCK_STOCK_DATA[upperSymbol]) {
      throw new Error(`No data available for symbol: ${symbol}`)
    }

    const data = MOCK_STOCK_DATA[upperSymbol]
    
    // Add some realistic variation to make it feel more dynamic
    const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
    const adjustedPrice = data.price * (1 + variation)
    const adjustedChange = data.change * (1 + variation)
    const adjustedChangePercent = data.changePercent * (1 + variation)

    return {
      symbol: upperSymbol,
      price: parseFloat(adjustedPrice.toFixed(2)),
      change: parseFloat(adjustedChange.toFixed(2)),
      changePercent: parseFloat(adjustedChangePercent.toFixed(2)),
      previousClose: parseFloat((adjustedPrice - adjustedChange).toFixed(2)),
      open: parseFloat((adjustedPrice - adjustedChange * 0.3).toFixed(2)),
      high: parseFloat((adjustedPrice + Math.abs(adjustedChange) * 0.5).toFixed(2)),
      low: parseFloat((adjustedPrice - Math.abs(adjustedChange) * 0.5).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      timestamp: new Date().toISOString()
    }
  }

  // Get multiple quotes (matches real service interface)
  async getMultipleQuotes(symbols) {
    const quotes = []
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getStockQuote(symbol)
        quotes.push(quote)
      } catch (error) {
        console.warn(`Failed to get quote for ${symbol}:`, error.message)
      }
    }
    
    return quotes
  }

  // Get popular stocks (matches real service interface)
  async getPopularStocks() {
    return await this.getMultipleQuotes(POPULAR_STOCKS)
  }

  // Search stocks
  async searchStocks(query) {
    const results = []
    const upperQuery = query.toUpperCase()
    
    for (const [symbol, data] of Object.entries(MOCK_STOCK_DATA)) {
      if (symbol.includes(upperQuery)) {
        results.push({
          symbol,
          name: `${symbol} Corporation`,
          exchange: 'NASDAQ',
          type: 'Common Stock'
        })
      }
    }
    
    return results.slice(0, 10) // Limit to 10 results
  }

  // Get company profile
  async getCompanyProfile(symbol) {
    const upperSymbol = symbol.toUpperCase()
    
    if (!MOCK_STOCK_DATA[upperSymbol]) {
      throw new Error(`No profile available for symbol: ${symbol}`)
    }

    return {
      symbol: upperSymbol,
      name: `${upperSymbol} Corporation`,
      exchange: 'NASDAQ',
      industry: 'Technology',
      sector: 'Technology',
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      employees: Math.floor(Math.random() * 100000) + 1000,
      website: `https://www.${upperSymbol.toLowerCase()}.com`,
      description: `${upperSymbol} is a leading technology company focused on innovation and growth.`,
      ceo: 'John Doe',
      founded: 1980 + Math.floor(Math.random() * 40),
      country: 'United States',
      currency: 'USD'
    }
  }

  // Get cache stats (mock)
  async getCacheStats() {
    return {
      totalEntries: Object.keys(MOCK_STOCK_DATA).length,
      popularStocksCached: true,
      lastUpdated: new Date().toISOString()
    }
  }

  // Update popular stocks cache (no-op for mock)
  async updatePopularStocksCache() {
    console.log('📈 Mock: Popular stocks cache updated')
    return true
  }
}

export const mockMarketDataService = new MockMarketDataService()
