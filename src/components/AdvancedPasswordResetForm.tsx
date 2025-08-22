import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Shield, Lock, Mail } from 'lucide-react'
import { passwordResetService } from '../lib/passwordResetService'
import { useToast } from '../hooks/useToast'

interface PasswordResetFormData {
  email: string
  newPassword: string
  confirmPassword: string
}

interface PasswordStrengthIndicator {
  score: number
  label: string
  color: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    special: boolean
  }
}

export const AdvancedPasswordResetForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordSuggestions, setPasswordSuggestions] = useState<string[]>([])
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset
  } = useForm<PasswordResetFormData>()

  const watchedPassword = watch('newPassword', '')
  const watchedConfirmPassword = watch('confirmPassword', '')

  // Generate password suggestions on mount
  useEffect(() => {
    setPasswordSuggestions(passwordResetService.generatePasswordSuggestions())
  }, [])

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrengthIndicator => {
    let score = 0
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    if (requirements.length) score += 1
    if (requirements.uppercase) score += 1
    if (requirements.lowercase) score += 1
    if (requirements.numbers) score += 1
    if (requirements.special) score += 1

    let label = 'Very Weak'
    let color = 'bg-red-500'

    if (score >= 4) {
      label = 'Strong'
      color = 'bg-green-500'
    } else if (score >= 3) {
      label = 'Good'
      color = 'bg-yellow-500'
    } else if (score >= 2) {
      label = 'Fair'
      color = 'bg-orange-500'
    } else if (score >= 1) {
      label = 'Weak'
      color = 'bg-red-400'
    }

    return { score, label, color, requirements }
  }

  const passwordStrength = calculatePasswordStrength(watchedPassword)

  const handleRequestReset = async (data: { email: string }) => {
    setIsLoading(true)
    try {
      const result = await passwordResetService.requestPasswordReset({
        email: data.email
      })

      if (result.success) {
        showToast('success', 'Password reset email sent!', 'Check your inbox for reset instructions.')
        setStep('reset')
      } else {
        showToast('error', 'Reset Failed', result.message)
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (data: PasswordResetFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      showToast('error', 'Passwords Mismatch', 'Passwords do not match.')
      return
    }

    if (passwordStrength.score < 3) {
      showToast('error', 'Weak Password', 'Please choose a stronger password.')
      return
    }

    setIsLoading(true)
    try {
      const result = await passwordResetService.updatePassword({
        token: new URLSearchParams(window.location.search).get('token') || '',
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })

      if (result.success) {
        showToast('success', 'Password Updated!', 'Your password has been successfully updated.')
        reset()
        // Redirect to login
        window.location.href = '/login'
      } else {
        showToast('error', 'Update Failed', result.message)
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const usePasswordSuggestion = (suggestion: string) => {
    setValue('newPassword', suggestion)
    setValue('confirmPassword', suggestion)
  }

  const generateNewSuggestions = () => {
    setPasswordSuggestions(passwordResetService.generatePasswordSuggestions())
  }

  if (step === 'request') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600">Enter your email to receive reset instructions</p>
          </div>

          <form onSubmit={handleSubmit(handleRequestReset)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Sending Reset Email...
                </div>
              ) : (
                'Send Reset Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h2>
          <p className="text-gray-600">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit(handlePasswordReset)} className="space-y-6">
          {/* Password Suggestions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Password Suggestions
              </h3>
              <button
                type="button"
                onClick={generateNewSuggestions}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                New
              </button>
            </div>
            <div className="space-y-2">
              {passwordSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => usePasswordSuggestion(suggestion)}
                  className="w-full text-left p-2 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm font-mono"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                {...register('newPassword', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Password Strength Indicator */}
          {watchedPassword && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Password Strength</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${passwordStrength.color.replace('bg-', 'text-')} bg-opacity-10`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(passwordStrength.requirements).map(([key, met]) => (
                  <div key={key} className="flex items-center">
                    {met ? (
                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={met ? 'text-green-600' : 'text-red-600'}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === watchedPassword || 'Passwords do not match'
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword.message}
              </p>
            )}
            {watchedConfirmPassword && watchedPassword !== watchedConfirmPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <XCircle className="w-4 h-4 mr-1" />
                Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || passwordStrength.score < 3 || watchedPassword !== watchedConfirmPassword}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
