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

type AnalysisType = 'monte_carlo' | 'correlation' | 'sector' | 'ml_prediction'
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Generating risk report...
          </p>
        </div>
      </div>
    )
  }

  if (error && !riskReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={generateRiskReport}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (!riskReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Please add holdings to your portfolio to view risk analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Risk Analysis</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Portfolio risk assessment and analytics</p>
            </div>
          </div>
          
          <button
            onClick={generateRiskReport}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Analysis Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-6 px-6">
              {[
                { id: 'monte_carlo', name: 'Monte Carlo', icon: BarChart3 },
                { id: 'correlation', name: 'Correlation', icon: Network },
                { id: 'sector', name: 'Sector Analysis', icon: PieChart },
                { id: 'ml_prediction', name: 'ML Prediction', icon: Brain }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedAnalysis(tab.id as AnalysisType)}
                  className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedAnalysis === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {/* Monte Carlo Analysis */}
            {selectedAnalysis === 'monte_carlo' && (
              <div className="space-y-6">
                {/* Monte Carlo Chart */}
                <MonteCarloChart
                  portfolioHoldings={holdings}
                  className="mb-6"
                />

                {/* Existing Monte Carlo Analysis */}
                {riskReport.monte_carlo_analysis && (
                  <MonteCarloAnalysisView analysis={riskReport.monte_carlo_analysis} />
                )}
              </div>
            )}

            {/* Correlation Analysis */}
            {selectedAnalysis === 'correlation' && riskReport.correlation_analysis && (
              <CorrelationAnalysisView analysis={riskReport.correlation_analysis} />
            )}

            {/* Sector Analysis */}
            {selectedAnalysis === 'sector' && riskReport.sector_analysis && (
              <SectorAnalysisView analysis={riskReport.sector_analysis} />
            )}

                              {/* ML Prediction */}
                  {selectedAnalysis === 'ml_prediction' && riskReport.ml_prediction && (
                      <div className="space-y-4">
                        <MLPredictionView prediction={riskReport.ml_prediction} />
                        
                        {/* ML Volatility Comparison Chart */}
                        <VolatilityComparisonChart 
                          portfolioHoldings={holdings}
                          className="mb-4"
                        />
                      </div>
                    )}
          </div>
        </div>

        {/* Stress Testing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-red-600" />
            Stress Testing
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stressTests).map(([scenario, value]) => (
              <div key={scenario} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{scenario}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {advancedRiskService.formatCurrency(value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {riskReport.recommendations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-blue-600" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {riskReport.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Monte Carlo Analysis Component
const MonteCarloAnalysisView = ({ analysis }: { analysis: MonteCarloAnalysis }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Mean Return</p>
          <p className="text-lg font-bold text-green-600">
            {advancedRiskService.formatPercentage(analysis.mean_return)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Std Deviation</p>
          <p className="text-lg font-bold text-blue-600">
            {advancedRiskService.formatPercentage(analysis.std_return)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Probability Positive</p>
          <p className="text-lg font-bold text-purple-600">
            {advancedRiskService.formatPercentage(analysis.probability_positive)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Worst Case</p>
          <p className="text-lg font-bold text-orange-600">
            {advancedRiskService.formatPercentage(analysis.worst_case)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Correlation Analysis Component
const CorrelationAnalysisView = ({ analysis }: { analysis: CorrelationAnalysis }) => {
  return (
    <div className="space-y-4">
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Diversification Score</p>
        <p className="text-2xl font-bold text-green-600">
          {(analysis.diversification_score * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {analysis.diversification_score > 0.7 ? 'Excellent' : 
           analysis.diversification_score > 0.5 ? 'Good' : 
           analysis.diversification_score > 0.3 ? 'Fair' : 'Poor'} diversification
        </p>
      </div>
    </div>
  )
}

// Sector Analysis Component
const SectorAnalysisView = ({ analysis }: { analysis: SectorAnalysis }) => {
  return (
    <div className="space-y-4">
      {/* Sector Allocation Pie Chart */}
      <SectorAnalysisPieChart analysis={analysis} className="mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Concentration Risk */}
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Concentration Risk</p>
          <p className="text-2xl font-bold text-orange-600">
            {(analysis.concentration_risk * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {analysis.concentration_risk > 0.4 ? 'High' : 
             analysis.concentration_risk > 0.25 ? 'Moderate' : 'Low'} concentration
          </p>
        </div>
      </div>
    </div>
  )
}

// ML Prediction Component
const MLPredictionView = ({ prediction }: { prediction: MLPrediction }) => {
  return (
    <div className="space-y-4">
      {/* Model Improvement Note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">Note:</span> The ML prediction model is still under improvement and refinement. Results should be used as supplementary information alongside other analysis tools.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Predicted Volatility</p>
          <p className="text-lg font-bold text-purple-600">
            {advancedRiskService.formatPercentage(prediction.predicted_volatility)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Model Confidence</p>
          <p className="text-lg font-bold text-blue-600">
            {(prediction.model_accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Horizon</p>
          <p className="text-lg font-bold text-green-600">
            {prediction.prediction_horizon} days
          </p>
        </div>
      </div>
    </div>
  )
}
