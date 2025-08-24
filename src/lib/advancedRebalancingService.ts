import { performanceMonitor } from './performance'

// Types for advanced rebalancing
export interface TaxSettings {
  shortTermRate: number
  longTermRate: number
  stateTaxRate: number
  washSaleDays: number
  minLossThreshold: number
}

export interface RebalancingSettings {
  minDriftThreshold: number
  minTransactionSize: number
  maxTransactionCost: number
  rebalancingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  taxOptimization: boolean
  cashReserve: number
  toleranceBands?: Record<string, number>
}

export interface TaxLossOpportunity {
  symbol: string
  sharesToSell: number
  currentPrice: number
  costBasis: number
  unrealizedLoss: number
  taxSavings: number
  replacementSymbol?: string
  replacementShares?: number
  washSaleRisk: boolean
  holdingPeriod: number
}

export interface RebalancingRecommendation {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  shares: number
  currentPrice: number
  targetValue: number
  currentValue: number
  drift: number
  priority: 1 | 2 | 3
  costEstimate: number
  taxImpact: number
  executionTiming: 'immediate' | 'end_of_day' | 'next_session'
  reasoning: string
}

export interface ExecutionPlan {
  executionPhases: {
    immediate: {
      trades: number
      recommendations: RebalancingRecommendation[]
    }
    end_of_day: {
      trades: number
      recommendations: RebalancingRecommendation[]
    }
    next_session: {
      trades: number
      recommendations: RebalancingRecommendation[]
    }
  }
  totalCosts: number
  totalTaxImpact: number
  netBenefit: number
  executionOrder: string[]
}

export interface RebalancingAnalysis {
  rebalancingNeeded: boolean
  maxDrift: number
  totalDrift: number
  driftAnalysis: Record<string, {
    currentWeight: number
    targetWeight: number
    drift: number
    tolerance: number
    exceedsThreshold: boolean
    driftValue: number
  }>
  significantDrifts: number
  timeBasedTrigger: boolean
  thresholdTrigger: boolean
  nextScheduledRebalance: string
}

export interface SmartRebalancingPlan {
  rebalancingNeeded: boolean
  analysis: RebalancingAnalysis
  recommendations: RebalancingRecommendation[]
  executionPlan: ExecutionPlan
  summary: {
    totalTransactions: number
    estimatedCosts: number
    taxImpact: number
    netBenefit: number
  }
  optimizationNotes: string[]
}

export interface PaperOrder {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'
  quantity: number
  price?: number
  stopPrice?: number
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED'
  createdAt: string
  filledAt?: string
  filledPrice?: number
  filledQuantity: number
  commission: number
  portfolioId: string
}

export interface PaperPosition {
  symbol: string
  quantity: number
  avgPrice: number
  marketValue: number
  unrealizedPnl: number
  realizedPnl: number
}

export interface PaperPortfolioSummary {
  portfolioId: string
  name: string
  cash: number
  totalValue: number
  totalUnrealizedPnl: number
  totalRealizedPnl: number
  positions: Array<{
    symbol: string
    quantity: number
    avgPrice: number
    currentPrice: number
    marketValue: number
    unrealizedPnl: number
    unrealizedPnlPct: number
  }>
  pendingOrders: Array<{
    id: string
    symbol: string
    side: string
    type: string
    quantity: number
    price?: number
    createdAt: string
  }>
  recentExecutions: Array<{
    symbol: string
    side: string
    quantity: number
    price: number
    timestamp: string
  }>
}

export interface PaperTradingResult {
  success: boolean
  ordersPlaced: Array<{
    orderId: string
    symbol: string
    action: string
    quantity: number
    status: string
    type?: string
    price?: number
  }>
  errors: Array<{
    symbol: string
    error: string
  }>
  summary: PaperPortfolioSummary
}

class AdvancedRebalancingService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || ''
  }

  private checkBaseUrl(): void {
    if (!this.baseUrl) {
      throw new Error('Risk engine URL not configured. Please set REACT_APP_RISK_ENGINE_URL environment variable.')
    }
  }

  // Tax-Loss Harvesting Methods
  async analyzeTaxLossHarvesting(
    holdings: any[],
    transactions: any[],
    taxSettings?: Partial<TaxSettings>
  ): Promise<TaxLossOpportunity[]> {
    return performanceMonitor.trackAsync('tax-loss-analysis', async () => {
      this.checkBaseUrl()
      const response = await fetch(`${this.baseUrl}/api/tax-loss-harvesting/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings,
          transactions,
          tax_settings: taxSettings
        }),
      })

      if (!response.ok) {
        throw new Error(`Tax loss analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.opportunities || []
    })
  }

  async optimizeTaxHarvesting(
    opportunities: TaxLossOpportunity[],
    maxTransactions: number = 10,
    portfolioConstraints?: Record<string, any>
  ): Promise<TaxLossOpportunity[]> {
    return performanceMonitor.trackAsync('tax-harvesting-optimization', async () => {
      const response = await fetch(`${this.baseUrl}/api/tax-loss-harvesting/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunities,
          max_transactions: maxTransactions,
          portfolio_constraints: portfolioConstraints
        }),
      })

      if (!response.ok) {
        throw new Error(`Tax harvesting optimization failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.selected_opportunities || []
    })
  }

  async generateTaxHarvestingPlan(
    selectedOpportunities: TaxLossOpportunity[]
  ): Promise<any> {
    return performanceMonitor.trackAsync('tax-harvesting-plan', async () => {
      const response = await fetch(`${this.baseUrl}/api/tax-loss-harvesting/execution-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_opportunities: selectedOpportunities
        }),
      })

      if (!response.ok) {
        throw new Error(`Tax harvesting plan generation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async estimateAnnualTaxBenefit(
    portfolioValue: number,
    expectedVolatility: number = 0.15
  ): Promise<any> {
    return performanceMonitor.trackAsync('annual-tax-benefit', async () => {
      const response = await fetch(`${this.baseUrl}/api/tax-loss-harvesting/annual-benefit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_value: portfolioValue,
          expected_volatility: expectedVolatility
        }),
      })

      if (!response.ok) {
        throw new Error(`Annual tax benefit estimation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  // Advanced Rebalancing Methods
  async analyzeRebalancingNeed(
    currentAllocation: Record<string, number>,
    targetAllocation: Record<string, number>,
    portfolioValue: number,
    lastRebalanceDate?: string,
    settings?: Partial<RebalancingSettings>
  ): Promise<RebalancingAnalysis> {
    return performanceMonitor.trackAsync('rebalancing-need-analysis', async () => {
      const response = await fetch(`${this.baseUrl}/api/advanced-rebalancing/analyze-need`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_allocation: currentAllocation,
          target_allocation: targetAllocation,
          portfolio_value: portfolioValue,
          last_rebalance_date: lastRebalanceDate,
          settings
        }),
      })

      if (!response.ok) {
        throw new Error(`Rebalancing need analysis failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async generateSmartRebalancingPlan(
    holdings: any[],
    targetAllocation: Record<string, number>,
    transactions?: any[],
    marketConditions?: Record<string, any>,
    settings?: Partial<RebalancingSettings>
  ): Promise<SmartRebalancingPlan> {
    return performanceMonitor.trackAsync('smart-rebalancing-plan', async () => {
      const response = await fetch(`${this.baseUrl}/api/advanced-rebalancing/smart-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings,
          target_allocation: targetAllocation,
          transactions,
          market_conditions: marketConditions,
          settings
        }),
      })

      if (!response.ok) {
        throw new Error(`Smart rebalancing plan failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async simulateRebalancingScenarios(
    holdings: any[],
    targetAllocation: Record<string, number>,
    scenarios: Array<{
      name: string
      settings: Partial<RebalancingSettings>
    }>
  ): Promise<any> {
    return performanceMonitor.trackAsync('rebalancing-scenarios', async () => {
      const response = await fetch(`${this.baseUrl}/api/advanced-rebalancing/simulate-scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings,
          target_allocation: targetAllocation,
          scenarios
        }),
      })

      if (!response.ok) {
        throw new Error(`Rebalancing scenario simulation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  // Paper Trading Methods
  async createPaperPortfolio(name: string, initialCash: number = 100000): Promise<any> {
    return performanceMonitor.trackAsync('create-paper-portfolio', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/create-portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          initial_cash: initialCash
        }),
      })

      if (!response.ok) {
        throw new Error(`Paper portfolio creation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async placePaperOrder(
    portfolioId: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' = 'MARKET',
    price?: number,
    stopPrice?: number
  ): Promise<PaperOrder> {
    return performanceMonitor.trackAsync('place-paper-order', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/place-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          symbol,
          side,
          quantity,
          order_type: orderType,
          price,
          stop_price: stopPrice
        }),
      })

      if (!response.ok) {
        throw new Error(`Paper order placement failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async getPaperPortfolioSummary(portfolioId: string): Promise<PaperPortfolioSummary> {
    return performanceMonitor.trackAsync('paper-portfolio-summary', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/portfolio/${portfolioId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Paper portfolio summary failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async executePaperRebalancing(
    portfolioId: string,
    rebalancingPlan: SmartRebalancingPlan
  ): Promise<PaperTradingResult> {
    return performanceMonitor.trackAsync('execute-paper-rebalancing', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/execute-rebalancing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          rebalancing_plan: rebalancingPlan
        }),
      })

      if (!response.ok) {
        throw new Error(`Paper rebalancing execution failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async cancelPaperOrder(portfolioId: string, orderId: string): Promise<any> {
    return performanceMonitor.trackAsync('cancel-paper-order', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/cancel-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          order_id: orderId
        }),
      })

      if (!response.ok) {
        throw new Error(`Paper order cancellation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  async simulateMarketMovement(volatilityFactor: number = 1.0): Promise<any> {
    return performanceMonitor.trackAsync('simulate-market-movement', async () => {
      const response = await fetch(`${this.baseUrl}/api/paper-trading/simulate-market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volatility_factor: volatilityFactor
        }),
      })

      if (!response.ok) {
        throw new Error(`Market simulation failed: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  // Utility Methods
  calculateDrift(currentAllocation: Record<string, number>, targetAllocation: Record<string, number>): Record<string, number> {
    const drift: Record<string, number> = {}
    
    for (const symbol in targetAllocation) {
      const current = currentAllocation[symbol] || 0
      const target = targetAllocation[symbol]
      drift[symbol] = Math.abs(current - target)
    }
    
    return drift
  }

  getTotalDrift(drift: Record<string, number>): number {
    return Object.values(drift).reduce((sum, value) => sum + value, 0)
  }

  getMaxDrift(drift: Record<string, number>): number {
    return Math.max(...Object.values(drift))
  }

  formatRebalancingInstructions(recommendations: RebalancingRecommendation[]): string[] {
    return recommendations.map(rec => {
      const action = rec.action
      const shares = Math.abs(rec.shares).toFixed(0)
      const symbol = rec.symbol
      const reasoning = rec.reasoning ? ` (${rec.reasoning})` : ''
      
      return `${action} ${shares} shares of ${symbol}${reasoning}`
    })
  }

  estimateExecutionCosts(recommendations: RebalancingRecommendation[]): number {
    return recommendations.reduce((total, rec) => total + rec.costEstimate, 0)
  }

  estimateTaxImpact(recommendations: RebalancingRecommendation[]): number {
    return recommendations.reduce((total, rec) => total + rec.taxImpact, 0)
  }

  prioritizeRecommendations(recommendations: RebalancingRecommendation[]): RebalancingRecommendation[] {
    return [...recommendations].sort((a, b) => {
      // Sort by priority first (1 = highest), then by drift magnitude
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return Math.abs(b.drift) - Math.abs(a.drift)
    })
  }
}

export const advancedRebalancingService = new AdvancedRebalancingService()

// Helper functions
export const createDefaultTaxSettings = (): TaxSettings => ({
  shortTermRate: 0.37,
  longTermRate: 0.20,
  stateTaxRate: 0.0,
  washSaleDays: 30,
  minLossThreshold: 100.0
})

export const createDefaultRebalancingSettings = (): RebalancingSettings => ({
  minDriftThreshold: 0.05,
  minTransactionSize: 100.0,
  maxTransactionCost: 10.0,
  rebalancingFrequency: 'monthly',
  taxOptimization: true,
  cashReserve: 0.02
})

export const createConservativeRebalancingSettings = (): RebalancingSettings => ({
  minDriftThreshold: 0.10,
  minTransactionSize: 500.0,
  maxTransactionCost: 25.0,
  rebalancingFrequency: 'quarterly',
  taxOptimization: true,
  cashReserve: 0.05
})

export const createAggressiveRebalancingSettings = (): RebalancingSettings => ({
  minDriftThreshold: 0.02,
  minTransactionSize: 50.0,
  maxTransactionCost: 5.0,
  rebalancingFrequency: 'weekly',
  taxOptimization: true,
  cashReserve: 0.01
})
