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
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'http://localhost:5002'
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Risk engine not responding')
      }
      throw error
    }
  }

  async analyzeRebalancing(
    holdings: any[],
    targetAllocation: Record<string, number>,
    constraints?: Record<string, [number, number]>
  ): Promise<RebalancingAnalysis> {
    return performanceMonitor.trackAsync('Rebalancing Analysis', async () => {
      try {
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
      } catch (error) {
        console.warn('Risk engine not available, using fallback rebalancing analysis:', error)
        return this.generateFallbackAnalysis(holdings, targetAllocation)
      }
    })
  }

  async createWhatIfAnalysis(
    holdings: any[],
    suggestions: RebalancingSuggestion[]
  ): Promise<WhatIfAnalysis> {
    return performanceMonitor.trackAsync('What-If Analysis', async () => {
      try {
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
      } catch (error) {
        console.warn('Risk engine not available, using fallback what-if analysis:', error)
        return this.generateFallbackWhatIfAnalysis(holdings, suggestions)
      }
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

  // Fallback methods when risk engine is not available
  private generateFallbackAnalysis(
    holdings: any[],
    targetAllocation: Record<string, number>
  ): RebalancingAnalysis {
    const currentAllocation = this.calculateCurrentAllocation(holdings)
    const driftAnalysis = this.calculateDrift(currentAllocation, targetAllocation)
    const totalDrift = this.calculateTotalDrift(driftAnalysis)
    
    const suggestions: RebalancingSuggestion[] = []
    
    for (const [symbol, drift] of Object.entries(driftAnalysis)) {
      if (Math.abs(drift) > 1) { // Only suggest trades for significant drift
        const holding = holdings.find(h => h.symbol === symbol)
        if (holding) {
          const currentPrice = holding.current_price || holding.avg_price
          const currentValue = holding.quantity * currentPrice
          const targetValue = (targetAllocation[symbol] || 0) / 100 * this.getTotalPortfolioValue(holdings)
          
          const valueDifference = targetValue - currentValue
          const quantityChange = Math.round(valueDifference / currentPrice)
          
          if (Math.abs(quantityChange) > 0) {
            suggestions.push({
              symbol,
              action: quantityChange > 0 ? 'BUY' : 'SELL',
              quantity: Math.abs(quantityChange),
              current_value: currentValue,
              target_value: targetValue,
              drift_percentage: drift,
              estimated_cost: Math.abs(valueDifference) * 0.005, // 0.5% transaction cost
              priority: this.getDriftSeverity(drift) as 'HIGH' | 'MEDIUM' | 'LOW'
            })
          }
        }
      }
    }

    return {
      current_allocation: currentAllocation,
      target_allocation: targetAllocation,
      drift_analysis: driftAnalysis,
      suggestions,
      total_drift: totalDrift,
      estimated_transaction_cost: suggestions.reduce((sum, s) => sum + s.estimated_cost, 0),
      rebalancing_score: Math.min(100, totalDrift * 2),
      optimization_method: 'Fallback Analysis'
    }
  }

  private generateFallbackWhatIfAnalysis(
    holdings: any[],
    suggestions: RebalancingSuggestion[]
  ): WhatIfAnalysis {
    const currentTotalValue = this.getTotalPortfolioValue(holdings)
    const transactionCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0)
    
    // Simulate the impact of rebalancing
    let simulatedValue = currentTotalValue
    for (const suggestion of suggestions) {
      const holding = holdings.find(h => h.symbol === suggestion.symbol)
      if (holding) {
        const currentPrice = holding.current_price || holding.avg_price
        if (suggestion.action === 'BUY') {
          simulatedValue += suggestion.quantity * currentPrice
        } else {
          simulatedValue -= suggestion.quantity * currentPrice
        }
      }
    }

    return {
      current_total_value: currentTotalValue,
      simulated_total_value: simulatedValue,
      transaction_cost: transactionCost,
      net_impact: simulatedValue - currentTotalValue - transactionCost,
      impact_percentage: ((simulatedValue - currentTotalValue) / currentTotalValue) * 100,
      simulated_holdings: holdings.map(holding => {
        const suggestion = suggestions.find(s => s.symbol === holding.symbol)
        let newQuantity = holding.quantity
        if (suggestion) {
          if (suggestion.action === 'BUY') {
            newQuantity += suggestion.quantity
          } else {
            newQuantity -= suggestion.quantity
          }
        }
        return {
          symbol: holding.symbol,
          quantity: Math.max(0, newQuantity),
          current_price: holding.current_price || holding.avg_price,
          value: Math.max(0, newQuantity) * (holding.current_price || holding.avg_price)
        }
      })
    }
  }

  private calculateCurrentAllocation(holdings: any[]): Record<string, number> {
    const totalValue = this.getTotalPortfolioValue(holdings)
    if (totalValue === 0) return {}
    
    const allocation: Record<string, number> = {}
    holdings.forEach(holding => {
      const value = holding.quantity * (holding.current_price || holding.avg_price)
      allocation[holding.symbol] = (value / totalValue) * 100
    })
    
    return allocation
  }

  private getTotalPortfolioValue(holdings: any[]): number {
    return holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0)
  }
}

export const rebalancingService = new RebalancingService()
