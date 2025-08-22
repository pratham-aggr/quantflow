import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '../lib/supabase'
import { userProfileService } from '../lib/userProfile'
import { loginService } from '../lib/loginService'
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
    }, 2000) // Reduced to 2 seconds

    const initializeAuth = async () => {
      try {
        // Use the optimized login service for session retrieval
        const sessionData = await loginService.getCurrentSession()
        
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

    // Listen for auth state changes (optimized)
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          // Use cached profile data if available
          const sessionData = await loginService.getCurrentSession()
          if (sessionData?.user) {
            setState({
              user: sessionData.user,
              loading: false,
              error: null
            })
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT detected')
          loginService.clearUserCache() // Clear cache on sign out
          setState({ user: null, loading: false, error: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Handle token refresh (use cached data when possible)
          const sessionData = await loginService.getCurrentSession()
          if (sessionData?.user) {
            setState(prev => ({
              ...prev,
              user: sessionData.user
            }))
          }
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
    
    try {
      const result = await loginService.loginUser({
        email: credentials.email,
        password: credentials.password
      })
      
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
        // Create user profile (async, don't wait for completion)
        userProfileService.createUserProfile(
          data.user.id, 
          credentials.email, 
          credentials.full_name
        ).then(userProfile => {
          if (userProfile) {
            setState({
              user: {
                id: data.user.id,
                email: data.user.email!,
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
              id: data.user.id,
              email: data.user.email!,
              full_name: credentials.full_name,
              risk_tolerance: 'moderate',
              investment_goals: [],
              created_at: data.user.created_at,
              updated_at: data.user.updated_at
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
      // Use the optimized logout service
      const result = await loginService.logoutUser()
      
      clearTimeout(timeoutId) // Clear timeout if logout succeeds
      
      if (result.success) {
        // Clear the state immediately
        console.log('Logout successful, clearing state')
        setState({ user: null, loading: false, error: null })
        
        // Clear any cached data
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Logout failed. Please try again.' 
        }))
      }
    } catch (error) {
      console.error('Logout error:', error)
      clearTimeout(timeoutId) // Clear timeout if there's an error
      // Even if there's an error, clear the user state
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
