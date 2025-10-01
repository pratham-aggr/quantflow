import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  BarChart3,
  PieChart,
  Brain,
  Zap,
  RefreshCw,
  Download,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Target,
  Activity,
  Layers,
  Network
} from 'lucide-react'
import { advancedRiskService, AdvancedRiskReport, MonteCarloAnalysis, CorrelationAnalysis, SectorAnalysis, MLPrediction } from '../lib/advancedRiskService'
import { useToast } from './Toast'
import { VolatilityComparisonChart } from './dashboard/VolatilityComparisonChart'
import MonteCarloChart from './dashboard/MonteCarloChart'
import SectorAnalysisPieChart from './dashboard/SectorAnalysisPieChart'

interface AdvancedRiskDashboardProps {
  holdings: any[]
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive'
  autoRefresh?: boolean
  refreshInterval?: number
}

type AnalysisType = 'monte_carlo' | 'ml_prediction' | 'diversification'
type ViewMode = 'summary' | 'detailed' | 'full'

export const AdvancedRiskDashboard: React.FC<AdvancedRiskDashboardProps> = ({
  holdings,
  riskTolerance = 'moderate',
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}) => {
  const [riskReport, setRiskReport] = useState<AdvancedRiskReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType>('monte_carlo')
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const { success, error: showError } = useToast()

  // Fallback risk analysis function
  const generateFallbackRiskReport = (holdings: any[], riskTolerance: string): AdvancedRiskReport => {
    console.log('Generating fallback risk report...')
    
    // Calculate basic metrics
    const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * (h.current_price || h.avg_price)), 0)
    const totalCost = holdings.reduce((sum, h) => sum + (h.quantity * h.avg_price), 0)
    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
    
    // Simple risk score based on P&L and number of holdings
    const riskScore = Math.min(10, Math.max(1, 
      5 + (totalPnLPercent / 10) + (holdings.length > 5 ? -1 : 1)
    ))
    
    return {
      summary: {
        risk_score: riskScore,
        risk_level: riskScore <= 3 ? 'Low' : riskScore <= 7 ? 'Moderate' : 'High',
        portfolio_volatility: Math.abs(totalPnLPercent) / 100,
        sharpe_ratio: totalPnLPercent > 0 ? totalPnLPercent / 10 : totalPnLPercent / 20,
        var_95: Math.abs(totalPnLPercent) * 0.05
      },
      monte_carlo_analysis: {
        mean_return: totalPnLPercent / 100,
        std_return: Math.abs(totalPnLPercent) / 200,
        percentiles: { '5': totalPnLPercent * 0.5, '95': totalPnLPercent * 1.5 },
        worst_case: totalPnLPercent * 0.5,
        best_case: totalPnLPercent * 1.5,
        probability_positive: totalPnLPercent > 0 ? 0.6 : 0.4,
        confidence_intervals: { '5': [totalPnLPercent * 0.5, totalPnLPercent * 0.6], '95': [totalPnLPercent * 1.4, totalPnLPercent * 1.5] }
      },
      correlation_analysis: {
        diversification_score: Math.min(1, holdings.length / 10),
        high_correlation_pairs: [],
        heatmap_data: { 
          correlation_matrix: [], 
          symbols: holdings.map(h => h.symbol),
          high_correlation_pairs: [],
          diversification_score: Math.min(1, holdings.length / 10)
        }
      },
      sector_analysis: {
        sector_allocation: {},
        sector_risk: {},
        concentration_risk: holdings.length > 0 ? 100 / holdings.length : 100,
        recommendations: ['Consider diversifying across more sectors']
      },
      ml_prediction: {
        predicted_volatility: Math.abs(totalPnLPercent) / 100,
        confidence_interval: [totalPnLPercent * 0.8, totalPnLPercent * 1.2],
        feature_importance: {},
        model_accuracy: 0.5,
        prediction_horizon: 30
      },
      recommendations: [
        'Basic analysis mode - advanced features unavailable',
        totalPnLPercent > 0 ? 'Portfolio showing positive returns' : 'Portfolio showing negative returns',
        holdings.length < 5 ? 'Consider adding more holdings for better diversification' : 'Good number of holdings',
        'Try refreshing for advanced analysis when service is available'
      ],
      risk_tolerance: riskTolerance,
      timestamp: new Date().toISOString()
    }
  }

  // Generate risk report
  const generateRiskReport = async () => {
    if (!holdings || holdings.length === 0) {
      setError('No holdings available for risk analysis')
      return
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      return
    }

    // Check retry limit
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts reached. Advanced engine unavailable.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Starting advanced risk analysis...')
      const report = await advancedRiskService.generateAdvancedRiskReport({
        holdings,
        risk_tolerance: riskTolerance,
        include_monte_carlo: true,
        include_correlation: true,
        include_sector_analysis: true,
        include_ml_prediction: true
      })

      console.log('📊 Risk Report Received:', report)
      console.log('🤖 ML Prediction Data:', report.ml_prediction)
      
      setRiskReport(report)
      setRetryCount(0) // Reset retry count on success
      success('Risk Analysis Complete', 'Advanced risk report generated successfully')
    } catch (err: any) {
      console.error('Advanced risk analysis error:', err)
      setRetryCount(prev => prev + 1)
      
      // Provide more specific error messages
      let errorMessage = 'Advanced engine unavailable after multiple attempts. Please try again later.'
      let toastMessage = 'Advanced engine unavailable. Consider using local analysis mode.'
      
      if (err.message) {
        if (err.message.includes('timed out')) {
          errorMessage = 'Risk analysis is taking longer than expected. This may be due to high server load.'
          toastMessage = 'Analysis timed out. Please try again in a few minutes.'
        } else if (err.message.includes('Network error')) {
          errorMessage = 'Unable to connect to the risk analysis service. Please check your connection.'
          toastMessage = 'Network connection issue. Please try again.'
        } else if (err.message.includes('HTTP error')) {
          errorMessage = 'Risk analysis service is temporarily unavailable.'
          toastMessage = 'Service temporarily unavailable. Please try again later.'
        }
      }
      
      if (retryCount + 1 >= maxRetries) {
        setError(errorMessage)
        showError('Analysis Failed', toastMessage)
        
        // Provide fallback basic analysis
        console.log('Providing fallback basic risk analysis...')
        const fallbackReport = generateFallbackRiskReport(holdings, riskTolerance)
        setRiskReport(fallbackReport)
      } else {
        setError(`Attempt ${retryCount + 1} of ${maxRetries} failed. Retrying...`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && holdings && holdings.length > 0) {
      const interval = setInterval(generateRiskReport, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, holdings, refreshInterval])

  // Initial load
  useEffect(() => {
    generateRiskReport()
  }, [holdings, riskTolerance])

  // Stress testing scenarios
  const stressTests = useMemo(() => {
    if (!riskReport) return {}
    
    const baseValue = holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0)

    return {
      'Market Crash (-20%)': baseValue * 0.8,
      'Recession (-10%)': baseValue * 0.9,
      'Volatility Spike': baseValue * 0.95,
      'Interest Rate Hike': baseValue * 0.92,
      'Sector Rotation': baseValue * 0.88
    }
  }, [riskReport, holdings])

  if (loading && !riskReport) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error && !riskReport) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{error}</p>
          <button onClick={generateRiskReport} className="text-sm text-green-500 hover:text-green-600">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!riskReport) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Add holdings to view risk analysis
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Matches Dashboard Style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risk Analysis</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Portfolio risk assessment and ML predictions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={generateRiskReport}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </button>
          </div>
        </div>

        {/* Clean Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'monte_carlo', name: 'Monte Carlo', icon: BarChart3 },
              { id: 'ml_prediction', name: 'ML Prediction', icon: Brain },
              { id: 'diversification', name: 'Diversification', icon: PieChart }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedAnalysis(tab.id as AnalysisType)}
                className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-colors ${
                  selectedAnalysis === tab.id
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="py-4">
          {/* Monte Carlo Analysis */}
          {selectedAnalysis === 'monte_carlo' && (
            <div className="space-y-6">
              <MonteCarloChart
                portfolioHoldings={holdings}
                className=""
              />
            </div>
          )}

          {/* ML Prediction */}
          {selectedAnalysis === 'ml_prediction' && riskReport?.ml_prediction && (
            <div className="space-y-6">
              <MLPredictionView prediction={riskReport.ml_prediction} />
              
              <VolatilityComparisonChart 
                portfolioHoldings={holdings}
                mlPrediction={riskReport.ml_prediction}
                className=""
              />
            </div>
          )}

          {/* Diversification - Combined Correlation & Sectors */}
          {selectedAnalysis === 'diversification' && (
            <div className="space-y-8">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 gap-8">
                {/* Diversification Score */}
                {riskReport.correlation_analysis && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Diversification Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {((riskReport.correlation_analysis.diversification_score || 0) * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(riskReport.correlation_analysis.diversification_score || 0) > 0.5 ? 'Good' : 
                         (riskReport.correlation_analysis.diversification_score || 0) > 0.3 ? 'Fair' : 
                         (riskReport.correlation_analysis.diversification_score || 0) === 0 ? 'Add more stocks' : 'Poor'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Concentration Risk */}
                {riskReport.sector_analysis && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Concentration Risk</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {(riskReport.sector_analysis.concentration_risk * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {riskReport.sector_analysis.concentration_risk > 0.4 ? 'High' : 
                         riskReport.sector_analysis.concentration_risk > 0.25 ? 'Moderate' : 'Low'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* High Correlation Pairs */}
              {riskReport.correlation_analysis?.high_correlation_pairs && 
               riskReport.correlation_analysis.high_correlation_pairs.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Highly Correlated Stocks</p>
                  <div className="space-y-2">
                    {riskReport.correlation_analysis.high_correlation_pairs.map(([stock1, stock2, correlation], index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {stock1} • {stock2}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {(correlation * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sector Pie Chart */}
              {riskReport.sector_analysis && (
                <SectorAnalysisPieChart analysis={riskReport.sector_analysis} className="" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ML Prediction Component - No Card, Just Metrics
const MLPredictionView = ({ prediction }: { prediction: MLPrediction }) => {
  return (
    <div className="grid grid-cols-3 gap-8 mb-6">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Predicted Volatility</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {advancedRiskService.formatPercentage(prediction.predicted_volatility)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {prediction.prediction_horizon}d horizon
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Model Accuracy</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {(prediction.model_accuracy * 100).toFixed(0)}%
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">R² Score</p>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Confidence Range</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {advancedRiskService.formatPercentage(prediction.confidence_interval[0])} - {advancedRiskService.formatPercentage(prediction.confidence_interval[1])}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">95% CI</p>
      </div>
    </div>
  )
}
