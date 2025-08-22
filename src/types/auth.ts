export interface User {
  id: string
  email: string
  full_name?: string
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
  investment_goals?: string[]
  created_at?: string
  updated_at?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  full_name: string
}

export interface UserProfile {
  full_name?: string
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
  investment_goals?: string[]
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  forceResetAuth: () => void // Add this
}
