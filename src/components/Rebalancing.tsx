import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye,
  Settings,
  RefreshCw
} from 'lucide-react'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useToast } from '../hooks/useToast'
import { rebalancingService } from '../lib/rebalancingService'
import { PrimaryButton, SecondaryButton } from './Button'

interface RebalancingSuggestion {
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  current_value: number
  target_value: number
  drift_percentage: number
  priority: 'high' | 'medium' | 'low'
  estimated_cost: number
}

interface RebalancingAnalysis {
  suggestions: RebalancingSuggestion[]
  total_drift: number
  optimization_method: string
  estimated_impact: number
}

interface WhatIfAnalysis {
  current_total_value: number
  simulated_total_value: number
  transaction_cost: number
  net_impact: number
}

export default function Rebalancing() {
  const { currentPortfolio, refreshCurrentPortfolio } = usePortfolio()
  const { showToast } = useToast()
  
  // Add error state
  const [error, setError] = useState<string | null>(null)
  
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [transactionCostRate, setTransactionCostRate] = useState(0.005) // 0.5%
  const [minTradeThreshold, setMinTradeThreshold] = useState(100) // $100
  const [autoAnalysis, setAutoAnalysis] = useState(false) // Disable auto-analysis by default to prevent errors
  const [autoWhatIf, setAutoWhatIf] = useState(false) // Disable auto what-if analysis by default
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null)
  const [lastWhatIfTime, setLastWhatIfTime] = useState<Date | null>(null)
  
  const [analysis, setAnalysis] = useState<RebalancingAnalysis | null>(null)
  const [whatIfAnalysis, setWhatIfAnalysis] = useState<WhatIfAnalysis | null>(null)

  // Calculate current allocation from portfolio
  const currentAllocation = useMemo(() => {
    if (!currentPortfolio?.holdings) return {}
    
    const totalValue = currentPortfolio.holdings.reduce((sum, holding) => {
      const currentValue = holding.quantity * (holding.current_price || holding.avg_price)
      return sum + currentValue
    }, 0)
    const allocation: Record<string, number> = {}
    
    currentPortfolio.holdings.forEach(holding => {
      const currentValue = holding.quantity * (holding.current_price || holding.avg_price)
      allocation[holding.symbol] = totalValue > 0 ? (currentValue / totalValue) * 100 : 0
    })
    
    return allocation
  }, [currentPortfolio?.holdings])

  // Initialize target allocation when portfolio loads
  useEffect(() => {
    if (currentPortfolio?.holdings && Object.keys(targetAllocation).length === 0) {
      const target: Record<string, number> = {}
      const equalWeight = 100 / currentPortfolio.holdings.length
      
      currentPortfolio.holdings.forEach(holding => {
        target[holding.symbol] = equalWeight
      })
      
      setTargetAllocation(target)
    }
  }, [currentPortfolio?.holdings, targetAllocation])

  // Auto-analysis when target allocation changes
  useEffect(() => {
    if (autoAnalysis && currentPortfolio?.holdings && Object.keys(targetAllocation).length > 0) {
      // Debounce the auto-analysis to avoid too many requests
      const timeoutId = setTimeout(() => {
        handleAnalyzeRebalancing(true) // true = silent mode
      }, 1000) // 1 second delay

      return () => clearTimeout(timeoutId)
    }
  }, [targetAllocation, autoAnalysis, currentPortfolio?.holdings])

  // Auto what-if analysis when analysis or selected suggestions change
  useEffect(() => {
    if (autoWhatIf && analysis?.suggestions && selectedSuggestions.size > 0) {
      // Debounce the what-if analysis to avoid too many requests
      const timeoutId = setTimeout(() => {
        handleWhatIfAnalysis(true) // true = silent mode
      }, 800) // 0.8 second delay

      return () => clearTimeout(timeoutId)
    }
  }, [analysis, selectedSuggestions, autoWhatIf])

  const handleAnalyzeRebalancing = async (silent = false) => {
    if (!currentPortfolio?.holdings) {
      if (!silent) showToast('error', 'No portfolio data available')
      return
    }

    if (!silent) {
      console.log('Starting rebalancing analysis...')
      console.log('Current portfolio:', currentPortfolio)
      console.log('Target allocation:', targetAllocation)
    }
    
    setIsAnalyzing(true)
    setError(null) // Clear any previous errors
    
    try {
      const result = await rebalancingService.analyzeRebalancing(
        currentPortfolio.holdings,
        targetAllocation,
        {}
      )
      
      // Debug: Log the result structure
      console.log('Analysis result structure:', {
        hasSuggestions: !!result.suggestions,
        suggestionsLength: result.suggestions?.length,
        hasTotalDrift: 'total_drift' in result,
        hasOptimizationMethod: 'optimization_method' in result,
        hasEstimatedImpact: 'estimated_impact' in result,
        resultKeys: Object.keys(result)
      })
      
      if (!silent) {
        console.log('Rebalancing analysis result:', result)
        showToast('success', 'Rebalancing analysis completed')
      }
      
      // Transform the result to match the expected interface
      const transformedResult = {
        suggestions: (result.suggestions || []).map(suggestion => ({
          ...suggestion,
          action: suggestion.action.toLowerCase() as 'buy' | 'sell',
          priority: suggestion.priority.toLowerCase() as 'high' | 'medium' | 'low'
        })),
        total_drift: result.total_drift || 0,
        optimization_method: result.optimization_method || 'Portfolio Analysis',
        estimated_impact: result.estimated_transaction_cost || 0
      }
      
      console.log('Transformed result:', transformedResult)
      
      setAnalysis(transformedResult)
      setLastAnalysisTime(new Date())
    } catch (err) {
      console.error('Rebalancing analysis failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze rebalancing needs'
      setError(errorMessage)
      if (!silent) {
        showToast('error', 'Analysis Failed', errorMessage)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleWhatIfAnalysis = async (silent = false) => {
    console.log('What-if analysis triggered', { silent, selectedSuggestions: Array.from(selectedSuggestions) })
    
    const selectedSuggestionsList = analysis?.suggestions.filter(s => 
      selectedSuggestions.has(s.symbol)
    ) || []
    
    console.log('Selected suggestions list:', selectedSuggestionsList)
    
    if (selectedSuggestionsList.length === 0) {
      console.log('No suggestions selected')
      if (!silent) showToast('error', 'Please select at least one rebalancing action')
      return
    }

    if (!currentPortfolio?.holdings) {
      console.log('No portfolio holdings')
      if (!silent) showToast('error', 'No portfolio data available')
      return
    }

    console.log('Starting what-if analysis...')
    setIsWhatIfLoading(true)
    
    try {
      // Transform suggestions back to service format
      const targetAllocation = selectedSuggestionsList.map(suggestion => ({
        ...suggestion,
        action: suggestion.action.toUpperCase() as 'BUY' | 'SELL',
        priority: suggestion.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        estimated_cost: suggestion.estimated_cost || 0
      }))
      
      console.log('Target allocation:', targetAllocation)
      
      const result = await rebalancingService.createWhatIfAnalysis(
        currentPortfolio.holdings,
        targetAllocation
      )
      
      console.log('What-if analysis result:', result)
      setWhatIfAnalysis(result)
      setLastWhatIfTime(new Date())
      if (!silent) showToast('success', 'What-if analysis completed')
    } catch (err) {
      console.error('What-if analysis failed:', err)
      if (!silent) showToast('error', 'Failed to create what-if analysis')
    } finally {
      setIsWhatIfLoading(false)
    }
  }

  const handleQuickTargets = (type: 'equal' | 'market-cap' | 'current') => {
    if (!currentPortfolio?.holdings) return

    const target: Record<string, number> = {}
    
    switch (type) {
      case 'equal':
        const equalWeight = 100 / currentPortfolio.holdings.length
        currentPortfolio.holdings.forEach(holding => {
          target[holding.symbol] = equalWeight
        })
        break
      case 'market-cap':
        // Simplified market cap weighting (using current values as proxy)
        const totalValue = currentPortfolio.holdings.reduce((sum, holding) => {
          const currentValue = holding.quantity * (holding.current_price || holding.avg_price)
          return sum + currentValue
        }, 0)
        currentPortfolio.holdings.forEach(holding => {
          const currentValue = holding.quantity * (holding.current_price || holding.avg_price)
          target[holding.symbol] = totalValue > 0 ? (currentValue / totalValue) * 100 : 0
        })
        break
      case 'current':
        Object.assign(target, currentAllocation)
        break
    }
    
    setTargetAllocation(target)
  }

  const toggleSuggestion = (symbol: string) => {
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

  const selectAllSuggestions = () => {
    if (analysis?.suggestions) {
      setSelectedSuggestions(new Set(analysis.suggestions.map(s => s.symbol)))
    }
  }

  const clearAllSuggestions = () => {
    setSelectedSuggestions(new Set())
  }

  if (!currentPortfolio) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Portfolio Selected</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please select a portfolio to view rebalancing options.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Portfolio Rebalancing</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Optimize your portfolio allocation and get personalized rebalancing recommendations.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Analysis Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              
              {/* Total Allocation Display */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Allocation:</span>
                  <span className={`font-medium ${
                    Math.abs(Object.values(targetAllocation).reduce((sum, val) => sum + val, 0) - 100) > 0.1 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {Object.values(targetAllocation).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                  </span>
                </div>
                {Math.abs(Object.values(targetAllocation).reduce((sum, val) => sum + val, 0) - 100) > 0.1 && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Total should equal 100%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Target Allocation Section */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Target Allocation</h3>
                                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleQuickTargets('equal')}
                      className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors font-medium"
                    >
                      Equal Weight
                    </button>
                    <button
                      onClick={() => handleQuickTargets('market-cap')}
                      className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors font-medium"
                    >
                      Market Cap
                    </button>
                    <button
                      onClick={() => handleQuickTargets('current')}
                      className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors font-medium"
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
                const drift = targetPct - currentPct
                
                return (
                  <div key={holding.symbol} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                          {holding.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{holding.symbol}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ${(holding.quantity * (holding.current_price || holding.avg_price)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Current</div>
                        <div className="font-medium text-gray-900 dark:text-white">{currentPct.toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Target</div>
                        <input
                          type="number"
                          value={targetPct.toFixed(1)}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0
                            setTargetAllocation(prev => ({
                              ...prev,
                              [holding.symbol]: newValue
                            }))
                          }}
                          className="w-24 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0.0"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Drift</div>
                        <div className={`font-medium ${drift > 0 ? 'text-green-600 dark:text-green-400' : drift < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {drift > 0 ? '+' : ''}{drift.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Analysis Results Section */}
          {analysis ? (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rebalancing Analysis</h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Advanced Settings</span>
                    </button>
                    <PrimaryButton
                      onClick={() => handleAnalyzeRebalancing()}
                      loading={isAnalyzing}
                      loadingText="Analyzing..."
                      leftIcon={<Calculator className="h-4 w-4" />}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Analyze Rebalancing
                    </PrimaryButton>
                  </div>
                </div>



                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Drift</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analysis.total_drift.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Suggestions</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analysis.suggestions.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Est. Impact</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${analysis.estimated_impact.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                {showAdvancedSettings && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Advanced Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                          Transaction Cost Rate (%)
                        </label>
                        <input
                          type="number"
                          value={transactionCostRate * 100}
                          onChange={(e) => setTransactionCostRate(parseFloat(e.target.value) / 100)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          step="0.1"
                          min="0"
                          max="10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Trade Threshold ($)
                        </label>
                        <input
                          type="number"
                          value={minTradeThreshold}
                          onChange={(e) => setMinTradeThreshold(parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Auto-analysis settings */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Analysis Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={autoAnalysis}
                            onChange={(e) => setAutoAnalysis(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span>Auto-analyze when allocation changes</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={autoWhatIf}
                            onChange={(e) => setAutoWhatIf(e.target.checked)}
                            className="h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                          />
                          <span>Auto what-if when suggestions change</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rebalancing Suggestions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Rebalancing Suggestions</h4>
                    <div className="flex space-x-2">
                      <SecondaryButton
                        onClick={selectAllSuggestions}
                        className="text-xs"
                      >
                        Select All
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={clearAllSuggestions}
                        className="text-xs"
                      >
                        Clear All
                      </SecondaryButton>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {analysis.suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.symbol}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedSuggestions.has(suggestion.symbol)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => toggleSuggestion(suggestion.symbol)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedSuggestions.has(suggestion.symbol)}
                              onChange={() => toggleSuggestion(suggestion.symbol)}
                              className="h-5 w-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              suggestion.action === 'buy' 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                              <span className={`text-sm font-semibold ${
                                suggestion.action === 'buy' 
                                  ? 'text-green-700 dark:text-green-300' 
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {suggestion.action === 'buy' ? '+' : '-'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {suggestion.symbol}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {suggestion.action === 'buy' ? 'Buy' : 'Sell'} {suggestion.quantity} shares
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              ${suggestion.current_value.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {suggestion.drift_percentage.toFixed(1)}% drift
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What-if Analysis Button */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <PrimaryButton
                    onClick={() => {
                      console.log('Button clicked!')
                      handleWhatIfAnalysis(false) // Explicitly pass false for non-silent mode
                    }}
                    loading={isWhatIfLoading}
                    loadingText="Analyzing..."
                    leftIcon={<Eye className="h-4 w-4" />}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={selectedSuggestions.size === 0}
                  >
                    {isWhatIfLoading ? 'Running Analysis...' : 'Run What-If Analysis'}
                  </PrimaryButton>
                </div>
              </div>

              {/* What-If Analysis Results */}
              {whatIfAnalysis && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What-If Analysis Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-sm font-medium text-green-900 dark:text-green-100">Current Value</div>
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        ${whatIfAnalysis.current_total_value.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">After Rebalancing</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        ${whatIfAnalysis.simulated_total_value.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Transaction Cost</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        -${whatIfAnalysis.transaction_cost.toFixed(2)}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      whatIfAnalysis.net_impact >= 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {whatIfAnalysis.net_impact >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <div className={`text-sm font-medium ${
                          whatIfAnalysis.net_impact >= 0 
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}>Net Impact</div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        whatIfAnalysis.net_impact >= 0 
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {whatIfAnalysis.net_impact >= 0 ? '+' : ''}${whatIfAnalysis.net_impact.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Ready to Analyze</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                Click "Analyze Rebalancing" to get personalized recommendations for your portfolio.
              </p>
              <PrimaryButton
                onClick={() => handleAnalyzeRebalancing()}
                loading={isAnalyzing}
                loadingText="Analyzing..."
                leftIcon={<Calculator className="h-4 w-4" />}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Analyze Rebalancing
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
