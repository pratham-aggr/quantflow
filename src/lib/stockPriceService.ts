// Real-time stock price service using Finnhub.io API
// Requires proper API configuration

import { marketDataService } from './marketDataService'

interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  lastUpdated: string
}

export const stockPriceService = {
  // Get current price for a single stock
  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    if (!marketDataService.isConfigured()) {
      throw new Error('Market data service not configured. Please set up your Finnhub API key.')
    }

    try {
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
      return null
    } catch (error) {
      console.error(`Failed to fetch stock price for ${symbol}:`, error)
      throw new Error(`Failed to fetch stock price for ${symbol}`)
    }
  },

  // Get current prices for multiple stocks
  async getStockPrices(symbols: string[]): Promise<Record<string, StockPrice>> {
    if (!marketDataService.isConfigured()) {
      throw new Error('Market data service not configured. Please set up your Finnhub API key.')
    }

    try {
      const quotes = await marketDataService.getMultipleQuotes(symbols)
      const prices: Record<string, StockPrice> = {}
      
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
    } catch (error) {
      console.error('Failed to fetch stock prices:', error)
      throw new Error('Failed to fetch stock prices')
    }
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
