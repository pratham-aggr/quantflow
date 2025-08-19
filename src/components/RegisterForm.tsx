import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { registrationService } from '../lib/registrationService'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'

interface RegisterFormData {
  full_name: string
  email: string
  password: string
  confirmPassword: string
}

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register: registerUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>()

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    console.log('🔍 Registration attempt with:', {
      email: data.email,
      passwordLength: data.password.length,
      fullName: data.full_name
    })

    try {
      // Use the new registration service with enhanced validation
      const result = await registrationService.registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name
      })

      if (result.success) {
        // If registration is successful, use the auth context to handle login
        await registerUser({
          email: data.email,
          password: data.password,
          full_name: data.full_name
        })
      } else {
        setSubmitError(result.error || 'Registration failed. Please try again.')
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      setSubmitError('Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join QuantFlow and start your investment journey</p>
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
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          required
          error={errors.full_name?.message}
          {...register('full_name', {
            required: 'Full name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters'
            }
          })}
        />

        <FormInput
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          required
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address'
            }
          })}
        />

        <FormInput
          label="Password"
          type="password"
          placeholder="Create a password"
          required
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters'
            },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
              message: 'Password must contain uppercase, lowercase, number, and special character'
            }
          })}
        />

        <FormInput
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Default Profile Settings</h3>
          <p className="text-sm text-blue-700">
            Your account will be created with moderate risk tolerance. You can customize your investment preferences after registration.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  )
}
