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

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
}
