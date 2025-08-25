import { supabase } from './supabase'
import { Portfolio, Holding, Transaction, CreatePortfolioData, CreateHoldingData, CreateTransactionData, PortfolioWithHoldings } from '../types/portfolio'
import { marketDataService } from './marketDataService'

const isSupabaseConfigured = process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY 

export const portfolioService = {
  // Add cleanup method to prevent API calls after logout
  cleanup(): void {
    console.log('🧹 Cleaning up PortfolioService...')
    // This service doesn't maintain state, but we can add any cleanup logic here if needed
    console.log('✅ PortfolioService cleanup completed')
  },

  async getPortfolios(userId: string): Promise<Portfolio[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) { 
      console.error('Error fetching portfolios:', error)
      return [] 
    }
    
    return data || []
  },

  async getPortfolioWithHoldings(portfolioId: string): Promise<PortfolioWithHoldings | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { data, error } = await supabase
      .from('portfolios')
      .select('*, holdings (*)')
      .eq('id', portfolioId)
      .single()
    
    if (error) { 
      console.error('Error fetching portfolio with holdings:', error)
      return null 
    }
    
    return data as unknown as PortfolioWithHoldings
  },

  async createPortfolio(userId: string, data: CreatePortfolioData): Promise<Portfolio | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    console.log('Creating portfolio for user:', userId, 'with data:', data)
    
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .insert({ 
        user_id: userId, 
        name: data.name, 
        cash_balance: data.cash_balance || 10000 
      })
      .select()
      .single()
    
    if (error) { 
      console.error('Error creating portfolio:', error)
      return null 
    }
    
    console.log('Portfolio created:', portfolio)
    return portfolio
  },

  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { data, error } = await supabase
      .from('portfolios')
      .update({ 
        ...updates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', portfolioId)
      .select()
      .single()
    
    if (error) { 
      console.error('Error updating portfolio:', error)
      return null 
    }
    
    return data
  },

  async deletePortfolio(portfolioId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId)
    
    if (error) { 
      console.error('Error deleting portfolio:', error)
      return false 
    }
    
    return true
  },

  async createHolding(data: CreateHoldingData): Promise<Holding | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    console.log('🚀 Starting createHolding for:', data.symbol)
    
    try {
      // Create the holding
      console.log('📝 Creating holding in database...')
      const { data: holding, error: holdingError } = await supabase
        .from('holdings')
        .insert(data)
        .select()
        .single()
      
      if (holdingError) { 
        console.error('❌ Error creating holding:', holdingError)
        return null 
      }
      
      console.log('✅ Holding created successfully:', holding)

      // Create a corresponding BUY transaction
      console.log('💳 Creating BUY transaction...')
      const transactionData: CreateTransactionData = {
        portfolio_id: data.portfolio_id,
        symbol: data.symbol,
        type: 'BUY',
        quantity: data.quantity,
        price: data.avg_price,
        date: new Date().toISOString()
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      if (transactionError) {
        console.error('❌ Error creating transaction for holding:', transactionError)
        // Don't fail the holding creation if transaction fails
        console.warn('⚠️ Holding created but transaction failed')
      } else {
        console.log('✅ Transaction created successfully')
      }

      // Immediately fetch current market data for the new holding
      console.log(`📈 Fetching current market data for ${data.symbol}...`)
      console.log('🔍 Checking if marketDataService is available:', !!marketDataService)
      
      try {
        const quote = await marketDataService.getStockQuote(data.symbol)
        console.log('📊 Quote received:', quote)
        
        if (quote) {
          console.log(`✅ Got market data for ${data.symbol}: $${quote.price} (${quote.change >= 0 ? '+' : ''}$${quote.change}, ${quote.change >= 0 ? '+' : ''}${quote.changePercent}%)`)
          
          // Update the holding with current market data
          console.log('🔄 Updating holding with market data...')
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', holding.id)
          
          if (updateError) {
            console.error(`❌ Error updating ${data.symbol} with market data:`, updateError)
          } else {
            console.log(`✅ Updated ${data.symbol} with current market data`)
            // Return the updated holding with market data
            const updatedHolding = {
              ...holding,
              current_price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent
            }
            console.log('🎉 Returning updated holding:', updatedHolding)
            return updatedHolding
          }
        } else {
          console.warn(`⚠️ No market data available for ${data.symbol}`)
        }
      } catch (marketDataError) {
        console.error(`❌ Error fetching market data for ${data.symbol}:`, marketDataError)
        console.error('Market data error details:', marketDataError)
        // Don't fail the holding creation if market data fails
      }
      
      console.log('🏁 Returning original holding (no market data update)')
      return holding
    } catch (error) {
      console.error('❌ Error in createHolding:', error)
      return null
    }
  },

  async updateHolding(holdingId: string, updates: Partial<Holding>): Promise<Holding | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { data, error } = await supabase
      .from('holdings')
      .update({ 
        ...updates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', holdingId)
      .select()
      .single()
    
    if (error) { 
      console.error('Error updating holding:', error)
      return null 
    }
    
    return data
  },

  async deleteHolding(holdingId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId)
    
    if (error) { 
      console.error('Error deleting holding:', error)
      return false 
    }
    
    return true
  },

  async createTransaction(data: CreateTransactionData): Promise<Transaction | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    try {
      // Start a transaction to ensure data consistency
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({ 
          ...data, 
          date: data.date || new Date().toISOString() 
        })
        .select()
        .single()
      
      if (transactionError) { 
        console.error('Error creating transaction:', transactionError)
        return null 
      }

      // Update the holding based on the transaction
      await this.updateHoldingFromTransaction(data)
      
      return transaction
    } catch (error) {
      console.error('Error in createTransaction:', error)
      return null
    }
  },

  // Update holding average price and quantity based on transaction
  async updateHoldingFromTransaction(transactionData: CreateTransactionData): Promise<void> {
    try {
      // Find existing holding for this symbol in the portfolio
      const { data: existingHolding, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', transactionData.portfolio_id)
        .eq('symbol', transactionData.symbol)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing holding:', fetchError)
        return
      }

      const isBuy = transactionData.type === 'BUY'
      const isSell = transactionData.type === 'SELL'
      const transactionQuantity = transactionData.quantity
      const transactionPrice = transactionData.price
      const totalTransactionValue = transactionQuantity * transactionPrice

      if (existingHolding) {
        // Update existing holding
        const currentQuantity = existingHolding.quantity
        const currentAvgPrice = existingHolding.avg_price
        const currentTotalValue = currentQuantity * currentAvgPrice

        let newQuantity: number
        let newAvgPrice: number

        if (isBuy) {
          // For buy transactions: weighted average price
          newQuantity = currentQuantity + transactionQuantity
          newAvgPrice = (currentTotalValue + totalTransactionValue) / newQuantity
        } else if (isSell) {
          // For sell transactions: reduce quantity, keep same average price
          newQuantity = currentQuantity - transactionQuantity
          if (newQuantity <= 0) {
            // If selling all shares, delete the holding
            await this.deleteHolding(existingHolding.id)
            return
          }
          newAvgPrice = currentAvgPrice // Average price doesn't change on sell
        } else {
          console.error('Invalid transaction type:', transactionData.type)
          return
        }

        // Update the holding
        const { error: updateError } = await supabase
          .from('holdings')
          .update({
            quantity: newQuantity,
            avg_price: newAvgPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingHolding.id)

        if (updateError) {
          console.error('Error updating holding:', updateError)
        } else {
          console.log(`Updated holding ${transactionData.symbol}: quantity=${newQuantity}, avg_price=${newAvgPrice}`)
        }
      } else if (isBuy) {
        // Create new holding for buy transaction
        const { error: createError } = await supabase
          .from('holdings')
          .insert({
            portfolio_id: transactionData.portfolio_id,
            symbol: transactionData.symbol,
            quantity: transactionQuantity,
            avg_price: transactionPrice,
            company_name: transactionData.symbol // Default company name
          })

        if (createError) {
          console.error('Error creating new holding:', createError)
        } else {
          console.log(`Created new holding ${transactionData.symbol}: quantity=${transactionQuantity}, avg_price=${transactionPrice}`)
        }
      } else if (isSell) {
        console.warn(`Attempted to sell ${transactionData.symbol} but no holding exists`)
      }
    } catch (error) {
      console.error('Error updating holding from transaction:', error)
    }
  },

  // Update holdings with current market prices
  async updateHoldingsWithMarketPrices(holdings: Holding[]): Promise<Holding[]> {
    const updatedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        try {
          // Use intelligent caching - don't force refresh unless data is stale
          const quote = await marketDataService.getStockQuote(holding.symbol, false)
          if (quote) {
            return {
              ...holding,
              current_price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch price for ${holding.symbol}:`, error)
        }
        return holding
      })
    )
    
    return updatedHoldings
  },

  // Get portfolio with real-time market prices
  async getPortfolioWithMarketPrices(portfolioId: string): Promise<PortfolioWithHoldings | null> {
    const portfolio = await this.getPortfolioWithHoldings(portfolioId)
    if (!portfolio) return null

    // Update holdings with current market prices
    const updatedHoldings = await this.updateHoldingsWithMarketPrices(portfolio.holdings)
    
    return {
      ...portfolio,
      holdings: updatedHoldings
    }
  },

  // Get transactions for a portfolio
  async getTransactions(portfolioId: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })
    
    if (error) { 
      console.error('Error fetching transactions:', error)
      return [] 
    }
    
    return data || []
  },

  // Refresh all holdings with current market data
  async refreshHoldingsWithMarketData(portfolioId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials.')
    }
    
    try {
      // Get current holdings
      const portfolio = await this.getPortfolioWithHoldings(portfolioId)
      if (!portfolio) return false

      // Update each holding with current market data
      for (const holding of portfolio.holdings) {
        try {
          // Use intelligent caching - force refresh for database updates
          const quote = await marketDataService.getStockQuote(holding.symbol, true)
          if (quote) {
            // Update the holding with current market data
            await this.updateHolding(holding.id, {
              current_price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent
            })
            console.log(`✅ Updated ${holding.symbol} with current market data: $${quote.price} (${quote.change >= 0 ? '+' : ''}$${quote.change}, ${quote.change >= 0 ? '+' : ''}${quote.changePercent}%)`)
          }
        } catch (error) {
          console.warn(`Failed to update ${holding.symbol}:`, error)
        }
      }
      
      return true
    } catch (error) {
      console.error('Error refreshing holdings with market data:', error)
      return false
    }
  }
}
