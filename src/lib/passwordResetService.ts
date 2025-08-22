import { auth } from './supabase'
import { performanceMonitor } from './performance'

interface PasswordResetRequest {
  email: string
  redirectTo?: string
}

interface PasswordResetResponse {
  success: boolean
  message: string
  resetToken?: string
}

interface PasswordUpdateRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

class PasswordResetService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.REACT_APP_SUPABASE_URL || ''
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResponse> {
    return performanceMonitor.trackAsync('password_reset_request', async () => {
      const { data, error } = await auth.resetPasswordForEmail(request.email, {
        redirectTo: request.redirectTo || `${window.location.origin}/reset-password`
      })

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }
      
      return {
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.',
        resetToken: (data as any)?.user?.id
      }
    })
  }

  async updatePassword(request: PasswordUpdateRequest): Promise<PasswordResetResponse> {
    return performanceMonitor.trackAsync('password_update', async () => {
      // Validate password strength
      const passwordStrength = this.validatePasswordStrength(request.newPassword)
      if (!passwordStrength.isValid) {
        return {
          success: false,
          message: passwordStrength.message
        }
      }

      // Validate password confirmation
      if (request.newPassword !== request.confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match.'
        }
      }

      const { data, error } = await auth.updateUser({
        password: request.newPassword
      })

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }
      
      return {
        success: true,
        message: 'Password updated successfully!'
      }
    })
  }

  private validatePasswordStrength(password: string): { isValid: boolean; message: string } {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength) {
      return {
        isValid: false,
        message: `Password must be at least ${minLength} characters long.`
      }
    }

    if (!hasUpperCase) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter.'
      }
    }

    if (!hasLowerCase) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter.'
      }
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        message: 'Password must contain at least one number.'
      }
    }

    if (!hasSpecialChar) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character.'
      }
    }

    return {
      isValid: true,
      message: 'Password meets all requirements.'
    }
  }

  async verifyResetToken(token: string): Promise<boolean> {
    try {
      // Verify the reset token is valid
      const { data, error } = await auth.getUser()
      
      if (error || !data.user) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  // Generate secure password suggestions
  generatePasswordSuggestions(): string[] {
    const adjectives = ['secure', 'strong', 'powerful', 'reliable', 'smart', 'clever', 'wise', 'brave']
    const nouns = ['password', 'key', 'shield', 'guard', 'protector', 'defender', 'champion', 'hero']
    const numbers = ['2024', '2025', '123', '456', '789', '000', '111', '999']
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*']

    const suggestions: string[] = []
    
    for (let i = 0; i < 3; i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      const num = numbers[Math.floor(Math.random() * numbers.length)]
      const special = specialChars[Math.floor(Math.random() * specialChars.length)]
      
      suggestions.push(`${adj}${noun}${num}${special}`)
    }

    return suggestions
  }
}

export const passwordResetService = new PasswordResetService()
