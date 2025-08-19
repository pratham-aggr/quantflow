import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'

interface ProfileFormData {
  full_name: string
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
  investment_goals: string[]
}

const riskToleranceOptions = [
  { value: 'conservative', label: 'Conservative', description: 'Low risk, steady returns' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced risk and return' },
  { value: 'aggressive', label: 'Aggressive', description: 'Higher risk, higher potential returns' }
]

const investmentGoalOptions = [
  { value: 'retirement', label: 'Retirement Planning' },
  { value: 'wealth_building', label: 'Wealth Building' },
  { value: 'income_generation', label: 'Income Generation' },
  { value: 'tax_efficiency', label: 'Tax Efficiency' },
  { value: 'diversification', label: 'Portfolio Diversification' },
  { value: 'short_term', label: 'Short-term Goals' },
  { value: 'long_term', label: 'Long-term Growth' }
]

export const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.full_name || '',
      risk_tolerance: user?.risk_tolerance || 'moderate',
      investment_goals: user?.investment_goals || []
    }
  })

  const selectedGoals = watch('investment_goals')

  const handleGoalToggle = (goal: string) => {
    const currentGoals = selectedGoals || []
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal]
    
    setValue('investment_goals', newGoals)
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await updateProfile({
        full_name: data.full_name,
        risk_tolerance: data.risk_tolerance,
        investment_goals: data.investment_goals
      })
      setSubmitSuccess(true)
    } catch (error) {
      setSubmitError('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600 mt-2">Customize your investment preferences and profile information</p>
        </div>

        {submitError && (
          <ErrorMessage 
            message={submitError} 
            onDismiss={() => setSubmitError(null)}
            className="mb-4"
          />
        )}

        {submitSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Profile updated successfully!
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Full Name */}
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

          {/* Risk Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Risk Tolerance
            </label>
            <div className="space-y-3">
              {riskToleranceOptions.map((option) => (
                <label key={option.value} className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('risk_tolerance', { required: 'Please select a risk tolerance level' })}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.risk_tolerance && (
              <p className="mt-1 text-sm text-red-600">{errors.risk_tolerance.message}</p>
            )}
          </div>

          {/* Investment Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Investment Goals (Select all that apply)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {investmentGoalOptions.map((goal) => (
                <label key={goal.value} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value={goal.value}
                    checked={selectedGoals?.includes(goal.value) || false}
                    onChange={() => handleGoalToggle(goal.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">{goal.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-md transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

