import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { useNavigate, useLocation } from 'react-router-dom'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

export const ResetPasswordForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormData>()
  const password = watch('password')

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have access_token in URL (from password reset)
        // Supabase typically puts tokens in the hash, not query string
        const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
        const search = new URLSearchParams(location.search)
        const accessToken = hash.get('access_token') || search.get('access_token')
        const refreshToken = hash.get('refresh_token') || search.get('refresh_token')
        
        if (accessToken && refreshToken) {
          // Set the session from the URL tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('Error setting session:', error)
            setError('Invalid or expired reset link. Please request a new one.')
          } else if (data.session) {
            setIsValidSession(true)
          }
        } else {
          // Check for existing session
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setIsValidSession(true)
          } else {
            setError('Invalid or expired reset link. Please request a new one.')
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setError('Invalid or expired reset link. Please request a new one.')
      }
    }
    checkSession()
  }, [location])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) setError(error.message)
      else {
        setIsSuccess(true)
        setTimeout(() => navigate('/dashboard'), 1500)
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.')
    } finally { setIsLoading(false) }
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            label="New Password"
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must include upper, lower, number' }
            })}
            error={errors.password?.message}
          />

          <FormInput
            label="Confirm Password"
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: value => value === password || 'Passwords do not match'
            })}
            error={errors.confirmPassword?.message}
          />

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
