import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { Navigation } from './Navigation'
import { rebalancingService, RebalancingAnalysis, RebalancingSuggestion, WhatIfAnalysis } from '../lib/rebalancingService'
import { useToast } from './Toast'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Calculator,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Download,
  Upload
} from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './Button'
import { SkeletonCard } from './Skeleton'

export const Rebalancing: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio()
  const { success, error: showError } = useToast()
  
  const [analysis, setAnalysis] = useState<RebalancingAnalysis | null>(null)
  const [whatIfAnalysis, setWhatIfAnalysis] = useState<WhatIfAnalysis | null>(null)
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({})
  const [constraints, setConstraints] = useState<Record<string, [number, number]>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [transactionCostRate, setTransactionCostRate] = useState(0.005) // 0.5%
  const [minTradeThreshold, setMinTradeThreshold] = useState(100) // $100

  // Calculate current allocation from portfolio
  const currentAllocation = useMemo(() => {
    if (!currentPortfolio?.holdings) return {}
    
    const totalValue = currentPortfolio.holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0)
    
    if (totalValue === 0) return {}
    
    const allocation: Record<string, number> = {}
    currentPortfolio.holdings.forEach(holding => {
      const value = holding.quantity * (holding.current_price || holding.avg_price)
      allocation[holding.symbol] = (value / totalValue) * 100
    })
    
    return allocation
  }, [currentPortfolio?.holdings])

  // Calculate real-time drift analysis
  const realTimeDrift = useMemo(() => {
    return rebalancingService.calculateDrift(currentAllocation, targetAllocation)
  }, [currentAllocation, targetAllocation])

  // Calculate real-time total drift
  const realTimeTotalDrift = useMemo(() => {
    return rebalancingService.calculateTotalDrift(realTimeDrift)
  }, [realTimeDrift])

  // Calculate real-time rebalancing score
  const realTimeRebalancingScore = useMemo(() => {
    return Math.min(100, realTimeTotalDrift * 2) // Scale drift to 0-100
  }, [realTimeTotalDrift])

  // Initialize target allocation when portfolio loads
  useEffect(() => {
    if (currentPortfolio?.holdings && Object.keys(targetAllocation).length === 0) {
      const equalWeight = 100 / currentPortfolio.holdings.length
      const target: Record<string, number> = {}
      currentPortfolio.holdings.forEach(holding => {
        target[holding.symbol] = equalWeight
      })
      setTargetAllocation(target)
    }
  }, [currentPortfolio?.holdings]) // Removed targetAllocation from dependencies

  const handleAnalyzeRebalancing = async () => {
    if (!currentPortfolio?.holdings) {
      showError('No portfolio data available')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await rebalancingService.analyzeRebalancing(
        currentPortfolio.holdings,
        targetAllocation,
        constraints
      )
      setAnalysis(result)
      success('Rebalancing analysis completed')
    } catch (err) {
      console.error('Rebalancing analysis failed:', err)
      showError('Failed to analyze rebalancing needs')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleWhatIfAnalysis = async () => {
    if (!analysis?.suggestions || !currentPortfolio?.holdings) {
      showError('No rebalancing suggestions available')
      return
    }

    setIsWhatIfLoading(true)
    try {
      const selectedSuggestionsList = analysis.suggestions.filter(s => 
        selectedSuggestions.has(s.symbol)
      )
      
      if (selectedSuggestionsList.length === 0) {
        showError('Please select at least one rebalancing action')
        return
      }

      const result = await rebalancingService.createWhatIfAnalysis(
        currentPortfolio.holdings,
        selectedSuggestionsList
      )
      setWhatIfAnalysis(result)
      success('What-if analysis completed')
    } catch (err) {
      console.error('What-if analysis failed:', err)
      showError('Failed to create what-if analysis')
    } finally {
      setIsWhatIfLoading(false)
    }
  }

  const handleQuickTargets = (type: 'equal' | 'market-cap' | 'current') => {
    if (!currentPortfolio?.holdings) return

    let newTarget: Record<string, number> = {}
    
    switch (type) {
      case 'equal':
        newTarget = rebalancingService.createEqualWeightTarget(currentPortfolio.holdings)
        break
      case 'market-cap':
        newTarget = rebalancingService.createMarketCapWeightTarget(currentPortfolio.holdings)
        break
      case 'current':
        newTarget = { ...currentAllocation }
        break
    }
    
    setTargetAllocation(newTarget)
    success(`Applied ${type.replace('-', ' ')} weighting`)
  }

  const handleTargetChange = (symbol: string, value: number) => {
    setTargetAllocation(prev => ({
      ...prev,
      [symbol]: Math.max(0, Math.min(100, value))
    }))
  }

  const handleSuggestionToggle = (symbol: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(symbol)) {
        newSet.delete(symbol)
      } else {
        newSet.add(symbol)
      }
      return newSet
    })
  }

  const handleSelectAllSuggestions = () => {
    if (analysis?.suggestions) {
      setSelectedSuggestions(new Set(analysis.suggestions.map(s => s.symbol)))
    }
  }

  const handleClearSelection = () => {
    setSelectedSuggestions(new Set())
  }

  const getDriftColor = (drift: number) => {
    const absDrift = Math.abs(drift)
    if (absDrift <= 2) return 'text-green-600'
    if (absDrift <= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />
      case 'MEDIUM': return <BarChart3 className="h-4 w-4" />
      case 'LOW': return <CheckCircle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  if (portfolioLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  if (!currentPortfolio?.holdings || currentPortfolio.holdings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Portfolio Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add holdings to your portfolio to start rebalancing analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Rebalancing</h1>
            <p className="mt-2 text-gray-600">
              Optimize your portfolio allocation using Modern Portfolio Theory
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <SecondaryButton
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              leftIcon={<Settings className="h-4 w-4" />}
            >
              Settings
            </SecondaryButton>
            <PrimaryButton
              onClick={handleAnalyzeRebalancing}
              loading={isAnalyzing}
              loadingText="Analyzing..."
              leftIcon={<Calculator className="h-4 w-4" />}
            >
              Analyze Rebalancing
            </PrimaryButton>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Cost Rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={transactionCostRate * 100}
                  onChange={(e) => setTransactionCostRate(parseFloat(e.target.value) / 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Trade Threshold ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minTradeThreshold}
                  onChange={(e) => setMinTradeThreshold(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Target Allocation Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Target Allocation</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleQuickTargets('equal')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Equal
                    </button>
                    <button
                      onClick={() => handleQuickTargets('market-cap')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      Market Cap
                    </button>
                    <button
                      onClick={() => handleQuickTargets('current')}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                    >
                      Current
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {currentPortfolio.holdings.map(holding => {
                  const currentPct = currentAllocation[holding.symbol] || 0
                  const targetPct = targetAllocation[holding.symbol] || 0
                  const drift = realTimeDrift[holding.symbol] || 0
                  const driftColor = Math.abs(drift) > 5 ? 'text-red-600' : 
                                   Math.abs(drift) > 2 ? 'text-yellow-600' : 'text-green-600'
                  
                  return (
                    <div key={holding.symbol} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{holding.symbol}</span>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {targetPct.toFixed(1)}% target
                          </div>
                          <div className={`text-xs ${driftColor}`}>
                            {drift > 0 ? '+' : ''}{drift.toFixed(2)}% drift
                          </div>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={targetPct}
                        onChange={(e) => handleTargetChange(holding.symbol, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Current: {currentPct.toFixed(2)}%</span>
                        <span>Target: {targetPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  )
                })}
                
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className={`font-medium ${
                      Math.abs(Object.values(targetAllocation).reduce((sum, val) => sum + val, 0) - 100) > 0.1 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {Object.values(targetAllocation).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Real-time drift summary */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">Real-time Drift Analysis</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Total Drift:</span>
                        <span className={`ml-1 font-medium ${
                          realTimeTotalDrift > 10 ? 'text-red-600' : 
                          realTimeTotalDrift > 5 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {realTimeTotalDrift.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Score:</span>
                        <span className={`ml-1 font-medium ${
                          realTimeRebalancingScore > 50 ? 'text-red-600' : 
                          realTimeRebalancingScore > 20 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {realTimeRebalancingScore.toFixed(0)}/100
                        </span>
                      </div>
                    </div>
                    {/* Debug info */}
                    <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                      <div>Current: {JSON.stringify(currentAllocation)}</div>
                      <div>Target: {JSON.stringify(targetAllocation)}</div>
                      <div>Drift: {JSON.stringify(realTimeDrift)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            {!analysis ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
                <p className="text-gray-500 mb-6">
                  Set your target allocation and click "Analyze Rebalancing" to get started.
                </p>
                <PrimaryButton
                  onClick={handleAnalyzeRebalancing}
                  loading={isAnalyzing}
                  loadingText="Analyzing..."
                  leftIcon={<Calculator className="h-4 w-4" />}
                >
                  Start Analysis
                </PrimaryButton>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Analysis Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{analysis.total_drift.toFixed(2)}%</div>
                      <div className="text-sm text-gray-500">Total Drift</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{analysis.rebalancing_score.toFixed(0)}/100</div>
                      <div className="text-sm text-gray-500">Rebalancing Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">${analysis.estimated_transaction_cost.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Est. Transaction Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{analysis.suggestions.length}</div>
                      <div className="text-sm text-gray-500">Suggestions</div>
                    </div>
                  </div>
                </div>

                {/* Rebalancing Suggestions */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Rebalancing Suggestions</h3>
                      <div className="flex space-x-2">
                        <SecondaryButton
                          onClick={handleSelectAllSuggestions}
                          size="sm"
                        >
                          Select All
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={handleClearSelection}
                          size="sm"
                        >
                          Clear
                        </SecondaryButton>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Drift
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysis.suggestions.map((suggestion) => (
                          <tr key={suggestion.symbol} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedSuggestions.has(suggestion.symbol)}
                                onChange={() => handleSuggestionToggle(suggestion.symbol)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{suggestion.symbol}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                suggestion.action === 'BUY' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {suggestion.action === 'BUY' ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {suggestion.action}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {suggestion.quantity.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${getDriftColor(suggestion.drift_percentage)}`}>
                                {suggestion.drift_percentage > 0 ? '+' : ''}{suggestion.drift_percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(suggestion.priority)}`}>
                                {getPriorityIcon(suggestion.priority)}
                                <span className="ml-1">{suggestion.priority}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${suggestion.estimated_cost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* What-If Analysis */}
                {selectedSuggestions.size > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">What-If Analysis</h3>
                        <PrimaryButton
                          onClick={handleWhatIfAnalysis}
                          loading={isWhatIfLoading}
                          loadingText="Analyzing..."
                          leftIcon={<Eye className="h-4 w-4" />}
                          size="sm"
                        >
                          Run Analysis
                        </PrimaryButton>
                      </div>
                    </div>
                    <div className="p-6">
                      {whatIfAnalysis ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              ${whatIfAnalysis.current_total_value.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Current Value</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              ${whatIfAnalysis.simulated_total_value.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">After Rebalancing</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              -${whatIfAnalysis.transaction_cost.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">Transaction Cost</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              whatIfAnalysis.net_impact >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {whatIfAnalysis.net_impact >= 0 ? '+' : ''}${whatIfAnalysis.net_impact.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">Net Impact</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Eye className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-gray-500">
                            Select rebalancing suggestions and run what-if analysis to see the impact.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
