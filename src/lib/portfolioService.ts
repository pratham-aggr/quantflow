import { supabase } from './supabase'
import { Portfolio, Holding, Transaction, CreatePortfolioData, CreateHoldingData, CreateTransactionData, PortfolioWithHoldings } from '../types/portfolio'

const isSupabaseConfigured = process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY && process.env.REACT_APP_SUPABASE_URL !== 'https://placeholder.supabase.co' && process.env.REACT_APP_SUPABASE_ANON_KEY !== 'placeholder-key'

const mockPortfolioService = {
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    return []
  },
  async getPortfolioWithHoldings(portfolioId: string): Promise<PortfolioWithHoldings | null> {
    return null
  },
  async createPortfolio(userId: string, data: CreatePortfolioData): Promise<Portfolio | null> {
    return { id: Date.now().toString(), user_id: userId, name: data.name, cash_balance: data.cash_balance || 10000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio | null> {
    return { id: portfolioId, user_id: '1', name: updates.name || 'Updated', cash_balance: updates.cash_balance || 10000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  async deletePortfolio(): Promise<boolean> { return true },
  async createHolding(data: CreateHoldingData): Promise<Holding | null> {
    return { id: Date.now().toString(), portfolio_id: data.portfolio_id, symbol: data.symbol, quantity: data.quantity, avg_price: data.avg_price, company_name: data.company_name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  async updateHolding(holdingId: string, updates: Partial<Holding>): Promise<Holding | null> {
    return { id: holdingId, portfolio_id: '1', symbol: updates.symbol || 'AAPL', quantity: updates.quantity || 0, avg_price: updates.avg_price || 0, company_name: updates.company_name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  async deleteHolding(): Promise<boolean> { return true },
  async createTransaction(data: CreateTransactionData): Promise<Transaction | null> {
    return { id: Date.now().toString(), portfolio_id: data.portfolio_id, symbol: data.symbol, type: data.type, quantity: data.quantity, price: data.price, date: data.date || new Date().toISOString(), created_at: new Date().toISOString() }
  }
}

export const portfolioService = {
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    if (!isSupabaseConfigured) return mockPortfolioService.getPortfolios(userId)
    const { data, error } = await supabase.from('portfolios').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data || []
  },
  async getPortfolioWithHoldings(portfolioId: string): Promise<PortfolioWithHoldings | null> {
    if (!isSupabaseConfigured) return mockPortfolioService.getPortfolioWithHoldings(portfolioId)
    const { data, error } = await supabase.from('portfolios').select('*, holdings (*)').eq('id', portfolioId).single()
    if (error) { console.error(error); return null }
    return data as unknown as PortfolioWithHoldings
  },
  async createPortfolio(userId: string, data: CreatePortfolioData): Promise<Portfolio | null> {
    console.log('Creating portfolio for user:', userId, 'with data:', data)
    console.log('Supabase configured:', isSupabaseConfigured)
    
    if (!isSupabaseConfigured) {
      console.log('Using mock portfolio service')
      const result = await mockPortfolioService.createPortfolio(userId, data)
      console.log('Mock result:', result)
      return result
    }
    
    console.log('Using Supabase service')
    const { data: portfolio, error } = await supabase.from('portfolios').insert({ user_id: userId, name: data.name, cash_balance: data.cash_balance || 10000 }).select().single()
    if (error) { 
      console.error('Supabase error:', error)
      return null 
    }
    console.log('Supabase result:', portfolio)
    return portfolio
  },
  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio | null> {
    if (!isSupabaseConfigured) return mockPortfolioService.updatePortfolio(portfolioId, updates)
    const { data, error } = await supabase.from('portfolios').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', portfolioId).select().single()
    if (error) { console.error(error); return null }
    return data
  },
  async deletePortfolio(portfolioId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return mockPortfolioService.deletePortfolio()
    const { error } = await supabase.from('portfolios').delete().eq('id', portfolioId)
    if (error) { console.error(error); return false }
    return true
  },
  async createHolding(data: CreateHoldingData): Promise<Holding | null> {
    if (!isSupabaseConfigured) return mockPortfolioService.createHolding(data)
    const { data: holding, error } = await supabase.from('holdings').insert(data).select().single()
    if (error) { console.error(error); return null }
    return holding
  },
  async updateHolding(holdingId: string, updates: Partial<Holding>): Promise<Holding | null> {
    if (!isSupabaseConfigured) return mockPortfolioService.updateHolding(holdingId, updates)
    const { data, error } = await supabase.from('holdings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', holdingId).select().single()
    if (error) { console.error(error); return null }
    return data
  },
  async deleteHolding(holdingId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return mockPortfolioService.deleteHolding()
    const { error } = await supabase.from('holdings').delete().eq('id', holdingId)
    if (error) { console.error(error); return false }
    return true
  },
  async createTransaction(data: CreateTransactionData): Promise<Transaction | null> {
    if (!isSupabaseConfigured) return mockPortfolioService.createTransaction(data)
    const { data: transaction, error } = await supabase.from('transactions').insert({ ...data, date: data.date || new Date().toISOString() }).select().single()
    if (error) { console.error(error); return null }
    return transaction
  }
}
