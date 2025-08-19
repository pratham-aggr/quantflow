import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { usePortfolio } from '../contexts/PortfolioContext'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { CreatePortfolioSchema, CreatePortfolioData } from '../types/portfolio'

interface PortfolioCreationFormProps {
  onSuccess?: () => void
}

export const PortfolioCreationForm: React.FC<PortfolioCreationFormProps> = ({ onSuccess }) => {
  const { createPortfolio } = usePortfolio()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreatePortfolioData>()

  const onSubmit = async (data: CreatePortfolioData) => {
    console.log('Starting portfolio creation with data:', data)
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Validate data with Zod
      const validatedData = CreatePortfolioSchema.parse(data)
      console.log('Validation passed:', validatedData)
      
      const portfolio = await createPortfolio(validatedData)
      console.log('Portfolio creation result:', portfolio)
      
      if (portfolio) {
        reset()
        setSubmitError(null)
        onSuccess?.()
      } else {
        setSubmitError('Failed to create portfolio. Please try again.')
      }
    } catch (error: any) {
      console.error('Portfolio creation error:', error)
      if (error.errors) {
        // Zod validation errors
        setSubmitError(error.errors[0]?.message || 'Validation failed')
      } else {
        setSubmitError('Failed to create portfolio. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {submitError && (
        <ErrorMessage 
          message={submitError} 
          onDismiss={() => setSubmitError(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Portfolio Name"
          type="text"
          placeholder="Enter portfolio name"
          required
          error={errors.name?.message}
          {...register('name', {
            required: 'Portfolio name is required',
            minLength: {
              value: 1,
              message: 'Portfolio name must be at least 1 character'
            },
            maxLength: {
              value: 100,
              message: 'Portfolio name must be less than 100 characters'
            }
          })}
        />

        <FormInput
          label="Initial Cash Balance"
          type="number"
          placeholder="10000"
          required
          error={errors.cash_balance?.message}
          {...register('cash_balance', {
            required: 'Initial cash balance is required',
            valueAsNumber: true,
            min: {
              value: 0,
              message: 'Cash balance cannot be negative'
            },
            max: {
              value: 1000000000,
              message: 'Cash balance cannot exceed $1 billion'
            }
          })}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Portfolio...
            </div>
          ) : (
            'Create Portfolio'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p>💡 Tip: You can always adjust your cash balance later</p>
      </div>
    </div>
  )
}
