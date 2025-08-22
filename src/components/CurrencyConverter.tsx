import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowUpDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Globe,
  Calculator,
  Clock,
  DollarSign
} from 'lucide-react'
import { marketDataService, CurrencyExchange } from '../lib/marketDataService'
import { useToast } from './Toast'

interface CurrencyConverterProps {
  defaultFromCurrency?: string
  defaultToCurrency?: string
  defaultAmount?: number
  showTrends?: boolean
  showHistory?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const MAJOR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
  { code: 'EUR', name: 'Euro', symbol: '€', icon: DollarSign },
  { code: 'GBP', name: 'British Pound', symbol: '£', icon: DollarSign },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', icon: DollarSign },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: DollarSign },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', icon: DollarSign },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', icon: DollarSign },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', icon: DollarSign },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', icon: DollarSign },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', icon: DollarSign }
]

interface ExchangeRateHistory {
  timestamp: number
  rate: number
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  defaultFromCurrency = 'USD',
  defaultToCurrency = 'EUR',
  defaultAmount = 1000,
  showTrends = true,
  showHistory = false,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}) => {
  const [fromCurrency, setFromCurrency] = useState(defaultFromCurrency)
  const [toCurrency, setToCurrency] = useState(defaultToCurrency)
  const [amount, setAmount] = useState(defaultAmount)
  const [exchangeRate, setExchangeRate] = useState<CurrencyExchange | null>(null)
  const [rateHistory, setRateHistory] = useState<ExchangeRateHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { error: showError } = useToast()

  // Calculate converted amount
  const convertedAmount = useMemo(() => {
    if (!exchangeRate || !amount) return 0
    return amount * exchangeRate.rate
  }, [amount, exchangeRate])

  // Calculate trend from history
  const trend = useMemo(() => {
    if (rateHistory.length < 2) return null
    
    const latest = rateHistory[rateHistory.length - 1]
    const previous = rateHistory[rateHistory.length - 2]
    
    if (!latest || !previous) return null
    
    const change = latest.rate - previous.rate
    const changePercent = (change / previous.rate) * 100
    
    return {
      change,
      changePercent,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    }
  }, [rateHistory])

  // Fetch exchange rate
  const fetchExchangeRate = async () => {
    if (fromCurrency === toCurrency) {
      setExchangeRate({
        base: fromCurrency,
        target: toCurrency,
        rate: 1,
        timestamp: Date.now()
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rate = await marketDataService.getCurrencyExchange(fromCurrency, toCurrency)
      
      if (rate) {
        setExchangeRate(rate)
        setLastUpdated(new Date())
        
        // Add to history for trend analysis
        if (showTrends) {
          setRateHistory(prev => {
            const newHistory = [...prev, { timestamp: rate.timestamp, rate: rate.rate }]
            // Keep only last 24 hours of data
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000)
            return newHistory.filter(item => item.timestamp >= dayAgo)
          })
        }
      } else {
        setError(`Exchange rate not available for ${fromCurrency}/${toCurrency}. This currency pair may not be supported by the free API plan.`)
        showError('Rate Error', `Exchange rate not available for ${fromCurrency}/${toCurrency}`)
      }
    } catch (err) {
      setError('Failed to fetch exchange rate')
      showError('Connection Error', 'Failed to connect to exchange rate service')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchExchangeRate, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fromCurrency, toCurrency])

  // Fetch rate when currencies change
  useEffect(() => {
    fetchExchangeRate()
  }, [fromCurrency, toCurrency])

  // Swap currencies
  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setRateHistory([]) // Clear history when swapping
  }

  // Get currency icon
  const getCurrencyIcon = (currencyCode: string) => {
    const currency = MAJOR_CURRENCIES.find(c => c.code === currencyCode)
    return currency?.icon || Globe
  }

  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    const currency = MAJOR_CURRENCIES.find(c => c.code === currencyCode)
    return currency?.symbol || currencyCode
  }

  // Format number with currency
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Currency Converter</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastUpdated && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={fetchExchangeRate}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Rate"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate && !error && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-700">
              1 {fromCurrency} = {exchangeRate.rate.toFixed(6)} {toCurrency}
            </div>
            
            {showTrends && trend && (
              <div className={`flex items-center text-sm font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.direction === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
                {trend.direction === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
                {trend.changePercent >= 0 ? '+' : ''}{trend.changePercent.toFixed(4)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Converter Interface */}
      <div className="p-4 space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Currency Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* From Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <div className="relative">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                {MAJOR_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {React.createElement(getCurrencyIcon(fromCurrency), { className: "w-5 h-5 text-gray-400" })}
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              title="Swap Currencies"
            >
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <div className="relative">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                {MAJOR_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {React.createElement(getCurrencyIcon(toCurrency), { className: "w-5 h-5 text-gray-400" })}
              </div>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {!loading && !error && exchangeRate && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Converted Amount</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(convertedAmount, toCurrency)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {getCurrencySymbol(fromCurrency)}{amount.toLocaleString()} = {getCurrencySymbol(toCurrency)}{convertedAmount.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 text-center mb-3">
              {error}
            </div>
            <div className="text-sm text-red-700 text-center">
              <p className="mb-2">Try these common currency pairs that are usually available:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { from: 'USD', to: 'EUR' },
                  { from: 'USD', to: 'GBP' },
                  { from: 'EUR', to: 'USD' },
                  { from: 'GBP', to: 'USD' },
                  { from: 'USD', to: 'JPY' },
                  { from: 'USD', to: 'CAD' }
                ].map((pair) => (
                  <button
                    key={`${pair.from}-${pair.to}`}
                    onClick={() => {
                      setFromCurrency(pair.from)
                      setToCurrency(pair.to)
                      setError(null)
                    }}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-red-800 transition-colors"
                  >
                    {pair.from}/{pair.to}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Display */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Fetching exchange rate...</span>
            </div>
          </div>
        )}

        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 mr-2">Quick amounts:</span>
          {[100, 500, 1000, 5000, 10000].map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => setAmount(quickAmount)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                amount === quickAmount
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getCurrencySymbol(fromCurrency)}{quickAmount.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Rate History (if enabled) */}
        {showHistory && rateHistory.length > 1 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Rate History (24h)</h4>
            <div className="space-y-1">
              {rateHistory.slice(-5).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">
                    {item.rate.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-refresh Status */}
        {autoRefresh && (
          <div className="text-center text-xs text-gray-500">
            Auto-refreshing every {Math.floor(refreshInterval / 1000)} seconds
          </div>
        )}
      </div>
    </div>
  )
}
