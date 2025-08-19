import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { 
  Portfolio, 
  Holding, 
  Transaction, 
  PortfolioWithHoldings,
  PortfolioInput,
  HoldingInput,
  TransactionInput,
  CreatePortfolioSchema,
  CreateHoldingSchema,
  CreateTransactionSchema
} from '../types/portfolio'

// Check if Supabase is configured
const isSupabaseConfigured = Boolean(
  process.env.REACT_APP_SUPABASE_URL && 
  process.env.REACT_APP_SUPABASE_ANON_KEY &&
  process.env.REACT_APP_SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  process.env.REACT_APP_SUPABASE_ANON_KEY !== 'placeholder-key'
)

// API Functions
export const portfolioApi = {
  // Get all portfolios for a user
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching portfolios:', error)
      throw new Error('Failed to fetch portfolios')
    }

    return data || []
  },

  // Get portfolio with holdings
  async getPortfolioWithHoldings(portfolioId: string): Promise<PortfolioWithHoldings | null> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    const { data, error } = await supabase
      .from('portfolios')
      .select('*, holdings (*)')
      .eq('id', portfolioId)
      .single()

    if (error) {
      console.error('Error fetching portfolio with holdings:', error)
      throw new Error('Failed to fetch portfolio')
    }

    return data as PortfolioWithHoldings
  },

  // Create portfolio
  async createPortfolio(userId: string, data: PortfolioInput): Promise<Portfolio> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    // Validate input
    const validatedData = CreatePortfolioSchema.parse(data)

    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .insert({ 
        user_id: userId, 
        name: validatedData.name, 
        cash_balance: validatedData.cash_balance 
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating portfolio:', error)
      throw new Error('Failed to create portfolio')
    }

    return portfolio
  },

  // Update portfolio
  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
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
      throw new Error('Failed to update portfolio')
    }

    return data
  },

  // Delete portfolio
  async deletePortfolio(portfolioId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId)

    if (error) {
      console.error('Error deleting portfolio:', error)
      throw new Error('Failed to delete portfolio')
    }
  },

  // Create holding
  async createHolding(data: HoldingInput): Promise<Holding> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    // Validate input
    const validatedData = CreateHoldingSchema.parse(data)

    const { data: holding, error } = await supabase
      .from('holdings')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Error creating holding:', error)
      throw new Error('Failed to create holding')
    }

    return holding
  },

  // Update holding
  async updateHolding(holdingId: string, updates: Partial<Holding>): Promise<Holding> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
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
      throw new Error('Failed to update holding')
    }

    return data
  },

  // Delete holding
  async deleteHolding(holdingId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId)

    if (error) {
      console.error('Error deleting holding:', error)
      throw new Error('Failed to delete holding')
    }
  },

  // Create transaction
  async createTransaction(data: TransactionInput): Promise<Transaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    // Validate input
    const validatedData = CreateTransactionSchema.parse({
      ...data,
      date: data.date || new Date().toISOString()
    })

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      throw new Error('Failed to create transaction')
    }

    return transaction
  },

  // Get transactions for a portfolio
  async getTransactions(portfolioId: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      throw new Error('Failed to fetch transactions')
    }

    return data || []
  }
}

// React Query Hooks
export const usePortfolios = (userId: string) => {
  return useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => portfolioApi.getPortfolios(userId),
    enabled: !!userId && isSupabaseConfigured
  })
}

export const usePortfolio = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioApi.getPortfolioWithHoldings(portfolioId),
    enabled: !!portfolioId && isSupabaseConfigured
  })
}

export const useTransactions = (portfolioId: string) => {
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: () => portfolioApi.getTransactions(portfolioId),
    enabled: !!portfolioId && isSupabaseConfigured
  })
}

// Mutations
export const useCreatePortfolio = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: PortfolioInput }) => 
      portfolioApi.createPortfolio(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios', userId] })
    }
  })
}

export const useUpdatePortfolio = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ portfolioId, updates }: { portfolioId: string; updates: Partial<Portfolio> }) => 
      portfolioApi.updatePortfolio(portfolioId, updates),
    onSuccess: (updatedPortfolio) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', updatedPortfolio.id] })
    }
  })
}

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: portfolioApi.deletePortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    }
  })
}

export const useCreateHolding = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: portfolioApi.createHolding,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', variables.portfolio_id] })
    }
  })
}

export const useUpdateHolding = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ holdingId, updates }: { holdingId: string; updates: Partial<Holding> }) => 
      portfolioApi.updateHolding(holdingId, updates),
    onSuccess: (updatedHolding) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
    }
  })
}

export const useDeleteHolding = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: portfolioApi.deleteHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
    }
  })
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: portfolioApi.createTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolio_id] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', variables.portfolio_id] })
    }
  })
}
