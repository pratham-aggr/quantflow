// Performance monitoring utility for tracking login and auth operations

interface PerformanceMetric {
  operation: string
  startTime: number
  endTime?: number
  duration?: number
  success?: boolean
  error?: string
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean = process.env.NODE_ENV === 'development'

  startTimer(operation: string): string {
    if (!this.enabled) return ''
    
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.metrics.set(id, {
      operation,
      startTime: performance.now()
    })
    
    console.log(`🚀 Starting: ${operation}`)
    return id
  }

  endTimer(id: string, success: boolean = true, error?: string): void {
    if (!this.enabled || !id) return
    
    const metric = this.metrics.get(id)
    if (!metric) return
    
    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = success
    metric.error = error
    
    const status = success ? '✅' : '❌'
    console.log(`${status} ${metric.operation}: ${metric.duration.toFixed(2)}ms`)
    
    if (error) {
      console.error(`Error in ${metric.operation}:`, error)
    }
    
    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`)
    }
    
    this.metrics.delete(id)
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  clearMetrics(): void {
    this.metrics.clear()
  }

  // Convenience method for async operations
  async trackAsync<T>(
    operation: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    const id = this.startTimer(operation)
    
    try {
      const result = await asyncFn()
      this.endTimer(id, true)
      return result
    } catch (error) {
      this.endTimer(id, false, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Convenience functions for common operations
export const trackAuthOperation = <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.trackAsync(`Auth: ${operation}`, fn)
}

export const trackLoginOperation = <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.trackAsync(`Login: ${operation}`, fn)
}

export const trackProfileOperation = <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.trackAsync(`Profile: ${operation}`, fn)
}
