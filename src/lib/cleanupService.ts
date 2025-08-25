import { cleanupMarketDataService } from './marketDataService'
import { portfolioService } from './portfolioService'
import { jwtUtils } from './jwtUtils'

/**
 * Global cleanup service to stop all background processes during logout
 * This prevents 403 errors from API calls made after the user logs out
 */
export const cleanupService = {
  /**
   * Clean up all services and stop background processes
   */
  cleanup(): void {
    console.log('🧹 Starting global cleanup...')
    
    try {
      // Clean up market data service (stops background refreshes, websockets, etc.)
      cleanupMarketDataService()
      
      // Clean up portfolio service
      portfolioService.cleanup()
      
      // Clean up JWT utils
      jwtUtils.cleanup()
      
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc()
        }
      }
      
      console.log('✅ Global cleanup completed successfully')
    } catch (error) {
      console.error('❌ Error during global cleanup:', error)
    }
  },

  /**
   * Clean up only specific services
   */
  cleanupMarketData(): void {
    cleanupMarketDataService()
  },

  cleanupPortfolio(): void {
    portfolioService.cleanup()
  },

  cleanupJWT(): void {
    jwtUtils.cleanup()
  }
}
