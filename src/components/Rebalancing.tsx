import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'

import { rebalancingService, RebalancingAnalysis, WhatIfAnalysis } from '../lib/rebalancingService'
import { useToast } from './Toast'
import { 
  Target, 
  BarChart3, 
  Calculator,
  Eye,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react'
import { PrimaryButton, SecondaryButton } from './Button'
import { SkeletonCard } from './Skeleton'

export const Rebalancing: React.FC = () => {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio()
  const { success, error: showError } = useToast()
  
  const [analysis, setAnalysis] = useState<RebalancingAnalysis | null>(null)
  const [whatIfAnalysis, setWhatIfAnalysis] = useState<WhatIfAnalysis | null>(null)
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({})
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
  }, [currentPortfolio?.holdings, targetAllocation])

  const handleAnalyzeRebalancing = async () => {
    if (!currentPortfolio?.holdings) {
      showError('No portfolio data available')
      return
    }

    console.log('Starting rebalancing analysis...')
    console.log('Current portfolio:', currentPortfolio)
    console.log('Target allocation:', targetAllocation)
    
    setIsAnalyzing(true)
    try {
      const result = await rebalancingService.analyzeRebalancing(
        currentPortfolio.holdings,
        targetAllocation,
        {}
      )
      console.log('Rebalancing analysis result:', result)
      setAnalysis(result)
      success('Rebalancing analysis completed')
    } catch (err) {
      console.error('Rebalancing analysis failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze rebalancing needs'
      showError('Analysis Failed', errorMessage)
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
    if (absDrift <= 2) return 'robinhood-gain'
    if (absDrift <= 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'robinhood-loss'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'robinhood-loss bg-loss-50 dark:bg-loss-900/20 border-loss-200 dark:border-loss-700'
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
      case 'LOW': return 'robinhood-gain bg-gain-50 dark:bg-gain-900/20 border-gain-200 dark:border-gain-700'
      default: return 'robinhood-text-secondary bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
        <div className="max-w-7xl mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-xl font-semibold robinhood-text-primary mb-3">No Portfolio Data</h3>
            <p className="robinhood-text-secondary text-lg">
              Add holdings to your portfolio to start rebalancing analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold robinhood-text-primary mb-3">Portfolio Rebalancing</h1>
            <p className="robinhood-text-secondary text-lg">
              Optimize your portfolio allocation using Modern Portfolio Theory
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <SecondaryButton
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              leftIcon={<Settings className="h-4 w-4" />}
              className="robinhood-btn-secondary"
            >
              Settings
            </SecondaryButton>
            <PrimaryButton
              onClick={handleAnalyzeRebalancing}
              loading={isAnalyzing}
              loadingText="Analyzing..."
              leftIcon={<Calculator className="h-4 w-4" />}
              className="robinhood-btn-primary"
            >
              Analyze Rebalancing
            </PrimaryButton>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="robinhood-card p-8 mb-8">
            <h3 className="text-xl font-semibold robinhood-text-primary mb-6">Advanced Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium robinhood-text-primary mb-2">
                  Transaction Cost Rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={transactionCostRate * 100}
                  onChange={(e) => setTransactionCostRate(parseFloat(e.target.value) / 100)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-robinhood-dark-border rounded-robinhood focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-robinhood-dark-secondary robinhood-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium robinhood-text-primary mb-2">
                  Minimum Trade Threshold ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minTradeThreshold}
                  onChange={(e) => setMinTradeThreshold(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-robinhood-dark-border rounded-robinhood focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-robinhood-dark-secondary robinhood-text-primary"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Target Allocation Panel */}
          <div className="lg:col-span-1">
            <div className="robinhood-card">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-robinhood-dark-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold robinhood-text-primary">Target Allocation</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleQuickTargets('equal')}
                      className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-robinhood hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors"
                    >
                      Equal
                    </button>
                    <button
                      onClick={() => handleQuickTargets('market-cap')}
                      className="text-xs bg-gain-100 dark:bg-gain-900/30 text-gain-700 dark:text-gain-300 px-2 py-1 rounded-robinhood hover:bg-gain-200 dark:hover:bg-gain-800/50 transition-colors"
                    >
                      Market Cap
                    </button>
                    <button
                      onClick={() => handleQuickTargets('current')}
                      className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-robinhood hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
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
                  const driftColor = getDriftColor(drift)
                  
                  return (
                    <div key={holding.symbol} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium robinhood-text-primary">{holding.symbol}</span>
                        <div className="text-right">
                          <div className="text-sm robinhood-text-secondary">
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
                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs robinhood-text-tertiary mt-1">
                        <span>Current: {currentPct.toFixed(2)}%</span>
                        <span>Target: {targetPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  )
                })}
                
                <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-robinhood-dark-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="robinhood-text-secondary">Total:</span>
                    <span className={`font-medium ${
                      Math.abs(Object.values(targetAllocation).reduce((sum, val) => sum + val, 0) - 100) > 0.1 
                        ? 'robinhood-loss' 
                        : 'robinhood-gain'
                    }`}>
                      {Object.values(targetAllocation).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Real-time drift summary */}
                  <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood p-3">
                    <div className="text-xs robinhood-text-tertiary mb-2">Real-time Drift Analysis</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="robinhood-text-secondary">Total Drift:</span>
                        <span className={`ml-1 font-medium ${
                          realTimeTotalDrift > 10 ? 'robinhood-loss' : 
                          realTimeTotalDrift > 5 ? 'text-yellow-600 dark:text-yellow-400' : 'robinhood-gain'
                        }`}>
                          {realTimeTotalDrift.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="robinhood-text-secondary">Score:</span>
                        <span className={`ml-1 font-medium ${
                          realTimeRebalancingScore > 70 ? 'robinhood-loss' : 
                          realTimeRebalancingScore > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'robinhood-gain'
                        }`}>
                          {realTimeRebalancingScore.toFixed(0)}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results Panel */}
          <div className="lg:col-span-2">
            {analysis ? (
              <div className="space-y-6">
                {/* Analysis Summary */}
                <div className="robinhood-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold robinhood-text-primary">Rebalancing Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm robinhood-text-secondary">Score:</span>
                      <span className={`text-lg font-bold ${
                        analysis.rebalancing_score > 70 ? 'robinhood-loss' : 
                        analysis.rebalancing_score > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'robinhood-gain'
                      }`}>
                        {analysis.rebalancing_score.toFixed(0)}/100
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-4 rounded-robinhood border border-primary-200 dark:border-primary-800">
                      <div className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-1">Total Trades</div>
                      <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {analysis.suggestions.length}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-gain-50 to-gain-100 dark:from-gain-900/20 dark:to-gain-800/20 p-4 rounded-robinhood border border-gain-200 dark:border-gain-800">
                      <div className="text-sm font-medium text-gain-900 dark:text-gain-100 mb-1">Estimated Cost</div>
                      <div className="text-2xl font-bold text-gain-700 dark:text-gain-300">
                        ${analysis.estimated_transaction_cost.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 p-4 rounded-robinhood border border-neutral-200 dark:border-neutral-700">
                      <div className="text-sm font-medium robinhood-text-primary mb-1">Rebalancing Score</div>
                      <div className="text-2xl font-bold robinhood-text-primary">
                        {analysis.rebalancing_score.toFixed(0)}/100
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-medium robinhood-text-primary">Rebalancing Suggestions</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSelectAllSuggestions}
                          className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-robinhood hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          onClick={handleClearSelection}
                          className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-robinhood hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    
                    {analysis.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.symbol}
                        className={`p-4 rounded-robinhood border-2 transition-all duration-200 cursor-pointer ${
                          selectedSuggestions.has(suggestion.symbol)
                            ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-200 dark:border-robinhood-dark-border hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                        onClick={() => handleSuggestionToggle(suggestion.symbol)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedSuggestions.has(suggestion.symbol)}
                              onChange={() => handleSuggestionToggle(suggestion.symbol)}
                              className="h-4 w-4 text-primary-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary-500"
                            />
                            <div>
                              <div className="font-medium robinhood-text-primary">{suggestion.symbol}</div>
                              <div className="text-sm robinhood-text-secondary">{suggestion.action}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              suggestion.action === 'BUY' ? 'robinhood-gain' : 'robinhood-loss'
                            }`}>
                              {suggestion.action === 'BUY' ? '+' : ''}{suggestion.quantity} shares
                            </div>
                            <div className="text-xs robinhood-text-tertiary">
                              ${suggestion.estimated_cost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                            {getPriorityIcon(suggestion.priority)}
                            <span className="ml-1">{suggestion.priority}</span>
                          </span>
                          <span className="text-xs robinhood-text-tertiary">
                            Drift: {suggestion.drift_percentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* What-if Analysis Button */}
                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-robinhood-dark-border">
                    <PrimaryButton
                      onClick={handleWhatIfAnalysis}
                      loading={isWhatIfLoading}
                      loadingText="Analyzing..."
                      leftIcon={<Eye className="h-4 w-4" />}
                      className="robinhood-btn-primary"
                      disabled={selectedSuggestions.size === 0}
                    >
                      Run What-If Analysis
                    </PrimaryButton>
                  </div>
                </div>

                {/* What-If Analysis Results */}
                {whatIfAnalysis && (
                  <div className="robinhood-card p-6">
                    <h3 className="text-lg font-semibold robinhood-text-primary mb-4">What-If Analysis Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-gain-50 to-gain-100 dark:from-gain-900/20 dark:to-gain-800/20 p-4 rounded-robinhood border border-gain-200 dark:border-gain-800">
                        <div className="text-sm font-medium text-gain-900 dark:text-gain-100 mb-1">Current Value</div>
                        <div className="text-2xl font-bold text-gain-700 dark:text-gain-300">
                          ${whatIfAnalysis.current_total_value.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-loss-50 to-loss-100 dark:from-loss-900/20 dark:to-loss-800/20 p-4 rounded-robinhood border border-loss-200 dark:border-loss-800">
                        <div className="text-sm font-medium text-loss-900 dark:text-loss-100 mb-1">After Rebalancing</div>
                        <div className="text-2xl font-bold text-loss-700 dark:text-loss-300">
                          ${whatIfAnalysis.simulated_total_value.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 p-4 rounded-robinhood border border-neutral-200 dark:border-neutral-700">
                        <div className="text-sm font-medium robinhood-text-primary mb-1">Transaction Cost</div>
                        <div className="text-2xl font-bold robinhood-text-primary">
                          -${whatIfAnalysis.transaction_cost.toFixed(2)}
                        </div>
                      </div>
                      <div className={`p-4 rounded-robinhood border ${
                        whatIfAnalysis.net_impact >= 0 
                          ? 'bg-gradient-to-br from-gain-50 to-gain-100 dark:from-gain-900/20 dark:to-gain-800/20 border-gain-200 dark:border-gain-800'
                          : 'bg-gradient-to-br from-loss-50 to-loss-100 dark:from-loss-900/20 dark:to-loss-800/20 border-loss-200 dark:border-loss-800'
                      }`}>
                        <div className={`text-sm font-medium mb-1 ${
                          whatIfAnalysis.net_impact >= 0 
                            ? 'text-gain-900 dark:text-gain-100'
                            : 'text-loss-900 dark:text-loss-100'
                        }`}>Net Impact</div>
                        <div className={`text-2xl font-bold ${
                          whatIfAnalysis.net_impact >= 0 
                            ? 'text-gain-700 dark:text-gain-300'
                            : 'text-loss-700 dark:text-loss-300'
                        }`}>
                          {whatIfAnalysis.net_impact >= 0 ? '+' : ''}${whatIfAnalysis.net_impact.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="robinhood-card p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calculator className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold robinhood-text-primary mb-3">Ready to Analyze</h3>
                <p className="robinhood-text-secondary text-lg mb-6">
                  Click "Analyze Rebalancing" to get personalized recommendations for your portfolio.
                </p>
                <PrimaryButton
                  onClick={handleAnalyzeRebalancing}
                  loading={isAnalyzing}
                  loadingText="Analyzing..."
                  leftIcon={<Calculator className="h-4 w-4" />}
                  className="robinhood-btn-primary"
                >
                  Analyze Rebalancing
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
