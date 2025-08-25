import { Portfolio, Holding, PortfolioWithHoldings } from '../types/portfolio'
import { marketDataService } from './marketDataService'

// Rate limiting for demo portfolio refreshes
let lastRefreshTime = 0
const MIN_REFRESH_INTERVAL = 5000 // 5 seconds minimum between refreshes

// Cache for demo portfolio data to avoid repeated API calls
let demoPortfolioCache: PortfolioWithHoldings | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30 seconds cache

// Cache for individual stock quotes to avoid repeated API calls
const stockQuoteCache = new Map<string, { data: any, timestamp: number }>()
const STOCK_CACHE_DURATION = 60000 // 1 minute cache for stock quotes

// Demo portfolio data with popular stocks
const DEMO_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', quantity: 50 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', quantity: 30 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', quantity: 25 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', quantity: 40 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', quantity: 60 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', quantity: 35 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', quantity: 45 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', quantity: 55 }
]

export const demoPortfolioService = {
  // Get cached stock quote or fetch from API
  async getStockQuoteWithCache(symbol: string): Promise<any> {
    const now = Date.now()
    const cached = stockQuoteCache.get(symbol)
    
    if (cached && (now - cached.timestamp) < STOCK_CACHE_DURATION) {
      console.log(`📦 Using cached quote for ${symbol}`)
      return cached.data
    }

    try {
      console.log(`📊 Fetching fresh quote for ${symbol}`)
      const quote = await marketDataService.getStockQuote(symbol)
      
      if (quote) {
        stockQuoteCache.set(symbol, { data: quote, timestamp: now })
      }
      
      return quote
    } catch (error) {
      console.warn(`Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  },

  // Create a demo portfolio with holdings
  async createDemoPortfolio(): Promise<PortfolioWithHoldings> {
    // Check cache first
    const now = Date.now()
    if (demoPortfolioCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Returning cached demo portfolio')
      return demoPortfolioCache
    }

    console.log('🚀 Creating new demo portfolio with real market data...')
    
    const demoPortfolio: Portfolio = {
      id: 'demo-portfolio',
      user_id: 'demo-user',
      name: 'Demo Portfolio',
      cash_balance: 25000,
      total_value: 0,
      total_pnl: 0,
      risk_score: 7.2,
      is_visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Create holdings with real market data
    const holdings: Holding[] = []
    let totalValue = demoPortfolio.cash_balance
    let totalPnl = 0

    // Fetch market data for all stocks (with caching)
    const marketDataPromises = DEMO_STOCKS.map(async (stock) => {
      const quote = await this.getStockQuoteWithCache(stock.symbol)
      return { stock, quote }
    })

    const results = await Promise.all(marketDataPromises)
    console.log('📊 Market data processed for all stocks')

    for (const { stock, quote } of results) {
      if (quote?.price) {
        // Use real current price from API
        const currentPrice = quote.price
        const change = quote.change || 0
        const changePercent = quote.changePercent || 0
        
        // Simulate realistic purchase price (85% to 115% of current)
        const purchasePriceVariation = 0.85 + (Math.random() * 0.3)
        const avgPrice = currentPrice * purchasePriceVariation
        
        const holding: Holding = {
          id: `demo-${stock.symbol}`,
          portfolio_id: demoPortfolio.id,
          symbol: stock.symbol,
          quantity: stock.quantity,
          avg_price: avgPrice,
          current_price: currentPrice,
          change: change,
          changePercent: changePercent,
          company_name: stock.name,
          sector: stock.sector,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        holdings.push(holding)
        
        // Calculate portfolio totals
        const holdingValue = currentPrice * stock.quantity
        const holdingPnl = (currentPrice - avgPrice) * stock.quantity
        totalValue += holdingValue
        totalPnl += holdingPnl

      } else {
        // Skip stocks with no market data
        console.warn(`Skipping ${stock.symbol} - no market data available`)
      }
    }

    // Update portfolio with calculated totals
    const updatedPortfolio: PortfolioWithHoldings = {
      ...demoPortfolio,
      total_value: totalValue,
      total_pnl: totalPnl,
      holdings: holdings
    }

    // Cache the result
    demoPortfolioCache = updatedPortfolio
    cacheTimestamp = now

    console.log('✅ Demo portfolio created with real market data')
    return updatedPortfolio
  },

  // Refresh demo portfolio with latest market data
  async refreshDemoPortfolio(portfolio: PortfolioWithHoldings): Promise<PortfolioWithHoldings> {
    // Rate limiting to prevent too many API calls
    const now = Date.now()
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log('🔄 Demo portfolio refresh rate limited, returning current data')
      return portfolio
    }
    lastRefreshTime = now

    console.log('🔄 Refreshing demo portfolio with real market data...')

    const updatedHoldings: Holding[] = []
    let totalValue = portfolio.cash_balance
    let totalPnl = 0

    // Fetch fresh market data for all holdings (with caching)
    const marketDataPromises = portfolio.holdings.map(async (holding) => {
      const quote = await this.getStockQuoteWithCache(holding.symbol)
      return { holding, quote }
    })

    const results = await Promise.all(marketDataPromises)

    for (const { holding, quote } of results) {
      if (quote?.price) {
        const currentPrice = quote.price
        const change = quote.change || 0
        const changePercent = quote.changePercent || 0
        
        const updatedHolding: Holding = {
          ...holding,
          current_price: currentPrice,
          change: change,
          changePercent: changePercent,
          updated_at: new Date().toISOString()
        }

        updatedHoldings.push(updatedHolding)
        
        const holdingValue = currentPrice * holding.quantity
        const holdingPnl = (currentPrice - holding.avg_price) * holding.quantity
        totalValue += holdingValue
        totalPnl += holdingPnl

      } else {
        // Keep existing data if no new quote available
        updatedHoldings.push(holding)
        totalValue += (holding.current_price || holding.avg_price) * holding.quantity
        totalPnl += ((holding.current_price || holding.avg_price) - holding.avg_price) * holding.quantity
      }
    }

    const updatedPortfolio = {
      ...portfolio,
      total_value: totalValue,
      total_pnl: totalPnl,
      holdings: updatedHoldings,
      updated_at: new Date().toISOString()
    }

    // Update cache
    demoPortfolioCache = updatedPortfolio
    cacheTimestamp = now

    console.log('✅ Demo portfolio refreshed with real market data')
    return updatedPortfolio
  },

  // Clear all caches
  clearCache(): void {
    demoPortfolioCache = null
    stockQuoteCache.clear()
    cacheTimestamp = 0
    console.log('🗑️ All demo portfolio caches cleared')
  }
}
