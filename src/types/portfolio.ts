import { z } from 'zod'

export interface Portfolio {
  id: string
  user_id: string
  name: string
  cash_balance: number
  total_value?: number
  total_pnl?: number
  risk_score?: number
  is_visible?: boolean
  created_at: string
  updated_at?: string
}

export interface Holding {
  id: string
  portfolio_id: string
  symbol: string
  quantity: number
  avg_price: number
  current_price?: number
  change?: number
  changePercent?: number
  company_name?: string
  sector?: string
  created_at: string
  updated_at?: string
}

export interface Transaction {
  id: string
  portfolio_id: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  portfolio_name?: string
  notes?: string
  created_at: string
}

export interface CreatePortfolioData { name: string; cash_balance?: number }
export interface CreateHoldingData { portfolio_id: string; symbol: string; quantity: number; avg_price: number; current_price?: number; change?: number; changePercent?: number; company_name?: string; sector?: string }
export interface CreateTransactionData { portfolio_id: string; symbol: string; type: 'BUY' | 'SELL'; quantity: number; price: number; date?: string }

export interface PortfolioWithHoldings extends Portfolio { holdings: Holding[] }

// Zod Schemas for Validation
export const PortfolioSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1, 'Portfolio name is required').max(100, 'Portfolio name must be less than 100 characters'),
  cash_balance: z.number().min(0, 'Cash balance cannot be negative'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
})

export const CreatePortfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100, 'Portfolio name must be less than 100 characters'),
  cash_balance: z.number().min(0, 'Cash balance cannot be negative').default(10000)
})

export const HoldingSchema = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1, 'Stock symbol is required').max(10, 'Stock symbol must be less than 10 characters').toUpperCase(),
  quantity: z.number().int().positive('Quantity must be positive'),
  avg_price: z.number().positive('Average price must be positive'),
  current_price: z.number().positive().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  company_name: z.string().optional(),
  sector: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
})

export const CreateHoldingSchema = z.object({
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1, 'Stock symbol is required').max(10, 'Stock symbol must be less than 10 characters').toUpperCase(),
  quantity: z.number().int().positive('Quantity must be positive'),
  avg_price: z.number().positive('Average price must be positive'),
  current_price: z.number().positive().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  company_name: z.string().optional(),
  sector: z.string().optional()
})

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1, 'Stock symbol is required').max(10, 'Stock symbol must be less than 10 characters').toUpperCase(),
  type: z.string().refine((val) => val === 'BUY' || val === 'SELL', { message: 'Type must be BUY or SELL' }),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  date: z.string().datetime(),
  created_at: z.string().datetime()
})

export const CreateTransactionSchema = z.object({
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1, 'Stock symbol is required').max(10, 'Stock symbol must be less than 10 characters').toUpperCase(),
  type: z.string().refine((val) => val === 'BUY' || val === 'SELL', { message: 'Type must be BUY or SELL' }),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  date: z.string().datetime().optional()
})

// Type exports from schemas
export type PortfolioInput = z.infer<typeof CreatePortfolioSchema>
export type HoldingInput = z.infer<typeof CreateHoldingSchema>
export type TransactionInput = z.infer<typeof CreateTransactionSchema>
