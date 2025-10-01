import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '../lib/supabase'
import { userProfileService } from '../lib/userProfile'
import { loginService } from '../lib/loginService'
import { cleanupService } from '../lib/cleanupService'
import { 
  AuthContextType, 
  AuthState, 
  LoginCredentials, 
  RegisterCredentials, 
  UserProfile 
} from '../types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  // Add a force reset function
  const forceResetAuth = () => {
    console.log('🔄 Force resetting auth state')
    setState({ user: null, loading: false, error: null })
  }

  // Initialize auth state on mount (optimized)
  useEffect(() => {
    // Reduced timeout for faster loading
    const globalTimeout = setTimeout(() => {
      console.log('🛑 Global auth timeout - forcing loading to false')
      setState({ user: null, loading: false, error: null })
    }, 1500) // Reduced to 1.5 seconds for faster perceived loading

    const initializeAuth = async () => {
      try {
        // Use the optimized login service for session retrieval with timeout
        const sessionPromise = loginService.getCurrentSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 1000)
        )
        
        const sessionData = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (sessionData?.user) {
          setState({
            user: sessionData.user,
            loading: false,
            error: null
          })
        } else {
          // No user session - this is normal for new visitors
          setState({ user: null, loading: false, error: null })
        }
      } catch (error) {
        console.log('AuthContext: Error during initialization - setting loading to false', error)
        setState({ user: null, loading: false, error: null })
      } finally {
        // Clear the global timeout since we're done
        clearTimeout(globalTimeout)
      }
    }

    initializeAuth()

    // Listen for auth state changes (simplified to prevent infinite loops)
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          // Don't call getCurrentSession again - use the session data directly
          // The login function already handles setting the user state
          console.log('User signed in, state will be updated by login function')
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT detected')
          loginService.clearUserCache() // Clear cache on sign out
          setState({ user: null, loading: false, error: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Only update if we don't already have the user
          setState(prev => {
            if (!prev.user || prev.user.id !== session.user.id) {
              return {
                ...prev,
                user: {
                  id: session.user.id,
                  email: session.user.email!,
                  full_name: prev.user?.full_name || (session.user as any).user_metadata?.full_name,
                  risk_tolerance: prev.user?.risk_tolerance || 'moderate',
                  investment_goals: prev.user?.investment_goals || [],
                  created_at: prev.user?.created_at || session.user.created_at,
                  updated_at: prev.user?.updated_at || session.user.updated_at
                }
              }
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        // Don't set error state for auth state changes, just log it
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Login function (optimized)
  const login = async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    // Add a timeout to prevent infinite loading
    const loginTimeout = setTimeout(() => {
      console.log('🛑 Login timeout - forcing loading to false')
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Login timed out. Please try again.' 
      }))
    }, 8000) // Reduced to 8 seconds for faster feedback
    
    try {
      const result = await loginService.loginUser({
        email: credentials.email,
        password: credentials.password
      })
      
      clearTimeout(loginTimeout) // Clear timeout if login succeeds
      
      if (result.success && result.user) {
        setState({
          user: result.user,
          loading: false,
          error: null
        })
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Login failed. Please try again.' 
        }))
      }
    } catch (error) {
      console.error('Login error:', error)
      clearTimeout(loginTimeout) // Clear timeout if there's an error
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Login failed. Please try again.' 
      }))
    }
  }

  // Register function (optimized)
  const register = async (credentials: RegisterCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { data, error } = await auth.signUp({
        email: credentials.email,
        password: credentials.password
      })
      
      if (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }))
        return
      }

      if (data?.user) {
        const user = data.user // Store reference to avoid null issues
        
        // Create user profile (async, don't wait for completion)
        userProfileService.createUserProfile(
          user.id, 
          credentials.email, 
          credentials.full_name
        ).then(userProfile => {
          if (userProfile) {
            setState({
              user: {
                id: user.id,
                email: user.email!,
                full_name: userProfile.full_name,
                risk_tolerance: userProfile.risk_tolerance,
                investment_goals: userProfile.investment_goals,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at
              },
              loading: false,
              error: null
            })
          }
        }).catch(error => {
          console.error('Profile creation error:', error)
          // Still set user state even if profile creation fails
          setState({
            user: {
              id: user.id,
              email: user.email!,
              full_name: credentials.full_name,
              risk_tolerance: 'moderate',
              investment_goals: [],
              created_at: user.created_at,
              updated_at: user.updated_at
            },
            loading: false,
            error: null
          })
        })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Registration failed. Please try again.' 
      }))
    }
  }

  // Logout function (optimized)
  const logout = async () => {
    console.log('Logout initiated')
    setState(prev => ({ ...prev, loading: true }))
    
    // Reduced timeout for faster logout
    const timeoutId = setTimeout(() => {
      console.log('Logout timeout - forcing state clear')
      setState({ user: null, loading: false, error: null })
    }, 2000) // Reduced to 2 seconds
    
    try {
      // Clear any cached data and stop background processes first
      if (typeof window !== 'undefined') {
        // Clear all storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc()
        }
      }
      
      // Use the centralized cleanup service
      cleanupService.cleanup()
      
      // Use the optimized logout service
      const result = await loginService.logoutUser()
      
      clearTimeout(timeoutId) // Clear timeout if logout succeeds
      
      if (result.success) {
        // Clear the state immediately
        console.log('Logout successful, clearing state')
        setState({ user: null, loading: false, error: null })
      } else {
        // Even if logout fails, clear the user state to prevent 403 errors
        console.log('Logout service failed, but clearing user state to prevent 403 errors')
        setState({ user: null, loading: false, error: null })
      }
    } catch (error) {
      console.error('Logout error:', error)
      clearTimeout(timeoutId) // Clear timeout if there's an error
      // Even if there's an error, clear the user state to prevent 403 errors
      setState({ user: null, loading: false, error: null })
    }
  }

  // Update profile function (optimized)
  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!state.user) {
      setState(prev => ({ 
        ...prev, 
        error: 'No user logged in' 
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const updatedProfile = await userProfileService.updateUserProfile(state.user.id, profile)
      
      if (updatedProfile) {
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            risk_tolerance: updatedProfile.risk_tolerance,
            investment_goals: updatedProfile.investment_goals,
            updated_at: updatedProfile.updated_at
          },
          loading: false,
          error: null
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Failed to update profile' 
        }))
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Profile update failed. Please try again.' 
      }))
    }
  }

  const value: AuthContextType = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateProfile,
    forceResetAuth // Add this to the context
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
