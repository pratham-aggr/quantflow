import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { FormInput } from './FormInput'
import { ErrorMessage } from './ErrorMessage'
import { PrimaryButton, SecondaryButton } from './Button'
import { useToast } from './Toast'
import { 
  Shield, 
  Target, 
  Save, 
  ArrowLeft, 
  Trash2, 
  AlertTriangle, 
  User,
  Settings as SettingsIcon,
  Briefcase,
  Check,
  X
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface ProfileFormData {
  full_name: string
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
  investment_goals: string[]
}

const riskToleranceOptions = [
  { 
    value: 'conservative', 
    label: 'Conservative', 
    description: 'Low risk, steady returns', 
    icon: Shield,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  { 
    value: 'moderate', 
    label: 'Moderate', 
    description: 'Balanced risk and return', 
    icon: Target,
    color: 'from-yellow-500 to-orange-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  { 
    value: 'aggressive', 
    label: 'Aggressive', 
    description: 'Higher risk, higher potential returns', 
    icon: Target,
    color: 'from-red-500 to-pink-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  }
]

const investmentGoalOptions = [
  { value: 'retirement', label: 'Retirement Planning', icon: '🏖️' },
  { value: 'wealth_building', label: 'Wealth Building', icon: '💰' },
  { value: 'income_generation', label: 'Income Generation', icon: '💵' },
  { value: 'tax_efficiency', label: 'Tax Efficiency', icon: '📊' },
  { value: 'diversification', label: 'Portfolio Diversification', icon: '🎯' },
  { value: 'short_term', label: 'Short-term Goals', icon: '⚡' },
  { value: 'long_term', label: 'Long-term Growth', icon: '🌱' }
]

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const { portfolios, currentPortfolio, deletePortfolio } = usePortfolio()
  const { success, error: showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
  const selectedRiskTolerance = watch('risk_tolerance')

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

  const handleDeletePortfolio = async (portfolioId: string) => {
    setIsDeleting(true)
    try {
      const deleteSuccess = await deletePortfolio(portfolioId)
      if (deleteSuccess) {
        success('Portfolio Deleted', 'Portfolio has been successfully deleted.')
        setShowDeleteConfirm(null)
      } else {
        showError('Delete Failed', 'Failed to delete portfolio. Please try again.')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete portfolio'
      showError('Delete Failed', errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link 
              to="/profile" 
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your profile and investment preferences
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                </div>
              </div>
              
              <div className="p-6">
                {submitError && (
                  <ErrorMessage 
                    message={submitError} 
                    onDismiss={() => setSubmitError(null)}
                    className="mb-6"
                  />
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                  <div className="flex justify-end pt-4">
                    <PrimaryButton
                      type="submit"
                      loading={isSubmitting}
                      loadingText="Saving..."
                      leftIcon={<Save className="h-4 w-4" />}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Save Changes
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            </div>

            {/* Risk Tolerance */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Risk Tolerance</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Choose your investment risk profile
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {riskToleranceOptions.map((option) => {
                    const Icon = option.icon
                    const isSelected = selectedRiskTolerance === option.value
                    return (
                      <label 
                        key={option.value} 
                        className={`relative flex items-start cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected 
                            ? `${option.borderColor} ${option.bgColor} shadow-sm` 
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          value={option.value}
                          {...register('risk_tolerance', { required: 'Please select a risk tolerance level' })}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          isSelected 
                            ? `border-transparent bg-gradient-to-r ${option.color}` 
                            : 'border-gray-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="ml-4 flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${option.bgColor}`}>
                            <Icon className={`h-5 w-5 bg-gradient-to-r ${option.color} bg-clip-text text-transparent`} />
                          </div>
                          <div>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">{option.label}</span>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {errors.risk_tolerance && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errors.risk_tolerance.message}</p>
                )}
              </div>
            </div>

            {/* Investment Goals */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Investment Goals</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Select all that apply to your investment strategy
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {investmentGoalOptions.map((goal) => {
                    const isSelected = selectedGoals?.includes(goal.value) || false
                    return (
                      <label 
                        key={goal.value} 
                        className={`relative flex items-center cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected 
                            ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20 shadow-sm' 
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={goal.value}
                          checked={isSelected}
                          onChange={() => handleGoalToggle(goal.value)}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-purple-600 bg-purple-600' 
                            : 'border-gray-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="ml-3 flex items-center space-x-3">
                          <span className="text-lg">{goal.icon}</span>
                          <span className="text-base font-medium text-gray-900 dark:text-white">{goal.label}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Management Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Portfolios</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage your investment portfolios
                </p>
              </div>
              
              <div className="p-6">
                {portfolios.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No portfolios found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portfolios.map((portfolio) => (
                      <div key={portfolio.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                              {portfolio.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              ${portfolio.cash_balance.toLocaleString()} cash
                            </p>
                            {currentPortfolio?.id === portfolio.id && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          
                          {showDeleteConfirm === portfolio.id ? (
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <PrimaryButton
                                onClick={() => handleDeletePortfolio(portfolio.id)}
                                loading={isDeleting}
                                loadingText="..."
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-lg"
                                leftIcon={<Trash2 className="h-3 w-3" />}
                              >
                                Delete
                              </PrimaryButton>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowDeleteConfirm(portfolio.id)}
                              disabled={isDeleting}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-4"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning */}
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Warning</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Deleting a portfolio will permanently remove all holdings and transaction history.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
