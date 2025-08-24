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
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'https://quantflow-production.up.railway.app'
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
      // Use fallback analysis immediately since risk engine is not available
      console.log('Using real portfolio data for rebalancing analysis')
      return this.generateFallbackAnalysis(holdings, targetAllocation)
    })
  }

  async createWhatIfAnalysis(
    holdings: any[],
    suggestions: RebalancingSuggestion[]
  ): Promise<WhatIfAnalysis> {
    return performanceMonitor.trackAsync('What-If Analysis', async () => {
      // Use fallback what-if analysis immediately since risk engine is not available
      console.log('Using real portfolio data for what-if analysis')
      return this.generateFallbackWhatIfAnalysis(holdings, suggestions)
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

  // Fallback methods when risk engine is not available - uses real portfolio data
  private generateFallbackAnalysis(
    holdings: any[],
    targetAllocation: Record<string, number>
  ): RebalancingAnalysis {
    if (!holdings || holdings.length === 0) {
      throw new Error('No portfolio holdings available for rebalancing analysis')
    }

    const currentAllocation = this.calculateCurrentAllocation(holdings)
    const driftAnalysis = this.calculateDrift(currentAllocation, targetAllocation)
    const totalDrift = this.calculateTotalDrift(driftAnalysis)
    
    const suggestions: RebalancingSuggestion[] = []
    const totalPortfolioValue = this.getTotalPortfolioValue(holdings)
    
    for (const [symbol, drift] of Object.entries(driftAnalysis)) {
      if (Math.abs(drift) > 0.5) { // Suggest trades for drift > 0.5%
        const holding = holdings.find(h => h.symbol === symbol)
        if (holding) {
          const currentPrice = holding.current_price || holding.avg_price
          if (!currentPrice || currentPrice <= 0) {
            console.warn(`Skipping ${symbol}: Invalid current price ${currentPrice}`)
            continue
          }

          const currentValue = holding.quantity * currentPrice
          const targetValue = (targetAllocation[symbol] || 0) / 100 * totalPortfolioValue
          
          const valueDifference = targetValue - currentValue
          const quantityChange = Math.round(valueDifference / currentPrice)
          
          // Only suggest trades if the change is significant (at least 1 share or $100)
          if (Math.abs(quantityChange) >= 1 || Math.abs(valueDifference) >= 100) {
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

    // Sort suggestions by priority (HIGH first, then by drift magnitude)
    suggestions.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0
      if (aPriority !== bPriority) return bPriority - aPriority
      return Math.abs(b.drift_percentage) - Math.abs(a.drift_percentage)
    })

    return {
      current_allocation: currentAllocation,
      target_allocation: targetAllocation,
      drift_analysis: driftAnalysis,
      suggestions,
      total_drift: totalDrift,
      estimated_transaction_cost: suggestions.reduce((sum, s) => sum + s.estimated_cost, 0),
      rebalancing_score: Math.min(100, totalDrift * 2),
      optimization_method: 'Portfolio Analysis'
    }
  }

  private generateFallbackWhatIfAnalysis(
    holdings: any[],
    suggestions: RebalancingSuggestion[]
  ): WhatIfAnalysis {
    if (!holdings || holdings.length === 0) {
      throw new Error('No portfolio holdings available for what-if analysis')
    }

    const currentTotalValue = this.getTotalPortfolioValue(holdings)
    const transactionCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0)
    
    // Simulate the impact of rebalancing using real portfolio data
    let simulatedValue = currentTotalValue
    const simulatedHoldings = holdings.map(holding => {
      const suggestion = suggestions.find(s => s.symbol === holding.symbol)
      let newQuantity = holding.quantity
      
      if (suggestion) {
        const currentPrice = holding.current_price || holding.avg_price
        if (!currentPrice || currentPrice <= 0) {
          console.warn(`Skipping ${holding.symbol}: Invalid current price ${currentPrice}`)
          return {
            symbol: holding.symbol,
            quantity: holding.quantity,
            current_price: currentPrice,
            value: holding.quantity * currentPrice
          }
        }

        if (suggestion.action === 'BUY') {
          newQuantity += suggestion.quantity
          simulatedValue += suggestion.quantity * currentPrice
        } else {
          newQuantity -= suggestion.quantity
          simulatedValue -= suggestion.quantity * currentPrice
        }
      }
      
      const finalQuantity = Math.max(0, newQuantity)
      const currentPrice = holding.current_price || holding.avg_price
      
      return {
        symbol: holding.symbol,
        quantity: finalQuantity,
        current_price: currentPrice,
        value: finalQuantity * currentPrice
      }
    })

    const netImpact = simulatedValue - currentTotalValue - transactionCost
    const impactPercentage = currentTotalValue > 0 ? ((simulatedValue - currentTotalValue) / currentTotalValue) * 100 : 0

    return {
      current_total_value: currentTotalValue,
      simulated_total_value: simulatedValue,
      transaction_cost: transactionCost,
      net_impact: netImpact,
      impact_percentage: impactPercentage,
      simulated_holdings: simulatedHoldings
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
