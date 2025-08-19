import { User, UserProfile } from '../types/auth'

// Mock user data for development
const mockUsers: User[] = [
  {
    id: '1',
    email: 'demo@quantflow.com',
    full_name: 'Demo User',
    risk_tolerance: 'moderate',
    investment_goals: ['Retirement', 'Wealth Building'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

let currentUser: User | null = null

export const mockAuth = {
  // Mock sign up
  signUp: async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if user already exists
    const existingUser = mockUsers.find(user => user.email === email)
    if (existingUser) {
      return { data: null, error: { message: 'User already exists' } }
    }

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email,
      full_name: email.split('@')[0], // Use email prefix as name
      risk_tolerance: 'moderate',
      investment_goals: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    mockUsers.push(newUser)
    currentUser = newUser

    return { data: { user: newUser }, error: null }
  },

  // Mock sign in
  signIn: async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For demo purposes, accept any password for demo@quantflow.com
    if (email === 'demo@quantflow.com') {
      const user = mockUsers.find(u => u.email === email)
      if (user) {
        currentUser = user
        return { data: { user }, error: null }
      }
    }

    return { data: null, error: { message: 'Invalid credentials' } }
  },

  // Mock sign out
  signOut: async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    currentUser = null
    return { error: null }
  },

  // Mock get current user
  getCurrentUser: async () => {
    // Simulate the Supabase auth structure
    if (currentUser) {
      return { 
        data: { user: currentUser }, 
        error: null 
      }
    } else {
      return { 
        data: { user: null }, 
        error: null 
      }
    }
  },

  // Mock auth state change listener
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Simulate initial auth state
    setTimeout(() => {
      if (currentUser) {
        callback('SIGNED_IN', { user: currentUser })
      } else {
        callback('SIGNED_OUT', null)
      }
    }, 100)
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    }
  }
}

export const mockUserProfileService = {
  // Mock get user profile
  async getUserProfile(userId: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return mockUsers.find(user => user.id === userId) || null
  },

  // Mock update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const userIndex = mockUsers.findIndex(user => user.id === userId)
    if (userIndex === -1) return null

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    if (currentUser?.id === userId) {
      currentUser = mockUsers[userIndex]
    }

    return mockUsers[userIndex]
  },

  // Mock create user profile
  async createUserProfile(userId: string, email: string, fullName?: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const newUser: User = {
      id: userId,
      email,
      full_name: fullName || email.split('@')[0],
      risk_tolerance: 'moderate',
      investment_goals: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    mockUsers.push(newUser)
    return newUser
  }
}
