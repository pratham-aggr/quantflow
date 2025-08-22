import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { loginService } from '../lib/loginService'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onSwitchToRegister: () => void
  onForgotPassword: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onForgotPassword }) => {
  const { login } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loginStep, setLoginStep] = useState<'idle' | 'validating' | 'authenticating' | 'loading-profile'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setLoginStep('validating')

    try {
      // Step 1: Quick validation feedback
      setLoginStep('authenticating')
      
      // Use the optimized login service with enhanced validation and error handling
      const result = await loginService.loginUser({
        email: data.email,
        password: data.password
      })

      if (result.success) {
        setLoginStep('loading-profile')
        // If login is successful, use the auth context to handle the session
        await login(data)
      } else {
        setSubmitError(result.error || 'Login failed. Please check your credentials and try again.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setSubmitError('Login failed. Please check your credentials and try again.')
    } finally {
      setIsSubmitting(false)
      setLoginStep('idle')
    }
  }

  const getLoadingText = () => {
    switch (loginStep) {
      case 'validating':
        return 'Validating...'
      case 'authenticating':
        return 'Signing In...'
      case 'loading-profile':
        return 'Loading Profile...'
      default:
        return 'Signing In...'
    }
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600 mt-2">Sign in to your QuantFlow account</p>
      </div>

      {submitError && (
        <ErrorMessage 
          message={submitError} 
          onDismiss={() => setSubmitError(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          required
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address'
            }
          })}
        />

        <FormInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          required
          error={errors.password?.message}
          disabled={isSubmitting}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters'
            }
          })}
        />

        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isSubmitting}
            className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Forgot your password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              {getLoadingText()}
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            disabled={isSubmitting}
            className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  )
}

