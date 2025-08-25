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
  const { login, enterDemoMode } = useAuth()
  const { success, error: showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
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

  const handleDemoMode = async () => {
    setIsDemoLoading(true)
    setSubmitError(null)

    try {
      await enterDemoMode()
      success('Demo Mode Activated', 'Welcome to QuantFlow! You can now explore all features with a sample portfolio.')
    } catch (error) {
      console.error('Demo mode error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to enter demo mode. Please try again.'
      setSubmitError(errorMessage)
      showError('Demo Mode Failed', errorMessage)
    } finally {
      setIsDemoLoading(false)
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
          disabled={isSubmitting || isDemoLoading}
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
          disabled={isSubmitting || isDemoLoading}
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
            disabled={isSubmitting || isDemoLoading}
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
          disabled={isDemoLoading}
        >
          Sign In
        </PrimaryButton>
      </form>

      {/* Demo Portfolio Button */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300 dark:border-neutral-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
              Or
            </span>
          </div>
        </div>
        
        <div className="mt-6">
          <PrimaryButton
            type="button"
            onClick={handleDemoMode}
            loading={isDemoLoading}
            loadingText="Loading Demo..."
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white"
            disabled={isSubmitting}
          >
            🎭 View Demo Portfolio
          </PrimaryButton>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">
            Explore all features with a sample portfolio
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            disabled={isSubmitting || isDemoLoading}
            className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  )
}

