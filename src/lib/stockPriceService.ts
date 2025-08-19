// Real-time stock price service using Finnhub.io API
// Falls back to mock data if API key is not configured

import { marketDataService } from './marketDataService'

interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  lastUpdated: string
}

// Mock stock prices for fallback when API is not available
const MOCK_STOCK_PRICES: Record<string, StockPrice> = {
  'AAPL': {
    symbol: 'AAPL',
    price: 175.43,
    change: 2.15,
    changePercent: 1.24,
    lastUpdated: new Date().toISOString()
  },
  'GOOGL': {
    symbol: 'GOOGL',
    price: 2850.12,
    change: -15.30,
    changePercent: -0.53,
    lastUpdated: new Date().toISOString()
  },
  'MSFT': {
    symbol: 'MSFT',
    price: 415.67,
    change: 8.92,
    changePercent: 2.19,
    lastUpdated: new Date().toISOString()
  },
  'AMZN': {
    symbol: 'AMZN',
    price: 3450.89,
    change: 45.67,
    changePercent: 1.34,
    lastUpdated: new Date().toISOString()
  },
  'TSLA': {
    symbol: 'TSLA',
    price: 850.23,
    change: -12.45,
    changePercent: -1.44,
    lastUpdated: new Date().toISOString()
  },
  'META': {
    symbol: 'META',
    price: 320.45,
    change: 5.67,
    changePercent: 1.80,
    lastUpdated: new Date().toISOString()
  },
  'NVDA': {
    symbol: 'NVDA',
    price: 890.12,
    change: 23.45,
    changePercent: 2.71,
    lastUpdated: new Date().toISOString()
  },
  'NFLX': {
    symbol: 'NFLX',
    price: 450.78,
    change: -8.90,
    changePercent: -1.94,
    lastUpdated: new Date().toISOString()
  },
  'JPM': {
    symbol: 'JPM',
    price: 145.67,
    change: 1.23,
    changePercent: 0.85,
    lastUpdated: new Date().toISOString()
  },
  'JNJ': {
    symbol: 'JNJ',
    price: 165.34,
    change: -0.45,
    changePercent: -0.27,
    lastUpdated: new Date().toISOString()
  }
}

export const stockPriceService = {
  // Get current price for a single stock
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // Try to get real-time data from Finnhub
      if (marketDataService.isConfigured()) {
        const quote = await marketDataService.getStockQuote(symbol)
        if (quote) {
          return {
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date(quote.timestamp * 1000).toISOString()
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch real-time price for ${symbol}, using mock data:`, error)
    }

    // Fallback to mock data
    const upperSymbol = symbol.toUpperCase()
    return MOCK_STOCK_PRICES[upperSymbol] || null
  },

  // Get current prices for multiple stocks
  async getStockPrices(symbols: string[]): Promise<Record<string, StockPrice>> {
    const prices: Record<string, StockPrice> = {}
    
    try {
      // Try to get real-time data from Finnhub
      if (marketDataService.isConfigured()) {
        const quotes = await marketDataService.getMultipleQuotes(symbols)
        
        Object.entries(quotes).forEach(([symbol, quote]) => {
          prices[symbol] = {
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date(quote.timestamp * 1000).toISOString()
          }
        })
        
        return prices
      }
    } catch (error) {
      console.warn('Failed to fetch real-time prices, using mock data:', error)
    }

    // Fallback to mock data
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase()
      if (MOCK_STOCK_PRICES[upperSymbol]) {
        prices[upperSymbol] = MOCK_STOCK_PRICES[upperSymbol]
      }
    }
    
    return prices
  },

  // Calculate portfolio value with current prices
  async calculatePortfolioValue(holdings: Array<{ symbol: string; quantity: number; avg_price: number }>): Promise<{
    totalValue: number
    totalCost: number
    totalGainLoss: number
    totalGainLossPercent: number
    holdingsWithPrices: Array<{
      symbol: string
      quantity: number
      avgPrice: number
      currentPrice: number
      currentValue: number
      costBasis: number
      gainLoss: number
      gainLossPercent: number
    }>
  }> {
    const symbols = holdings.map(h => h.symbol)
    const prices = await this.getStockPrices(symbols)
    
    let totalValue = 0
    let totalCost = 0
    
    const holdingsWithPrices = holdings.map(holding => {
      const currentPrice = prices[holding.symbol]?.price || holding.avg_price
      const currentValue = holding.quantity * currentPrice
      const costBasis = holding.quantity * holding.avg_price
      const gainLoss = currentValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      
      totalValue += currentValue
      totalCost += costBasis
      
      return {
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgPrice: holding.avg_price,
        currentPrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent
      }
    })
    
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0
    
    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdingsWithPrices
    }
  }
}

export type { StockPrice }
