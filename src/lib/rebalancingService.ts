import { performanceMonitor } from './performance'

export interface RebalancingTarget {
  symbol: string
  target_allocation: number // Percentage (0-100)
  min_allocation?: number
  max_allocation?: number
}

export interface RebalancingSuggestion {
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  current_value: number
  target_value: number
  drift_percentage: number
  estimated_cost: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface RebalancingAnalysis {
  current_allocation: Record<string, number>
  target_allocation: Record<string, number>
  drift_analysis: Record<string, number>
  suggestions: RebalancingSuggestion[]
  total_drift: number
  estimated_transaction_cost: number
  rebalancing_score: number
  optimization_method: string
}

export interface WhatIfAnalysis {
  current_total_value: number
  simulated_total_value: number
  transaction_cost: number
  net_impact: number
  impact_percentage: number
  simulated_holdings: Array<{
    symbol: string
    quantity: number
    current_price: number
    value: number
  }>
}

export interface OptimizationResult {
  optimized_allocation: Record<string, number>
  original_target: Record<string, number>
}

class RebalancingService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'http://localhost:5001'
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async analyzeRebalancing(
    holdings: any[],
    targetAllocation: Record<string, number>,
    constraints?: Record<string, [number, number]>
  ): Promise<RebalancingAnalysis> {
    return performanceMonitor.trackAsync('Rebalancing Analysis', async () => {
      const data = {
        holdings: holdings.map(holding => ({
          symbol: holding.symbol,
          quantity: holding.quantity,
          avg_price: holding.avg_price,
          current_price: holding.current_price || holding.avg_price
        })),
        target_allocation: targetAllocation,
        constraints
      }

      return this.makeRequest<RebalancingAnalysis>('/api/rebalancing/analyze', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    })
  }

  async createWhatIfAnalysis(
    holdings: any[],
    suggestions: RebalancingSuggestion[]
  ): Promise<WhatIfAnalysis> {
    return performanceMonitor.trackAsync('What-If Analysis', async () => {
      const data = {
        holdings: holdings.map(holding => ({
          symbol: holding.symbol,
          quantity: holding.quantity,
          avg_price: holding.avg_price,
          current_price: holding.current_price || holding.avg_price
        })),
        suggestions
      }

      return this.makeRequest<WhatIfAnalysis>('/api/rebalancing/what-if', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    })
  }

  async optimizePortfolio(
    holdings: any[],
    targetAllocation: Record<string, number>,
    constraints?: Record<string, [number, number]>
  ): Promise<OptimizationResult> {
    return performanceMonitor.trackAsync('Portfolio Optimization', async () => {
      const data = {
        holdings: holdings.map(holding => ({
          symbol: holding.symbol,
          quantity: holding.quantity,
          avg_price: holding.avg_price,
          current_price: holding.current_price || holding.avg_price
        })),
        target_allocation: targetAllocation,
        constraints
      }

      return this.makeRequest<OptimizationResult>('/api/rebalancing/optimize', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    })
  }

  // Helper methods for target allocation management
  createEqualWeightTarget(holdings: any[]): Record<string, number> {
    if (!holdings.length) return {}
    
    const equalWeight = 100 / holdings.length
    const target: Record<string, number> = {}
    
    holdings.forEach(holding => {
      target[holding.symbol] = equalWeight
    })
    
    return target
  }

  createMarketCapWeightTarget(holdings: any[]): Record<string, number> {
    if (!holdings.length) return {}
    
    // This is a simplified market cap weighting
    // In a real implementation, you'd fetch actual market cap data
    const totalValue = holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0)
    
    const target: Record<string, number> = {}
    
    holdings.forEach(holding => {
      const value = holding.quantity * (holding.current_price || holding.avg_price)
      target[holding.symbol] = (value / totalValue) * 100
    })
    
    return target
  }

  validateTargetAllocation(targetAllocation: Record<string, number>): {
    isValid: boolean
    total: number
    errors: string[]
  } {
    const errors: string[] = []
    const total = Object.values(targetAllocation).reduce((sum, value) => sum + value, 0)
    
    if (Math.abs(total - 100) > 0.01) {
      errors.push(`Target allocation must sum to 100%. Current total: ${total.toFixed(2)}%`)
    }
    
    for (const [symbol, allocation] of Object.entries(targetAllocation)) {
      if (allocation < 0) {
        errors.push(`${symbol}: Allocation cannot be negative (${allocation}%)`)
      }
      if (allocation > 100) {
        errors.push(`${symbol}: Allocation cannot exceed 100% (${allocation}%)`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      total,
      errors
    }
  }

  // Calculate drift without making API calls
  calculateDrift(
    currentAllocation: Record<string, number>,
    targetAllocation: Record<string, number>
  ): Record<string, number> {
    const drift: Record<string, number> = {}
    
    const allSymbols = Array.from(new Set([
      ...Object.keys(currentAllocation),
      ...Object.keys(targetAllocation)
    ]))
    
    for (const symbol of allSymbols) {
      const current = currentAllocation[symbol] || 0
      const target = targetAllocation[symbol] || 0
      drift[symbol] = current - target
    }
    
    return drift
  }

  calculateTotalDrift(driftAnalysis: Record<string, number>): number {
    return Object.values(driftAnalysis).reduce((sum, drift) => sum + Math.abs(drift), 0)
  }

  getDriftSeverity(driftPercentage: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const absDrift = Math.abs(driftPercentage)
    if (absDrift <= 2) return 'LOW'
    if (absDrift <= 5) return 'MEDIUM'
    return 'HIGH'
  }

  formatRebalancingInstructions(suggestions: RebalancingSuggestion[]): string[] {
    return suggestions.map(suggestion => {
      const action = suggestion.action === 'BUY' ? 'Buy' : 'Sell'
      const cost = suggestion.estimated_cost > 0 ? ` (Est. cost: $${suggestion.estimated_cost.toFixed(2)})` : ''
      return `${action} ${suggestion.quantity} shares of ${suggestion.symbol}${cost}`
    })
  }
}

export const rebalancingService = new RebalancingService()
