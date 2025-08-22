// Performance monitoring utility
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()

  startTimer(label: string): void {
    this.startTimes.set(label, performance.now())
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label)
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.startTimes.delete(label)

    // Store metric for averaging
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    this.metrics.get(label)!.push(duration)

    // Log if duration is concerning
    if (duration > 2000) {
      console.warn(`⚠️ Slow operation detected: ${label} took ${duration.toFixed(0)}ms`)
    } else if (duration > 1000) {
      console.info(`ℹ️ Moderate operation: ${label} took ${duration.toFixed(0)}ms`)
    }

    return duration
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label)
    if (!times || times.length === 0) return 0
    
    const sum = times.reduce((acc, time) => acc + time, 0)
    return sum / times.length
  }

  getMetrics(): Record<string, { average: number; count: number; last: number }> {
    const result: Record<string, { average: number; count: number; last: number }> = {}
    
    this.metrics.forEach((times, label) => {
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length,
        last: times[times.length - 1] || 0
      }
    })
    
    return result
  }

  clearMetrics(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }

  // Convenience method for async operations
  async timeAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
    this.startTimer(label)
    try {
      const result = await operation()
      this.endTimer(label)
      return result
    } catch (error) {
      this.endTimer(label)
      throw error
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    timeAsync: performanceMonitor.timeAsync.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor)
  }
}
