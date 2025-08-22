import React, { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onDismiss: (id: string) => void
  onAction?: () => void
  actionLabel?: string
}

const toastStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    message: 'text-green-700',
    progress: 'bg-green-400'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700',
    progress: 'bg-red-400'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700',
    progress: 'bg-blue-400'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
    progress: 'bg-yellow-400'
  }
}

const icons = {
  success: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
  onAction,
  actionLabel
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)
  const styles = toastStyles[type]

  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now()
      const endTime = startTime + duration

      const updateProgress = () => {
        const now = Date.now()
        const remaining = Math.max(0, endTime - now)
        const newProgress = (remaining / duration) * 100

        if (newProgress <= 0) {
          handleDismiss()
        } else {
          setProgress(newProgress)
          requestAnimationFrame(updateProgress)
        }
      }

      requestAnimationFrame(updateProgress)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(id), 150) // Allow exit animation
  }

  const handleAction = () => {
    onAction?.()
    handleDismiss()
  }

  if (!isVisible) return null

  return (
    <div className={`
      relative overflow-hidden rounded-lg border p-4 shadow-lg transition-all duration-150 ease-in-out
      ${styles.bg} ${styles.border}
      transform translate-x-0 opacity-100
    `}>
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full">
          <div
            className={`h-full transition-all duration-100 ease-linear ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icons[type]}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.title}`}>
            {title}
          </p>
          {message && (
            <p className={`mt-1 text-sm ${styles.message}`}>
              {message}
            </p>
          )}
          {onAction && actionLabel && (
            <button
              onClick={handleAction}
              className={`mt-2 text-sm font-medium ${styles.title} hover:underline focus:outline-none`}
            >
              {actionLabel}
            </button>
          )}
        </div>

        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className={`inline-flex rounded-md p-1.5 ${styles.bg} ${styles.icon} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-500`}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

// Toast Hook for easy usage
interface ToastOptions {
  duration?: number
  onAction?: () => void
  actionLabel?: string
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([])

  const addToast = (type: ToastType, title: string, message?: string, options: ToastOptions = {}) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = {
      id,
      type,
      title,
      message,
      duration: options.duration,
      onAction: options.onAction,
      actionLabel: options.actionLabel,
      onDismiss: (toastId: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== toastId))
      }
    }

    setToasts(prev => [...prev, newToast])
    return id
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (title: string, message?: string, options?: ToastOptions) => 
    addToast('success', title, message, options)
  
  const error = (title: string, message?: string, options?: ToastOptions) => 
    addToast('error', title, message, options)
  
  const info = (title: string, message?: string, options?: ToastOptions) => 
    addToast('info', title, message, options)
  
  const warning = (title: string, message?: string, options?: ToastOptions) => 
    addToast('warning', title, message, options)

  return {
    toasts,
    success,
    error,
    info,
    warning,
    dismissToast
  }
}
