// Portfolio API Service with retry logic and error handling

interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  [key: string]: any
}

class PortfolioApiService {
  private serverUrl: string
  private maxRetries = 3
  private retryDelay = 1000 // 1 second base delay

  constructor() {
    this.serverUrl = process.env.REACT_APP_BACKEND_API_URL || ''
    
    if (!this.serverUrl) {
      console.warn('⚠️ Backend API URL not configured. Portfolio features will not be available.')
    } else {
      console.log('✅ Portfolio API service initialized with backend:', this.serverUrl)
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: string = 'POST', 
    body?: any
  ): Promise<ApiResponse<T>> {
    if (!this.serverUrl) {
      throw new Error('Backend API URL not configured')
    }

    const url = `${this.serverUrl}${endpoint}`
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
          if (response.status === 502) {
            // For 502 errors, retry after a delay
            if (attempt < this.maxRetries - 1) {
              const delay = this.retryDelay * Math.pow(2, attempt) // Exponential backoff
              console.warn(`⚠️ Backend temporarily unavailable (502), retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
            throw new Error('Backend temporarily unavailable - please try again later')
          }
          
          if (response.status === 429) {
            throw new Error('Rate limit exceeded - please try again later')
          }
          
          if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}))
            if (errorData.error && errorData.error.includes('Rate limited')) {
              throw new Error('Rate limited - please try again later')
            }
            throw new Error('Server error - please try again later')
          }
          
          throw new Error(`API request failed: ${response.status}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error as Error
        
        // Only retry on network errors or 502 errors
        if (attempt < this.maxRetries - 1 && 
            ((error as Error).message.includes('Backend temporarily unavailable') ||
             (error as Error).message.includes('fetch'))) {
          const delay = this.retryDelay * Math.pow(2, attempt)
          console.warn(`⚠️ Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        throw error
      }
    }
    
    throw lastError || new Error('Request failed after all retries')
  }

  async getCumulativeReturns(holdings: any[], benchmark: string = 'SPY', period: string = '1y'): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/portfolio/cumulative-returns', 'POST', {
      holdings,
      benchmark,
      period
    })
  }

  async getDrawdowns(holdings: any[], period: string = '1y'): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/portfolio/drawdowns', 'POST', {
      holdings,
      period
    })
  }

  async getVolatilityComparison(holdings: any[], period: string = '1y'): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/risk/volatility-comparison', 'POST', {
      holdings,
      period
    })
  }

  async getMonteCarloSimulation(holdings: any[], period: string = '1y', simulations: number = 1000): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/portfolio/monte-carlo', 'POST', {
      holdings,
      period,
      simulations,
      timeSteps: 252
    })
  }

  isConfigured(): boolean {
    return !!this.serverUrl
  }
}

// Create and export a singleton instance
export const portfolioApiService = new PortfolioApiService()
export default portfolioApiService
