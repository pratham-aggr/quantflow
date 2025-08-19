import { supabase } from './supabase'
import { userProfileService } from './userProfile'

// Validation schemas
interface RegistrationData {
  email: string
  password: string
  full_name: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Input validation functions
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) return 'Email is required'
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  if (email.length > 254) return 'Email is too long'
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password is too long'
  
  // Check for complexity requirements
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  if (!hasUpperCase) return 'Password must contain at least one uppercase letter'
  if (!hasLowerCase) return 'Password must contain at least one lowercase letter'
  if (!hasNumbers) return 'Password must contain at least one number'
  if (!hasSpecialChar) return 'Password must contain at least one special character'
  
  return null
}

const validateFullName = (fullName: string): string | null => {
  if (!fullName) return 'Full name is required'
  if (fullName.length < 2) return 'Full name must be at least 2 characters'
  if (fullName.length > 100) return 'Full name is too long'
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/
  if (!nameRegex.test(fullName)) return 'Full name contains invalid characters'
  
  return null
}

// Main validation function
export const validateRegistrationData = (data: RegistrationData): ValidationResult => {
  const errors: string[] = []
  
  const emailError = validateEmail(data.email)
  if (emailError) errors.push(emailError)
  
  const passwordError = validatePassword(data.password)
  if (passwordError) errors.push(passwordError)
  
  const fullNameError = validateFullName(data.full_name)
  if (fullNameError) errors.push(fullNameError)
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Registration service
export const registrationService = {
  async registerUser(data: RegistrationData): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      // Step 1: Validate input data
      const validation = validateRegistrationData(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }
      
      // Step 2: Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', data.email)
        .single()
      
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        }
      }
      
      // Step 3: Create user in Supabase Auth (handles password hashing)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name
          }
        }
      })
      
      if (authError) {
        return {
          success: false,
          error: authError.message
        }
      }
      
      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        }
      }
      
      // Step 4: Create user profile (handled by database trigger, but we can also do it manually)
      const userProfile = await userProfileService.createUserProfile(
        authData.user.id,
        data.email,
        data.full_name
      )
      
      if (!userProfile) {
        // If profile creation fails, we should clean up the auth user
        // Note: In production, you might want to handle this more gracefully
        console.error('Failed to create user profile for:', authData.user.id)
      }
      
      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: data.full_name
        }
      }
      
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during registration'
      }
    }
  },
  
  // Additional validation methods for real-time feedback
  validateEmail,
  validatePassword,
  validateFullName
}
