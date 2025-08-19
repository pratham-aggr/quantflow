import { useState, useCallback, useMemo } from 'react'
import { marketDataService, StockQuote } from '../lib/marketDataService'
import { useAutoRefresh } from './useAutoRefresh'

interface UseSafeStockPricesOptions {
  symbols: string[]
  autoRefresh?: boolean
  refreshInterval?: number
  enabled?: boolean
}

interface UseSafeStockPricesReturn {
  data: Record<string, StockQuote>
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

export const useSafeStockPrices = ({
  symbols,
  autoRefresh = false,
  refreshInterval = 30000,
  enabled = true
}: UseSafeStockPricesOptions): UseSafeStockPricesReturn => {
  const [data, setData] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Memoize symbols string to prevent unnecessary re-renders
  const symbolsKey = useMemo(() => symbols.join(','), [symbols])

  const fetchPrices = useCallback(async () => {
    if (!enabled || symbols.length === 0) {
      console.log('Skipping fetch - enabled:', enabled, 'symbols length:', symbols.length)
      return
    }

    console.log('Starting to fetch stock prices for symbols:', symbols)
    setLoading(true)
    setError(null)

    try {
      console.log('Calling marketDataService.getMultipleQuotes with:', symbols)
      const quotes = await marketDataService.getMultipleQuotes(symbols)
      console.log('Successfully received quotes:', quotes)
      
      setData(quotes)
      setLastUpdated(new Date())
      setError(null)
      console.log('Stock prices updated successfully')
    } catch (err: any) {
      console.error('Error fetching stock prices:', err)
      console.error('Error details:', err.message, err.stack)
      setError(err.message || 'Failed to fetch stock prices')
    } finally {
      setLoading(false)
      console.log('Fetch completed, loading set to false')
    }
  }, [symbolsKey, enabled])

  // Use the safe auto-refresh hook
  useAutoRefresh({
    enabled: autoRefresh && enabled,
    interval: refreshInterval,
    onRefresh: fetchPrices
  })

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchPrices
  }
}
