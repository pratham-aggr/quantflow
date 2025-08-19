import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  enabled?: boolean
  interval?: number // in milliseconds
  onRefresh: () => void | Promise<void>
}

export const useAutoRefresh = ({
  enabled = true,
  interval = 30000, // 30 seconds default
  onRefresh
}: UseAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('Skipping refresh - already in progress')
      return // Prevent concurrent refreshes
    }
    
    console.log('Starting auto-refresh...')
    isRefreshingRef.current = true
    try {
      await onRefresh()
      console.log('Auto-refresh completed successfully')
    } catch (error) {
      console.error('Auto-refresh error:', error)
    } finally {
      isRefreshingRef.current = false
      console.log('Auto-refresh finished')
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial refresh
    refresh()

    // Set up interval
    intervalRef.current = setInterval(() => {
      refresh()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, refresh])

  return {
    refresh,
    isEnabled: enabled
  }
}
