import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
}

const buttonVariants = {
  primary: {
    base: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    disabled: 'bg-blue-400 cursor-not-allowed',
    loading: 'bg-blue-600 cursor-wait'
  },
  secondary: {
    base: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white',
    disabled: 'bg-gray-400 cursor-not-allowed',
    loading: 'bg-gray-600 cursor-wait'
  },
  danger: {
    base: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    disabled: 'bg-red-400 cursor-not-allowed',
    loading: 'bg-red-600 cursor-wait'
  },
  ghost: {
    base: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500 text-gray-700',
    disabled: 'text-gray-400 cursor-not-allowed',
    loading: 'text-gray-700 cursor-wait'
  },
  outline: {
    base: 'bg-transparent border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 text-gray-700',
    disabled: 'border-gray-200 text-gray-400 cursor-not-allowed',
    loading: 'border-gray-300 text-gray-700 cursor-wait'
  }
}

const buttonSizes = {
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'w-4 h-4'
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-sm',
    icon: 'w-4 h-4'
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-base',
    icon: 'w-5 h-5'
  }
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading
  const variantStyles = buttonVariants[variant]
  const sizeStyles = buttonSizes[size]
  
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    if (loading) {
      return `${baseStyles} ${variantStyles.loading} ${sizeStyles.padding} ${sizeStyles.text} ${className}`
    }
    
    if (isDisabled) {
      return `${baseStyles} ${variantStyles.disabled} ${sizeStyles.padding} ${sizeStyles.text} ${className}`
    }
    
    return `${baseStyles} ${variantStyles.base} ${sizeStyles.padding} ${sizeStyles.text} ${className}`
  }

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText || children}
        </>
      )
    }

    return (
      <>
        {leftIcon && !loading && (
          <span className={`mr-2 ${sizeStyles.icon}`}>
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && !loading && (
          <span className={`ml-2 ${sizeStyles.icon}`}>
            {rightIcon}
          </span>
        )}
      </>
    )
  }

  return (
    <button
      className={getButtonStyles()}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </button>
  )
}

// Convenience components for common button types
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
)

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
)

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
)

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
)

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
)
