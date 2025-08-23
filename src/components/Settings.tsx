import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { FormInput } from './FormInput'
import { ErrorMessage } from './ErrorMessage'
import { PrimaryButton, SecondaryButton } from './Button'
import { useToast } from './Toast'
import { Shield, Target, Save, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ProfileFormData {
  full_name: string
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
  investment_goals: string[]
}

const riskToleranceOptions = [
  { value: 'conservative', label: 'Conservative', description: 'Low risk, steady returns', icon: Shield },
  { value: 'moderate', label: 'Moderate', description: 'Balanced risk and return', icon: Target },
  { value: 'aggressive', label: 'Aggressive', description: 'Higher risk, higher potential returns', icon: Target }
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

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const { success, error: showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

    try {
      await updateProfile({
        full_name: data.full_name,
        risk_tolerance: data.risk_tolerance,
        investment_goals: data.investment_goals
      })
      
      success('Profile Updated', 'Your profile settings have been successfully updated.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.'
      setSubmitError(errorMessage)
      showError('Update Failed', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRiskToleranceColor = (tolerance: string) => {
    switch (tolerance) {
      case 'conservative': return 'text-gain-600 dark:text-gain-400'
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400'
      case 'aggressive': return 'text-loss-600 dark:text-loss-400'
      default: return 'robinhood-text-secondary'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              to="/profile" 
              className="flex items-center text-sm robinhood-text-secondary hover:robinhood-text-primary transition-colors duration-200 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </div>
          <h1 className="text-4xl font-bold robinhood-text-primary mb-3">Settings</h1>
          <p className="robinhood-text-secondary text-lg">
            Update your profile information and investment preferences
          </p>
        </div>

        <div className="robinhood-card p-8">
          {submitError && (
            <ErrorMessage 
              message={submitError} 
              onDismiss={() => setSubmitError(null)}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Full Name */}
            <FormInput
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              required
              error={errors.full_name?.message}
              disabled={isSubmitting}
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
              <label className="block text-sm font-medium robinhood-text-primary mb-4">
                Risk Tolerance
              </label>
              <div className="space-y-4">
                {riskToleranceOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <label key={option.value} className="flex items-start cursor-pointer p-4 rounded-robinhood border border-neutral-200 dark:border-robinhood-dark-border hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                      <input
                        type="radio"
                        value={option.value}
                        {...register('risk_tolerance', { required: 'Please select a risk tolerance level' })}
                        disabled={isSubmitting}
                        className="h-5 w-5 text-primary-600 border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 mt-0.5"
                      />
                      <div className="ml-4 flex items-start space-x-3">
                        <div className={`${getRiskToleranceColor(option.value)} mt-0.5`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-lg font-semibold robinhood-text-primary">{option.label}</span>
                          <p className="robinhood-text-secondary mt-1">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {errors.risk_tolerance && (
                <p className="mt-2 text-sm text-loss-600 dark:text-loss-400">{errors.risk_tolerance.message}</p>
              )}
            </div>

            {/* Investment Goals */}
            <div>
              <label className="block text-sm font-medium robinhood-text-primary mb-4">
                Investment Goals (Select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investmentGoalOptions.map((goal) => (
                  <label key={goal.value} className="flex items-center cursor-pointer p-3 rounded-robinhood border border-neutral-200 dark:border-robinhood-dark-border hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                    <input
                      type="checkbox"
                      value={goal.value}
                      checked={selectedGoals?.includes(goal.value) || false}
                      onChange={() => handleGoalToggle(goal.value)}
                      disabled={isSubmitting}
                      className="h-5 w-5 text-primary-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-base robinhood-text-primary font-medium">{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <Link to="/profile">
                <SecondaryButton
                  type="button"
                  disabled={isSubmitting}
                  className="robinhood-btn-secondary"
                >
                  Cancel
                </SecondaryButton>
              </Link>
              <PrimaryButton
                type="submit"
                loading={isSubmitting}
                loadingText="Saving..."
                leftIcon={<Save className="h-4 w-4" />}
                className="robinhood-btn-primary"
              >
                Save Changes
              </PrimaryButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
