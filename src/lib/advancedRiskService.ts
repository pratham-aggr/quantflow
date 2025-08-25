import { performanceMonitor } from './performance'

interface AdvancedRiskRequest {
  holdings: any[]
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
  time_horizon?: number
  include_monte_carlo?: boolean
  include_correlation?: boolean
  include_sector_analysis?: boolean
  include_ml_prediction?: boolean
}

interface MonteCarloAnalysis {
  mean_return: number
  std_return: number
  percentiles: Record<string, number>
  worst_case: number
  best_case: number
  probability_positive: number
  confidence_intervals: Record<string, [number, number]>
}

interface CorrelationAnalysis {
  diversification_score: number
  high_correlation_pairs: Array<[string, string, number]>
  heatmap_data: {
    correlation_matrix: number[][]
    symbols: string[]
    high_correlation_pairs: Array<[string, string, number]>
    diversification_score: number
  }
}

interface SectorAnalysis {
  sector_allocation: Record<string, number>
  sector_risk: Record<string, number>
  concentration_risk: number
  recommendations: string[]
}

interface MLPrediction {
  predicted_volatility: number
  confidence_interval: [number, number]
  feature_importance: Record<string, number>
  model_accuracy: number
  prediction_horizon: number
}

interface AdvancedRiskReport {
  summary: {
    risk_score: number
    risk_level: string
    portfolio_volatility: number
    sharpe_ratio: number
    var_95: number
  }
  monte_carlo_analysis?: MonteCarloAnalysis
  correlation_analysis?: CorrelationAnalysis
  sector_analysis?: SectorAnalysis
  ml_prediction?: MLPrediction
  recommendations: string[]
  risk_tolerance: string
  timestamp: string
}

class AdvancedRiskService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.REACT_APP_BACKEND_API_URL || ''
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('Backend API URL not configured. Please set REACT_APP_BACKEND_API_URL environment variable.')
    }

    const startTime = performance.now()
    
    // Increase timeout for risk analysis endpoints
    const isRiskEndpoint = endpoint.includes('/api/risk/')
    const timeout = isRiskEndpoint ? 30000 : 10000 // 30 seconds for risk analysis, 10 seconds for others
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      console.log(`Making request to ${endpoint} with ${timeout/1000}s timeout`)
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const duration = performance.now() - startTime
      console.log(`Request to ${endpoint} completed in ${duration.toFixed(2)}ms`)
      
      performanceMonitor.trackAsync(`advanced_risk_${endpoint}`, async () => Promise.resolve(data))
      return data
    } catch (error) {
      const duration = performance.now() - startTime
      console.error(`Request to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout/1000} seconds. The risk analysis is taking longer than expected.`)
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to the risk analysis service. Please check your connection.')
        }
      }
      
      performanceMonitor.trackAsync(`advanced_risk_${endpoint}_error`, async () => Promise.reject(error))
      throw error
    }
  }

  async generateAdvancedRiskReport(request: AdvancedRiskRequest): Promise<AdvancedRiskReport> {
    try {
      console.log('Sending advanced risk report request:', request)
      const data = await this.makeRequest<AdvancedRiskReport>('/api/risk/advanced', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      console.log('Received advanced risk report response:', data)
      return data
    } catch (error) {
      console.error('Error generating advanced risk report:', error)
      throw error
    }
  }

  async runMonteCarloSimulation(holdings: any[], timeHorizon: number = 252): Promise<MonteCarloAnalysis> {
    try {
      const data = await this.makeRequest<MonteCarloAnalysis>('/api/risk/monte-carlo', {
        method: 'POST',
        body: JSON.stringify({ holdings, time_horizon: timeHorizon }),
      })
      return data
    } catch (error) {
      console.error('Error running Monte Carlo simulation:', error)
      throw error
    }
  }

  async calculateCorrelationMatrix(holdings: any[]): Promise<CorrelationAnalysis> {
    try {
      const data = await this.makeRequest<CorrelationAnalysis>('/api/risk/correlation', {
        method: 'POST',
        body: JSON.stringify({ holdings }),
      })
      return data
    } catch (error) {
      console.error('Error calculating correlation matrix:', error)
      throw error
    }
  }

  async analyzeSectorAllocation(holdings: any[]): Promise<SectorAnalysis> {
    try {
      const data = await this.makeRequest<SectorAnalysis>('/api/risk/sector-analysis', {
        method: 'POST',
        body: JSON.stringify({ holdings }),
      })
      return data
    } catch (error) {
      console.error('Error analyzing sector allocation:', error)
      throw error
    }
  }

  async predictVolatilityML(holdings: any[]): Promise<MLPrediction> {
    try {
      const data = await this.makeRequest<MLPrediction>('/api/risk/ml-prediction', {
        method: 'POST',
        body: JSON.stringify({ holdings }),
      })
      return data
    } catch (error) {
      console.error('Error predicting volatility with ML:', error)
      throw error
    }
  }

  async trainMLModel(trainingData: any[]): Promise<{ success: boolean; message: string }> {
    try {
      const data = await this.makeRequest<{ success: boolean; message: string }>('/api/risk/train-ml', {
        method: 'POST',
        body: JSON.stringify({ training_data: trainingData }),
      })
      return data
    } catch (error) {
      console.error('Error training ML model:', error)
      throw error
    }
  }

  // Helper methods for frontend calculations
  calculateRiskLevel(riskScore: number): string {
    if (riskScore <= 2) return 'Very Low'
    if (riskScore <= 4) return 'Low'
    if (riskScore <= 6) return 'Moderate'
    if (riskScore <= 8) return 'High'
    return 'Very High'
  }

  getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'Very Low': return 'text-green-600 bg-green-50'
      case 'Low': return 'text-green-500 bg-green-50'
      case 'Moderate': return 'text-yellow-600 bg-yellow-50'
      case 'High': return 'text-orange-600 bg-orange-50'
      case 'Very High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  formatPercentage(value: number): string {
    if (isNaN(value) || !isFinite(value)) {
      return 'N/A'
    }
    return `${(value * 100).toFixed(2)}%`
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Generate risk insights from analysis
  generateRiskInsights(report: AdvancedRiskReport): string[] {
    const insights: string[] = []

    // Risk level insights
    if (report.summary.risk_score > 7) {
      insights.push('⚠️ High risk portfolio detected - consider defensive positions')
    } else if (report.summary.risk_score < 3) {
      insights.push('🛡️ Conservative portfolio - may be missing growth opportunities')
    }

    // Volatility insights
    if (report.summary.portfolio_volatility > 0.25) {
      insights.push('📈 High volatility - consider diversification')
    }

    // Sharpe ratio insights
    if (report.summary.sharpe_ratio < 0.5) {
      insights.push('📊 Low risk-adjusted returns - review asset allocation')
    }

    // Monte Carlo insights
    if (report.monte_carlo_analysis) {
      if (report.monte_carlo_analysis.probability_positive < 0.6) {
        insights.push('🎲 Low probability of positive returns - consider rebalancing')
      }
      if (report.monte_carlo_analysis.std_return > 0.25) {
        insights.push('📊 High expected volatility - add defensive assets')
      }
    }

    // Correlation insights
    if (report.correlation_analysis) {
      if (report.correlation_analysis.diversification_score < 0.5) {
        insights.push('🔗 Low diversification - add uncorrelated assets')
      }
      if (report.correlation_analysis.high_correlation_pairs.length > 0) {
        insights.push(`🔗 ${report.correlation_analysis.high_correlation_pairs.length} highly correlated pairs detected`)
      }
    }

    // Sector insights
    if (report.sector_analysis) {
      if (report.sector_analysis.concentration_risk > 0.4) {
        insights.push('🏢 High sector concentration - consider sector diversification')
      }
      if (report.sector_analysis.recommendations.length > 0) {
        insights.push(...report.sector_analysis.recommendations)
      }
    }

    return insights
  }

  // Calculate portfolio stress test scenarios
  calculateStressTests(holdings: any[]): Record<string, number> {
    const totalValue = holdings.reduce((sum, holding) => 
      sum + (holding.quantity * holding.avg_price), 0
    )

    return {
      'Market Crash (-20%)': totalValue * 0.8,
      'Recession (-10%)': totalValue * 0.9,
      'Correction (-5%)': totalValue * 0.95,
      'Volatility (+15%)': totalValue * 1.15,
      'Bull Market (+25%)': totalValue * 1.25,
    }
  }

  // Generate risk tolerance recommendations
  generateRiskToleranceRecommendations(
    currentRiskScore: number,
    targetRiskTolerance: string
  ): string[] {
    const recommendations: string[] = []

    const riskLevels = {
      conservative: { min: 1, max: 3 },
      moderate: { min: 3, max: 6 },
      aggressive: { min: 6, max: 10 }
    }

    const target = riskLevels[targetRiskTolerance as keyof typeof riskLevels]

    if (currentRiskScore < target.min) {
      recommendations.push('Consider adding growth-oriented assets')
      recommendations.push('Review defensive position allocations')
    } else if (currentRiskScore > target.max) {
      recommendations.push('Consider reducing high-risk positions')
      recommendations.push('Add defensive assets (bonds, utilities)')
    } else {
      recommendations.push('Portfolio aligns well with risk tolerance')
    }

    return recommendations
  }
}

export const advancedRiskService = new AdvancedRiskService()
export type {
  AdvancedRiskRequest,
  MonteCarloAnalysis,
  CorrelationAnalysis,
  SectorAnalysis,
  MLPrediction,
  AdvancedRiskReport
}
