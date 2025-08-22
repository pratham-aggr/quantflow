import { supabase } from './supabase'
import { userProfileService } from './userProfile'
import { trackLoginOperation, trackProfileOperation } from './performance'

// Login data interface
interface LoginData {
  email: string
  password: string
}

// Login result interface
interface LoginResult {
  success: boolean
  error?: string
  user?: any
  session?: any
}

// Cache for user profiles to reduce database calls
const userProfileCache = new Map<string, any>()

// Validation functions
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required'
  if (password.length < 1) return 'Password is required'
  return null
}

// Main login service
export const loginService = {
  async loginUser(data: LoginData): Promise<LoginResult> {
    return trackLoginOperation('loginUser', async () => {
      try {
        // Step 1: Validate input data
        const emailError = validateEmail(data.email)
        if (emailError) {
          return {
            success: false,
            error: emailError
          }
        }

        const passwordError = validatePassword(data.password)
        if (passwordError) {
          return {
            success: false,
            error: passwordError
          }
        }

        // Step 2: Attempt authentication with Supabase (with timeout)
        const authPromise = supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        })

        const authTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout')), 5000)
        )

        const { data: authData, error: authError } = await Promise.race([authPromise, authTimeout]) as any

        if (authError) {
          // Handle specific authentication errors
          if (authError.message.includes('Invalid login credentials')) {
            return {
              success: false,
              error: 'Invalid email or password'
            }
          }
          if (authError.message.includes('Email not confirmed')) {
            return {
              success: false,
              error: 'Please check your email and confirm your account before logging in'
            }
          }
          if (authError.message.includes('Too many requests')) {
            return {
              success: false,
              error: 'Too many login attempts. Please try again later'
            }
          }
          
          return {
            success: false,
            error: authError.message
          }
        }

        if (!authData.user) {
          return {
            success: false,
            error: 'Authentication failed. Please try again'
          }
        }

        // Step 3: Get user profile data (with caching and timeout)
        let userProfile = userProfileCache.get(authData.user.id)
        
        if (!userProfile) {
          const profilePromise = userProfileService.getUserProfile(authData.user.id)
          const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
          )
          
          try {
            userProfile = await Promise.race([profilePromise, profileTimeout])
            if (userProfile) {
              // Cache the profile for future use
              userProfileCache.set(authData.user.id, userProfile)
            }
          } catch (error) {
            console.warn('Profile fetch failed, continuing with auth data:', error)
            userProfile = null
          }
        }
        
        if (!userProfile) {
          // If profile doesn't exist, create a default one (async, don't wait)
          console.warn('User profile not found, creating default profile')
          userProfileService.createUserProfile(
            authData.user.id,
            authData.user.email!,
            (authData.user as any).user_metadata?.full_name
          ).then(newProfile => {
            if (newProfile) {
              userProfileCache.set(authData.user.id, newProfile)
            }
          }).catch(error => {
            console.error('Failed to create user profile:', error)
          })
        }

        // Step 4: Return success with user data and session
        return {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email,
            full_name: userProfile?.full_name || (authData.user as any).user_metadata?.full_name,
            risk_tolerance: userProfile?.risk_tolerance || 'moderate',
            investment_goals: userProfile?.investment_goals || [],
            created_at: userProfile?.created_at || authData.user.created_at,
            updated_at: userProfile?.updated_at || authData.user.updated_at
          },
          session: authData.session
        }

      } catch (error) {
        console.error('Login error:', error)
        return {
          success: false,
          error: 'An unexpected error occurred during login'
        }
      }
    })
  },

  // Get current session (optimized)
  async getCurrentSession(): Promise<{ session: any; user: any } | null> {
    return trackLoginOperation('getCurrentSession', async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          return null
        }

        // Check cache first
        let userProfile = userProfileCache.get(session.user.id)
        
        if (!userProfile) {
          userProfile = await trackProfileOperation('getUserProfile', () => 
            userProfileService.getUserProfile(session.user.id)
          )
          if (userProfile) {
            userProfileCache.set(session.user.id, userProfile)
          }
        }
        
        return {
          session,
          user: {
            id: session.user.id,
            email: session.user.email,
            full_name: userProfile?.full_name || (session.user as any).user_metadata?.full_name,
            risk_tolerance: userProfile?.risk_tolerance || 'moderate',
            investment_goals: userProfile?.investment_goals || [],
            created_at: userProfile?.created_at || session.user.created_at,
            updated_at: userProfile?.updated_at || session.user.updated_at
          }
        }
      } catch (error) {
        console.error('Error getting current session:', error)
        return null
      }
    })
  },

  // Clear cache for a user (useful for logout)
  clearUserCache(userId?: string) {
    if (userId) {
      userProfileCache.delete(userId)
    } else {
      userProfileCache.clear()
    }
  },

  // Refresh session (handled automatically by Supabase)
  async refreshSession(): Promise<boolean> {
    return trackLoginOperation('refreshSession', async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('Session refresh error:', error)
          return false
        }
        return !!data.session
      } catch (error) {
        console.error('Session refresh error:', error)
        return false
      }
    })
  },

  // Logout user
  async logoutUser(): Promise<{ success: boolean; error?: string }> {
    return trackLoginOperation('logoutUser', async () => {
      try {
        const { error } = await supabase.auth.signOut()
        
        if (error) {
          return {
            success: false,
            error: error.message
          }
        }

        // Clear cache on logout
        this.clearUserCache()

        return {
          success: true
        }
      } catch (error) {
        console.error('Logout error:', error)
        return {
          success: false,
          error: 'An unexpected error occurred during logout'
        }
      }
    })
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    return trackLoginOperation('isAuthenticated', async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        return !!user
      } catch (error) {
        console.error('Authentication check error:', error)
        return false
      }
    })
  },

  // Get JWT token (for API calls)
  async getJWTToken(): Promise<string | null> {
    return trackLoginOperation('getJWTToken', async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
      } catch (error) {
        console.error('Error getting JWT token:', error)
        return null
      }
    })
  },

  // Validate JWT token
  async validateToken(token: string): Promise<boolean> {
    return trackLoginOperation('validateToken', async () => {
      try {
        const { data, error } = await supabase.auth.getUser(token)
        return !error && !!data.user
      } catch (error) {
        console.error('Token validation error:', error)
        return false
      }
    })
  }
}
