// Performance Monitoring Service
interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private completedMetrics: PerformanceMetric[] = []

  // Start tracking a performance metric
  start(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    }
    
    this.metrics.set(id, metric)
    console.log(`🚀 Started tracking: ${name}`)
    return id
  }

  // End tracking a performance metric
  end(id: string): number | null {
    const metric = this.metrics.get(id)
    if (!metric) {
      console.warn(`Performance metric not found: ${id}`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    this.completedMetrics.push(metric)
    this.metrics.delete(id)

    console.log(`✅ Completed: ${metric.name} in ${duration.toFixed(2)}ms`)
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${metric.name} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  // Track an async operation
  async trackAsync<T>(
    name: string, 
    operation: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.start(name, metadata)
    try {
      const result = await operation()
      this.end(id)
      return result
    } catch (error) {
      this.end(id)
      throw error
    }
  }

  // Track a synchronous operation
  trackSync<T>(
    name: string, 
    operation: () => T, 
    metadata?: Record<string, any>
  ): T {
    const id = this.start(name, metadata)
    try {
      const result = operation()
      this.end(id)
      return result
    } catch (error) {
      this.end(id)
      throw error
    }
  }

  // Get performance summary
  getSummary(): {
    totalOperations: number
    averageDuration: number
    slowOperations: PerformanceMetric[]
    recentOperations: PerformanceMetric[]
  } {
    const recent = this.completedMetrics.slice(-10)
    const durations = this.completedMetrics.map(m => m.duration || 0)
    const averageDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0
    
    const slowOperations = this.completedMetrics.filter(m => (m.duration || 0) > 1000)

    return {
      totalOperations: this.completedMetrics.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowOperations,
      recentOperations: recent
    }
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear()
    this.completedMetrics = []
    console.log('🧹 Performance metrics cleared')
  }

  // Get metrics for a specific operation
  getMetricsForOperation(name: string): PerformanceMetric[] {
    return this.completedMetrics.filter(m => m.name === name)
  }

  // Log performance summary
  logSummary(): void {
    const summary = this.getSummary()
    console.log('📊 Performance Summary:', {
      'Total Operations': summary.totalOperations,
      'Average Duration': `${summary.averageDuration}ms`,
      'Slow Operations': summary.slowOperations.length,
      'Recent Operations': summary.recentOperations.map(m => ({
        name: m.name,
        duration: `${m.duration?.toFixed(2)}ms`,
        metadata: m.metadata
      }))
    })
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

// Export for global access
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.performanceMonitor = performanceMonitor
}

export { performanceMonitor }
export default PerformanceMonitor

