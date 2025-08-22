import React from 'react'
import { AuthContainer } from './AuthContainer'

export const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">QuantFlow</h1>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your intelligent portfolio management platform
          </p>
        </div>
        <AuthContainer />
      </div>
    </div>
  )
}

