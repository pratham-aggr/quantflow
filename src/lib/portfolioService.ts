import { supabase } from './supabase'
import { Portfolio, Holding, Transaction, CreatePortfolioData, CreateHoldingData, CreateTransactionData, PortfolioWithHoldings } from '../types/portfolio'

const isSupabaseConfigured = process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY && process.env.REACT_APP_SUPABASE_URL !== 'https://placeholder.supabase.co' && process.env.REACT_APP_SUPABASE_ANON_KEY !== 'placeholder-key'

export const portfolioService = {
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
    
    const { data: holding, error } = await supabase
      .from('holdings')
      .insert(data)
      .select()
      .single()
    
    if (error) { 
      console.error('Error creating holding:', error)
      return null 
    }
    
    return holding
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
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({ 
        ...data, 
        date: data.date || new Date().toISOString() 
      })
      .select()
      .single()
    
    if (error) { 
      console.error('Error creating transaction:', error)
      return null 
    }
    
    return transaction
  }
}
