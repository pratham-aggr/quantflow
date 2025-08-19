import { loginService } from './loginService'

// JWT Token management utilities
export const jwtUtils = {
  // Get JWT token for API calls
  async getAuthToken(): Promise<string | null> {
    return await loginService.getJWTToken()
  },

  // Create authorization header for API calls
  async getAuthHeader(): Promise<{ Authorization: string } | null> {
    const token = await this.getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : null
  },

  // Validate JWT token
  async validateToken(token: string): Promise<boolean> {
    return await loginService.validateToken(token)
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    return await loginService.isAuthenticated()
  },

  // Refresh session token
  async refreshToken(): Promise<boolean> {
    return await loginService.refreshSession()
  },

  // Decode JWT token (client-side, for basic info only)
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decoding JWT token:', error)
      return null
    }
  },

  // Get token expiration time
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token)
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000)
    }
    return null
  },

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token)
    if (!expiration) return true
    return new Date() > expiration
  },

  // Auto-refresh token if needed
  async ensureValidToken(): Promise<string | null> {
    const token = await this.getAuthToken()
    if (!token) return null

    if (this.isTokenExpired(token)) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        return await this.getAuthToken()
      }
      return null
    }

    return token
  }
}

// API client with automatic JWT authentication
export const createAuthenticatedApiClient = () => {
  return {
    async request(url: string, options: RequestInit = {}): Promise<Response> {
      const authHeader = await jwtUtils.getAuthHeader()
      
      const headers = {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers
      }

      return fetch(url, {
        ...options,
        headers
      })
    },

    async get(url: string): Promise<Response> {
      return this.request(url, { method: 'GET' })
    },

    async post(url: string, data: any): Promise<Response> {
      return this.request(url, {
        method: 'POST',
        body: JSON.stringify(data)
      })
    },

    async put(url: string, data: any): Promise<Response> {
      return this.request(url, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    },

    async delete(url: string): Promise<Response> {
      return this.request(url, { method: 'DELETE' })
    }
  }
}
