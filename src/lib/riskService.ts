// Risk Assessment Service
// Communicates with the Python Flask risk engine

export interface RiskMetrics {
  volatility: number
  beta: number
  correlation: number
  r_squared: number
  sharpe_ratio: number
  max_drawdown: number
  concentration_risk: number
  diversification_score: number
  var_95: number
  var_99: number
}

export interface RiskScore {
  score: number
  level: string
  description: string
  components: {
    volatility_score: number
    beta_score: number
    sharpe_score: number
    concentration_score: number
    var_score: number
  }
}

export interface RiskAlert {
  type: string
  severity: 'info' | 'warning' | 'error'
  message: string
  current_value?: number
  threshold?: number
  symbol?: string
}

export interface PortfolioRiskAnalysis {
  portfolio_metrics: RiskMetrics
  risk_score: RiskScore
  risk_tolerance: string
  alerts: RiskAlert[]
  holdings_count: number
  total_value: number
}

export interface Holding {
  symbol: string
  quantity: number
  avg_price: number
  company_name?: string
}

export interface VaRRequest {
  holdings: Holding[]
  confidence_level?: number
  time_horizon?: number
}

export interface BetaRequest {
  holdings: Holding[]
  benchmark?: string
}

export interface RiskRequest {
  holdings: Holding[]
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
}

class RiskService {
  private baseUrl: string
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes default cache

  constructor() {
    // Use environment variable or default to local development
    this.baseUrl = process.env.REACT_APP_RISK_ENGINE_URL || 'http://localhost:5002'
  }

  private getCacheKey(endpoint: string, data?: any): string {
    return `${endpoint}:${data ? JSON.stringify(data) : ''}`
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    
    const now = Date.now()
    return (now - cached.timestamp) < cached.ttl
  }

  private getCachedData<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)?.data as T
    }
    this.cache.delete(key)
    return null
  }

  private setCacheData(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTTL
    })
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`Risk engine error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      console.error('Risk service error:', error)
      throw error
    }
  }

  async getHealth(): Promise<{ status: string; service: string; version: string }> {
    const cacheKey = this.getCacheKey('/health')
    const cached = this.getCachedData<{ status: string; service: string; version: string }>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<{ status: string; service: string; version: string }>('/health')
    this.setCacheData(cacheKey, data, 60 * 1000) // 1 minute cache for health
    return data
  }

  async calculatePortfolioRisk(request: RiskRequest): Promise<PortfolioRiskAnalysis> {
    const cacheKey = this.getCacheKey('/api/risk/portfolio', request)
    const cached = this.getCachedData<PortfolioRiskAnalysis>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<PortfolioRiskAnalysis>('/api/risk/portfolio', {
      method: 'POST',
      body: JSON.stringify({
        holdings: request.holdings,
        risk_tolerance: request.risk_tolerance || 'moderate',
      }),
    })
    
    this.setCacheData(cacheKey, data, 2 * 60 * 1000) // 2 minutes cache for portfolio risk
    return data
  }

  async calculateHoldingRisk(symbol: string): Promise<any> {
    const cacheKey = this.getCacheKey(`/api/risk/holding/${symbol}`)
    const cached = this.getCachedData<any>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<any>(`/api/risk/holding/${symbol}`)
    this.setCacheData(cacheKey, data, 10 * 60 * 1000) // 10 minutes cache for individual stocks
    return data
  }

  async calculateVaR(request: VaRRequest): Promise<any> {
    const cacheKey = this.getCacheKey('/api/risk/var', request)
    const cached = this.getCachedData<any>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<any>('/api/risk/var', {
      method: 'POST',
      body: JSON.stringify({
        holdings: request.holdings,
        confidence_level: request.confidence_level || 0.95,
        time_horizon: request.time_horizon || 1,
      }),
    })
    
    this.setCacheData(cacheKey, data, 5 * 60 * 1000) // 5 minutes cache for VaR
    return data
  }

  async calculateBeta(request: BetaRequest): Promise<any> {
    const cacheKey = this.getCacheKey('/api/risk/beta', request)
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest('/api/risk/beta', {
      method: 'POST',
      body: JSON.stringify({
        holdings: request.holdings,
        benchmark: request.benchmark || '^GSPC',
      }),
    })
    
    this.setCacheData(cacheKey, data, 5 * 60 * 1000) // 5 minutes cache for beta
    return data
  }

  async calculateRiskScore(request: RiskRequest): Promise<RiskScore> {
    const cacheKey = this.getCacheKey('/api/risk/score', request)
    const cached = this.getCachedData<RiskScore>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<RiskScore>('/api/risk/score', {
      method: 'POST',
      body: JSON.stringify({
        holdings: request.holdings,
        risk_tolerance: request.risk_tolerance || 'moderate',
      }),
    })
    
    this.setCacheData(cacheKey, data, 2 * 60 * 1000) // 2 minutes cache for risk score
    return data
  }

  async checkRiskAlerts(request: RiskRequest): Promise<RiskAlert[]> {
    const cacheKey = this.getCacheKey('/api/risk/alerts', request)
    const cached = this.getCachedData<RiskAlert[]>(cacheKey)
    if (cached) return cached

    const data = await this.makeRequest<RiskAlert[]>('/api/risk/alerts', {
      method: 'POST',
      body: JSON.stringify({
        holdings: request.holdings,
        risk_tolerance: request.risk_tolerance || 'moderate',
      }),
    })
    
    this.setCacheData(cacheKey, data, 1 * 60 * 1000) // 1 minute cache for alerts
    return data
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Clear specific cache entries
  clearCacheForPattern(pattern: string): void {
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  // Helper method to convert portfolio holdings to risk engine format
  convertHoldingsToRiskFormat(holdings: any[]): Holding[] {
    return holdings.map(holding => ({
      symbol: holding.symbol,
      quantity: holding.quantity,
      avg_price: holding.avg_price,
      company_name: holding.company_name,
    }))
  }

  // Get risk level color for UI
  getRiskLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'very low':
        return 'text-green-600 bg-green-50'
      case 'low':
        return 'text-green-700 bg-green-100'
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'very high':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  // Get alert severity color for UI
  getAlertSeverityColor(severity: string): string {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Format risk metrics for display
  formatRiskMetrics(metrics: RiskMetrics): Record<string, string> {
    return {
      volatility: `${metrics.volatility.toFixed(1)}%`,
      beta: metrics.beta.toFixed(2),
      correlation: metrics.correlation.toFixed(2),
      r_squared: `${(metrics.r_squared * 100).toFixed(1)}%`,
      sharpe_ratio: metrics.sharpe_ratio.toFixed(2),
      max_drawdown: `${metrics.max_drawdown.toFixed(1)}%`,
      concentration_risk: `${metrics.concentration_risk.toFixed(1)}%`,
      diversification_score: `${(metrics.diversification_score * 100).toFixed(0)}%`,
      var_95: `${metrics.var_95.toFixed(1)}%`,
      var_99: `${metrics.var_99.toFixed(1)}%`,
    }
  }
}

// Export singleton instance
export const riskService = new RiskService()
