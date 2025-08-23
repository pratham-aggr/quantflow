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
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType>('monte_carlo')
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const { success, error: showError } = useToast()

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

    setLoading(true)
    setError(null)

    try {
      const report = await advancedRiskService.generateAdvancedRiskReport({
        holdings,
        risk_tolerance: riskTolerance,
        include_monte_carlo: true,
        include_correlation: true,
        include_sector_analysis: true,
        include_ml_prediction: true
      })

      setRiskReport(report)
      success('Risk Analysis Complete', 'Advanced risk report generated successfully')
    } catch (err) {
      console.error('Advanced risk analysis error:', err)
      setError('Failed to generate risk report - advanced engine may be unavailable')
      showError('Analysis Failed', 'Advanced engine unavailable. Consider using local analysis mode.')
      // Set a fallback report to prevent infinite retries
      setRiskReport(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !riskReport) return

    const interval = setInterval(generateRiskReport, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, holdings, riskTolerance, riskReport])

  // Initial report generation - only run once when component mounts or holdings change
  useEffect(() => {
    if (holdings && holdings.length > 0 && !riskReport && !loading) {
      generateRiskReport()
    }
  }, [holdings, riskTolerance, riskReport, loading])

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Generate risk insights
  const riskInsights = useMemo(() => {
    if (!riskReport) return []
    return advancedRiskService.generateRiskInsights(riskReport)
  }, [riskReport])

  // Calculate stress test scenarios
  const stressTests = useMemo(() => {
    return advancedRiskService.calculateStressTests(holdings)
  }, [holdings])

  // Export risk report
  const exportRiskReport = () => {
    if (!riskReport) return

    const reportData = {
      ...riskReport,
      export_timestamp: new Date().toISOString(),
      holdings_count: holdings.length,
      total_value: holdings.reduce((sum, h) => sum + (h.quantity * h.avg_price), 0)
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `risk_report_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    success('Report Exported', 'Risk report downloaded successfully')
  }

  if (loading && !riskReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Risk Analysis</h3>
          <p className="text-gray-500">Running Monte Carlo simulations and advanced analytics...</p>
          {error && (
            <div className="mt-4">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Switch to Local Mode
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error && !riskReport) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={generateRiskReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    )
  }

  if (!riskReport) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Advanced Risk Analysis</h2>
              <p className="text-sm text-gray-500">
                Monte Carlo simulation, correlation analysis, sector allocation, and ML predictions
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showAdvancedMetrics ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced
            </button>
            <button
              onClick={exportRiskReport}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={generateRiskReport}
              disabled={loading}
              className="flex items-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Risk Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Risk Score</p>
                <p className="text-2xl font-bold text-blue-900">{riskReport.summary.risk_score.toFixed(1)}/10</p>
                <p className="text-sm text-blue-700">{riskReport.summary.risk_level}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Volatility</p>
                <p className="text-2xl font-bold text-green-900">
                  {advancedRiskService.formatPercentage(riskReport.summary.portfolio_volatility)}
                </p>
                <p className="text-sm text-green-700">Annualized</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-purple-900">
                  {riskReport.summary.sharpe_ratio.toFixed(2)}
                </p>
                <p className="text-sm text-purple-700">Risk-Adjusted</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">VaR (95%)</p>
                <p className="text-2xl font-bold text-orange-900">
                  {advancedRiskService.formatPercentage(riskReport.summary.var_95)}
                </p>
                <p className="text-sm text-orange-700">Daily Loss</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Insights */}
      {riskInsights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            Risk Insights
          </h3>
          <div className="space-y-2">
            {riskInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'monte_carlo', name: 'Monte Carlo', icon: BarChart3 },
              { id: 'correlation', name: 'Correlation', icon: Network },
              { id: 'sector', name: 'Sector Analysis', icon: PieChart },
              { id: 'ml_prediction', name: 'ML Prediction', icon: Brain }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedAnalysis(tab.id as AnalysisType)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedAnalysis === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Monte Carlo Analysis */}
          {selectedAnalysis === 'monte_carlo' && riskReport.monte_carlo_analysis && (
            <MonteCarloAnalysisView analysis={riskReport.monte_carlo_analysis} />
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
            <MLPredictionView prediction={riskReport.ml_prediction} />
          )}
        </div>
      </div>

      {/* Stress Testing */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Layers className="w-5 h-5 mr-2 text-red-600" />
          Stress Testing Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stressTests).map(([scenario, value]) => (
            <div key={scenario} className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">{scenario}</p>
              <p className="text-lg font-bold text-gray-900">
                {advancedRiskService.formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {riskReport.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            Recommendations
          </h3>
          <div className="space-y-3">
            {riskReport.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Monte Carlo Analysis Component
const MonteCarloAnalysisView: React.FC<{ analysis: MonteCarloAnalysis }> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Simulation Results</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Mean Return</p>
              <p className="text-xl font-bold text-green-900">
                {advancedRiskService.formatPercentage(analysis.mean_return)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Std Deviation</p>
              <p className="text-xl font-bold text-blue-900">
                {advancedRiskService.formatPercentage(analysis.std_return)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Probability Positive</p>
              <p className="text-xl font-bold text-purple-900">
                {advancedRiskService.formatPercentage(analysis.probability_positive)}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600">Worst Case</p>
              <p className="text-xl font-bold text-orange-900">
                {advancedRiskService.formatPercentage(analysis.worst_case)}
              </p>
            </div>
          </div>
        </div>

        {/* Percentiles */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Return Percentiles</h4>
          <div className="space-y-2">
            {Object.entries(analysis.percentiles).map(([percentile, value]) => (
              <div key={percentile} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">{percentile} Percentile</span>
                <span className="text-sm font-bold text-gray-900">
                  {advancedRiskService.formatPercentage(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence Intervals */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Confidence Intervals</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analysis.confidence_intervals).map(([level, [lower, upper]]) => (
            <div key={level} className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">{level} Confidence</p>
              <p className="text-sm text-gray-900">
                {advancedRiskService.formatPercentage(lower)} to {advancedRiskService.formatPercentage(upper)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Correlation Analysis Component
const CorrelationAnalysisView: React.FC<{ analysis: CorrelationAnalysis }> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diversification Score */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Diversification Score</h4>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {(analysis.diversification_score * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-green-700">
              {analysis.diversification_score > 0.7 ? 'Excellent' : 
               analysis.diversification_score > 0.5 ? 'Good' : 
               analysis.diversification_score > 0.3 ? 'Fair' : 'Poor'} diversification
            </p>
          </div>
        </div>

        {/* High Correlation Pairs */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">High Correlation Pairs</h4>
          {analysis.high_correlation_pairs.length > 0 ? (
            <div className="space-y-2">
              {analysis.high_correlation_pairs.map(([symbol1, symbol2, correlation], index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">
                    {symbol1} ↔ {symbol2}
                  </span>
                  <span className="text-sm font-bold text-red-900">
                    {correlation.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No highly correlated pairs detected</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Sector Analysis Component
const SectorAnalysisView: React.FC<{ analysis: SectorAnalysis }> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sector Allocation</h4>
          <div className="space-y-2">
            {Object.entries(analysis.sector_allocation).map(([sector, allocation]) => (
              <div key={sector} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{sector}</span>
                <span className="text-sm font-bold text-gray-900">{allocation.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Risk */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sector Risk</h4>
          <div className="space-y-2">
            {Object.entries(analysis.sector_risk).map(([sector, risk]) => (
              <div key={sector} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{sector}</span>
                <span className="text-sm font-bold text-gray-900">
                  {advancedRiskService.formatPercentage(risk)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Concentration Risk */}
      <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Concentration Risk</h4>
        <div className="text-center">
          <div className="text-4xl font-bold text-orange-600 mb-2">
            {(analysis.concentration_risk * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-orange-700">
            {analysis.concentration_risk > 0.4 ? 'High' : 
             analysis.concentration_risk > 0.25 ? 'Moderate' : 'Low'} concentration risk
          </p>
        </div>
      </div>

      {/* Sector Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sector Recommendations</h4>
          <div className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ML Prediction Component
const MLPredictionView: React.FC<{ prediction: MLPrediction }> = ({ prediction }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prediction Results */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Volatility Prediction</h4>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {advancedRiskService.formatPercentage(prediction.predicted_volatility)}
            </div>
            <p className="text-sm text-purple-700">
              Predicted volatility for next {prediction.prediction_horizon} days
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Confidence: {prediction.model_accuracy * 100}%
            </p>
          </div>
        </div>

        {/* Confidence Interval */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Confidence Interval</h4>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Predicted Range</p>
              <p className="text-lg font-bold text-gray-900">
                {advancedRiskService.formatPercentage(prediction.confidence_interval[0])} - {advancedRiskService.formatPercentage(prediction.confidence_interval[1])}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Feature Importance</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(prediction.feature_importance).map(([feature, importance]) => (
            <div key={feature} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 capitalize">
                {feature.replace('_', ' ')}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {(importance * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
