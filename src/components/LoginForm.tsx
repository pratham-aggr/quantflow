import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { FormInput } from './FormInput'
import { ErrorMessage } from './ErrorMessage'
import { PrimaryButton } from './Button'
import { useToast } from './Toast'

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
  const { success, error: showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loginStep, setLoginStep] = useState<'idle' | 'validating' | 'authenticating' | 'loading-profile'>('idle')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginFormData>()

  const fillDemoCredentials = () => {
    setValue('email', 'demo@quantflow.com')
    setValue('password', 'Demo123!')
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setLoginStep('validating')

    try {
      // Step 1: Quick validation feedback
      setLoginStep('authenticating')
      
      // Use the auth context login function which handles everything
      await login(data)
      
      // If we get here, login was successful
      setLoginStep('loading-profile')
      
      // Show success toast
      success('Welcome back!', 'You have been successfully signed in.')
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please check your credentials and try again.'
      setSubmitError(errorMessage)
      showError('Login Failed', errorMessage)
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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-lg w-full max-w-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Welcome Back</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">Sign in to your QuantFlow account</p>
      </div>

      {/* Demo Credentials Section */}
      <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            🚀 Try Demo Account
          </h3>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
          Experience QuantFlow with a pre-configured demo portfolio
        </p>
        <div className="bg-white dark:bg-neutral-800 rounded border border-blue-200 dark:border-blue-700 p-2 mb-2">
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">Email:</span>
              <span className="ml-1 text-blue-700 dark:text-blue-300 font-mono">demo@quantflow.com</span>
            </div>
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">Password:</span>
              <span className="ml-1 text-blue-700 dark:text-blue-300 font-mono">Demo123!</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
        >
          Fill Demo Credentials
        </button>
      </div>

      {submitError && (
        <ErrorMessage 
          message={submitError} 
          onDismiss={() => setSubmitError(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        <PrimaryButton
          type="submit"
          loading={isSubmitting}
          loadingText={getLoadingText()}
          className="w-full"
        >
          Sign In
        </PrimaryButton>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            disabled={isSubmitting}
            className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  )
}

