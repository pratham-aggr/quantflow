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

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current user session
        const { data: { user }, error } = await auth.getUser()
        
        if (error) {
          console.error('Error getting current user:', error)
          // Don't set error state for auth session missing - this is normal for new users
          if (error.message.includes('Auth session missing')) {
            setState({ user: null, loading: false, error: null })
          } else {
            setState({ user: null, loading: false, error: error.message })
          }
          return
        }

        const supabaseUser = user

        if (supabaseUser) {
          // Fetch user profile from database
          const userProfile = await userProfileService.getUserProfile(supabaseUser.id)
          
          if (userProfile) {
            setState({
              user: {
                id: supabaseUser.id,
                email: supabaseUser.email!,
                full_name: userProfile.full_name,
                risk_tolerance: userProfile.risk_tolerance,
                investment_goals: userProfile.investment_goals,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at
              },
              loading: false,
              error: null
            })
          } else {
            console.warn('User profile not found, creating default profile')
            // Create a default profile if none exists
            const newProfile = await userProfileService.createUserProfile(
              supabaseUser.id,
              supabaseUser.email!,
              (supabaseUser as any).user_metadata?.full_name
            )
            if (newProfile) {
              setState({
                user: {
                  id: supabaseUser.id,
                  email: supabaseUser.email!,
                  full_name: newProfile.full_name,
                  risk_tolerance: newProfile.risk_tolerance,
                  investment_goals: newProfile.investment_goals,
                  created_at: newProfile.created_at,
                  updated_at: newProfile.updated_at
                },
                loading: false,
                error: null
              })
            } else {
              setState({ user: null, loading: false, error: 'Failed to create user profile' })
            }
          }
        } else {
          // No user session - this is normal for new visitors
          setState({ user: null, loading: false, error: null })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setState({ user: null, loading: false, error: 'Authentication initialization failed' })
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await userProfileService.getUserProfile(session.user.id)
          if (userProfile) {
            setState({
              user: {
                id: session.user.id,
                email: session.user.email!,
                full_name: userProfile.full_name,
                risk_tolerance: userProfile.risk_tolerance,
                investment_goals: userProfile.investment_goals,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at
              },
              loading: false,
              error: null
            })
          } else {
            // Create profile if it doesn't exist
            const newProfile = await userProfileService.createUserProfile(
              session.user.id,
              session.user.email!,
              (session.user as any).user_metadata?.full_name
            )
            if (newProfile) {
              setState({
                user: {
                  id: session.user.id,
                  email: session.user.email!,
                  full_name: newProfile.full_name,
                  risk_tolerance: newProfile.risk_tolerance,
                  investment_goals: newProfile.investment_goals,
                  created_at: newProfile.created_at,
                  updated_at: newProfile.updated_at
                },
                loading: false,
                error: null
              })
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT detected')
          setState({ user: null, loading: false, error: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Handle token refresh
          const userProfile = await userProfileService.getUserProfile(session.user.id)
          if (userProfile) {
            setState(prev => ({
              ...prev,
              user: {
                id: session.user.id,
                email: session.user.email!,
                full_name: userProfile.full_name,
                risk_tolerance: userProfile.risk_tolerance,
                investment_goals: userProfile.investment_goals,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at
              }
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

  // Login function
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

  // Register function
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
        // Create user profile
        const userProfile = await userProfileService.createUserProfile(
          data.user.id, 
          credentials.email, 
          credentials.full_name
        )
        
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

  // Logout function
  const logout = async () => {
    console.log('Logout initiated')
    setState(prev => ({ ...prev, loading: true }))
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Logout timeout - forcing state clear')
      setState({ user: null, loading: false, error: null })
    }, 5000) // 5 second timeout
    
    try {
      // Call Supabase auth directly for logout
      console.log('Calling Supabase signOut...')
      const { error } = await auth.signOut()
      
      clearTimeout(timeoutId) // Clear timeout if logout succeeds
      
      if (error) {
        console.error('Logout error:', error)
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message || 'Logout failed. Please try again.' 
        }))
      } else {
        // Clear the state immediately
        console.log('Logout successful, clearing state')
        setState({ user: null, loading: false, error: null })
      }
    } catch (error) {
      console.error('Logout error:', error)
      clearTimeout(timeoutId) // Clear timeout if there's an error
      // Even if there's an error, clear the user state
      setState({ user: null, loading: false, error: null })
    }
  }

  // Update profile function
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
    updateProfile
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
