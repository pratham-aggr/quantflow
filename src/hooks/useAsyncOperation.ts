import React, { useState, useCallback, useRef, useEffect } from 'react'

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  onFinally?: () => void
  preventDuplicate?: boolean
  timeout?: number
}

interface UseAsyncOperationReturn<T> {
  execute: (...args: any[]) => Promise<T | null>
  loading: boolean
  error: Error | null
  data: T | null
  reset: () => void
}

export function useAsyncOperation<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)
  const isExecutingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
    isExecutingRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      // Prevent duplicate requests if preventDuplicate is true
      if (options.preventDuplicate && isExecutingRef.current) {
        return null
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setLoading(true)
      setError(null)
      isExecutingRef.current = true

      try {
        // Set timeout if specified
        if (options.timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutRef.current = setTimeout(() => {
              reject(new Error('Operation timed out'))
            }, options.timeout)
          })

          const result = await Promise.race([
            asyncFunction(...args),
            timeoutPromise
          ])

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          setData(result)
          options.onSuccess?.(result)
          return result
        } else {
          const result = await asyncFunction(...args)
          setData(result)
          options.onSuccess?.(result)
          return result
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred')
        setError(error)
        options.onError?.(error)
        return null
      } finally {
        setLoading(false)
        isExecutingRef.current = false
        options.onFinally?.()
      }
    },
    [asyncFunction, options]
  )

  return {
    execute,
    loading,
    error,
    data,
    reset
  }
}

// Specialized hooks for common use cases
export function useMutation<T = any>(
  mutationFn: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  return useAsyncOperation(mutationFn, {
    preventDuplicate: true,
    ...options
  })
}

export function useQuery<T = any>(
  queryFn: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> & { autoExecute?: boolean; deps?: any[] } = {}
) {
  const { autoExecute = false, deps = [], ...restOptions } = options
  
  const query = useAsyncOperation(queryFn, {
    timeout: 10000, // 10 second default timeout for queries
    ...restOptions
  })

  // Auto-execute on mount or when deps change
  useEffect(() => {
    if (autoExecute) {
      query.execute()
    }
  }, deps)

  return query
}

// Hook for optimistic updates
export function useOptimisticMutation<T = any, U = any>(
  mutationFn: (data: T) => Promise<U>,
  options: {
    onOptimisticUpdate?: (data: T) => void
    onRollback?: (data: T) => void
    onSuccess?: (result: U, originalData: T) => void
    onError?: (error: Error, originalData: T) => void
  } = {}
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [isOptimistic, setIsOptimistic] = useState(false)

  const execute = useCallback(
    async (data: T): Promise<U | null> => {
      // Apply optimistic update
      setIsOptimistic(true)
      setOptimisticData(data)
      options.onOptimisticUpdate?.(data)

      try {
        const result = await mutationFn(data)
        
        // Success - keep optimistic update
        setIsOptimistic(false)
        options.onSuccess?.(result, data)
        return result
      } catch (error) {
        // Error - rollback optimistic update
        setIsOptimistic(false)
        setOptimisticData(null)
        options.onRollback?.(data)
        options.onError?.(error instanceof Error ? error : new Error('Unknown error'), data)
        throw error
      }
    },
    [mutationFn, options]
  )

  return {
    execute,
    optimisticData,
    isOptimistic,
    reset: () => {
      setIsOptimistic(false)
      setOptimisticData(null)
    }
  }
}
