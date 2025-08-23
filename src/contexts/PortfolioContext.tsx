import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { portfolioService } from '../lib/portfolioService'
import { 
  Portfolio, 
  Holding, 
  Transaction, 
  CreatePortfolioData, 
  CreateHoldingData, 
  CreateTransactionData,
  PortfolioWithHoldings
} from '../types/portfolio'

interface PortfolioState {
  portfolios: Portfolio[]
  currentPortfolio: PortfolioWithHoldings | null
  loading: boolean
  error: string | null
}

interface PortfolioContextType extends PortfolioState {
  // Portfolio operations
  createPortfolio: (data: CreatePortfolioData) => Promise<Portfolio | null>
  updatePortfolio: (portfolioId: string, updates: Partial<Portfolio>) => Promise<Portfolio | null>
  deletePortfolio: (portfolioId: string) => Promise<boolean>
  selectPortfolio: (portfolioId: string) => Promise<void>
  
  // Holdings operations
  createHolding: (data: CreateHoldingData) => Promise<Holding | null>
  updateHolding: (holdingId: string, updates: Partial<Holding>) => Promise<Holding | null>
  deleteHolding: (holdingId: string) => Promise<boolean>
  
  // Transactions operations
  createTransaction: (data: CreateTransactionData) => Promise<Transaction | null>
  
  // Utility functions
  refreshPortfolios: () => void
  refreshCurrentPortfolio: () => Promise<void>
  clearError: () => void
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

interface PortfolioProviderProps {
  children: ReactNode
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [state, setState] = useState<PortfolioState>({
    portfolios: [],
    currentPortfolio: null,
    loading: false,
    error: null
  })

  const refreshPortfolios = useCallback(() => {
    if (!user) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    portfolioService.getPortfolios(user.id)
      .then(portfolios => {
        setState(prev => ({
          ...prev,
          portfolios,
          loading: false
        }))

        // Select the first portfolio if available and no current portfolio
        if (portfolios.length > 0 && !state.currentPortfolio) {
          return portfolioService.getPortfolioWithMarketPrices(portfolios[0].id)
        }
        return null
      })
      .then(portfolioWithHoldings => {
        if (portfolioWithHoldings) {
          setState(prev => ({
            ...prev,
            currentPortfolio: portfolioWithHoldings
          }))
        }
      })
      .catch(error => {
        console.error('Error refreshing portfolios:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load portfolios'
        }))
      })
  }, [user, state.currentPortfolio])

  // Load portfolios when user changes
  useEffect(() => {
    if (user) {
      refreshPortfolios()
    } else {
      setState({
        portfolios: [],
        currentPortfolio: null,
        loading: false,
        error: null
      })
    }
  }, [user, refreshPortfolios])

  const createPortfolio = async (data: CreatePortfolioData): Promise<Portfolio | null> => {
    if (!user) return null

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const portfolio = await portfolioService.createPortfolio(user.id, data)
      if (portfolio) {
        setState(prev => ({
          ...prev,
          portfolios: [portfolio, ...prev.portfolios],
          loading: false
        }))
        return portfolio
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to create portfolio'
        }))
        return null
      }
    } catch (error) {
      console.error('Error creating portfolio:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to create portfolio'
      }))
      return null
    }
  }

  const updatePortfolio = async (portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const portfolio = await portfolioService.updatePortfolio(portfolioId, updates)
      if (portfolio) {
        setState(prev => ({
          ...prev,
          portfolios: prev.portfolios.map(p => p.id === portfolioId ? portfolio : p),
          currentPortfolio: prev.currentPortfolio?.id === portfolioId 
            ? { ...prev.currentPortfolio, ...portfolio }
            : prev.currentPortfolio,
          loading: false
        }))
      }
      return portfolio
    } catch (error) {
      console.error('Error updating portfolio:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to update portfolio'
      }))
      return null
    }
  }

  const deletePortfolio = async (portfolioId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const success = await portfolioService.deletePortfolio(portfolioId)
      if (success) {
        setState(prev => ({
          ...prev,
          portfolios: prev.portfolios.filter(p => p.id !== portfolioId),
          currentPortfolio: prev.currentPortfolio?.id === portfolioId ? null : prev.currentPortfolio,
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to delete portfolio'
      }))
      return false
    }
  }

  const selectPortfolio = async (portfolioId: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const portfolioWithHoldings = await portfolioService.getPortfolioWithMarketPrices(portfolioId)
      setState(prev => ({
        ...prev,
        currentPortfolio: portfolioWithHoldings,
        loading: false
      }))
    } catch (error) {
      console.error('Error selecting portfolio:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load portfolio'
      }))
    }
  }

  const createHolding = async (data: CreateHoldingData): Promise<Holding | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const holding = await portfolioService.createHolding(data)
      if (holding && state.currentPortfolio) {
        setState(prev => ({
          ...prev,
          currentPortfolio: prev.currentPortfolio ? {
            ...prev.currentPortfolio,
            holdings: [holding, ...prev.currentPortfolio.holdings]
          } : null,
          loading: false
        }))
      }
      return holding
    } catch (error) {
      console.error('Error creating holding:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to create holding'
      }))
      return null
    }
  }

  const updateHolding = async (holdingId: string, updates: Partial<Holding>): Promise<Holding | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const holding = await portfolioService.updateHolding(holdingId, updates)
      if (holding && state.currentPortfolio) {
        setState(prev => ({
          ...prev,
          currentPortfolio: prev.currentPortfolio ? {
            ...prev.currentPortfolio,
            holdings: prev.currentPortfolio.holdings.map(h => h.id === holdingId ? holding : h)
          } : null,
          loading: false
        }))
      }
      return holding
    } catch (error) {
      console.error('Error updating holding:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to update holding'
      }))
      return null
    }
  }

  const deleteHolding = async (holdingId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const success = await portfolioService.deleteHolding(holdingId)
      if (success && state.currentPortfolio) {
        setState(prev => ({
          ...prev,
          currentPortfolio: prev.currentPortfolio ? {
            ...prev.currentPortfolio,
            holdings: prev.currentPortfolio.holdings.filter(h => h.id !== holdingId)
          } : null,
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting holding:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to delete holding'
      }))
      return false
    }
  }

  const createTransaction = async (data: CreateTransactionData): Promise<Transaction | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const transaction = await portfolioService.createTransaction(data)
      
      if (transaction && state.currentPortfolio) {
        // Refresh the current portfolio to get updated holdings with new average prices
        const updatedPortfolio = await portfolioService.getPortfolioWithHoldings(state.currentPortfolio.id)
        if (updatedPortfolio) {
          setState(prev => ({
            ...prev,
            currentPortfolio: updatedPortfolio,
            loading: false
          }))
          console.log('✅ Transaction completed and holdings updated with new average prices')
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
      
      return transaction
    } catch (error) {
      console.error('Error creating transaction:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to create transaction'
      }))
      return null
    }
  }

  const refreshCurrentPortfolio = async (): Promise<void> => {
    if (!state.currentPortfolio) return

    try {
      // First refresh holdings with current market data
      await portfolioService.refreshHoldingsWithMarketData(state.currentPortfolio.id)
      
      // Then get the updated portfolio with market prices
      const updatedPortfolio = await portfolioService.getPortfolioWithMarketPrices(state.currentPortfolio.id)
      if (updatedPortfolio) {
        setState(prev => ({
          ...prev,
          currentPortfolio: updatedPortfolio
        }))
        console.log('✅ Current portfolio holdings refreshed with real market prices and changes')
      }
    } catch (error) {
      console.error('Error refreshing current portfolio:', error)
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  const value: PortfolioContextType = {
    ...state,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    createHolding,
    updateHolding,
    deleteHolding,
    createTransaction,
    refreshPortfolios,
    refreshCurrentPortfolio,
    clearError
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}

// Custom hook to use portfolio context
export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}
