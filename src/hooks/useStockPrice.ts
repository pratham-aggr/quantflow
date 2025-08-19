import { useState, useEffect, useCallback, useRef } from 'react'
import { marketDataService, StockQuote } from '../lib/marketDataService'

interface UseStockPriceOptions {
  symbol: string
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  enabled?: boolean
}

interface UseStockPriceReturn {
  data: StockQuote | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  lastUpdated: Date | null
}

export const useStockPrice = ({
  symbol,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  enabled = true
}: UseStockPriceOptions): UseStockPriceReturn => {
  const [data, setData] = useState<StockQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!enabled || !symbol) return

    setLoading(true)
    setError(null)

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      
      const quote = await marketDataService.getStockQuote(symbol)
      
      if (quote) {
        setData(quote)
        setLastUpdated(new Date())
      } else {
        setError('No data available for this symbol')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return // Request was cancelled
      }
      
      console.error('Error fetching stock price:', err)
      setError(err.message || 'Failed to fetch stock price')
    } finally {
      setLoading(false)
    }
  }, [symbol, enabled])

  // Initial fetch
  useEffect(() => {
    fetchPrice()
  }, [fetchPrice])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      fetchPrice()
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, enabled, fetchPrice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchPrice,
    lastUpdated
  }
}

// Hook for multiple stock prices
interface UseMultipleStockPricesOptions {
  symbols: string[]
  autoRefresh?: boolean
  refreshInterval?: number
  enabled?: boolean
}

interface UseMultipleStockPricesReturn {
  data: Record<string, StockQuote>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  lastUpdated: Date | null
}

export const useMultipleStockPrices = ({
  symbols,
  autoRefresh = false,
  refreshInterval = 30000,
  enabled = true
}: UseMultipleStockPricesOptions): UseMultipleStockPricesReturn => {
  const [data, setData] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrices = useCallback(async () => {
    if (!enabled || symbols.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const quotes = await marketDataService.getMultipleQuotes(symbols)
      setData(quotes)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('Error fetching multiple stock prices:', err)
      setError(err.message || 'Failed to fetch stock prices')
    } finally {
      setLoading(false)
    }
  }, [symbols.join(','), enabled]) // Use symbols.join(',') to prevent array reference changes

  // Initial fetch
  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      fetchPrices()
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, enabled, fetchPrices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchPrices,
    lastUpdated
  }
}
