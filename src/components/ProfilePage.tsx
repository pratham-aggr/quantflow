import React from 'react'
import { useAuth } from '../contexts/AuthContext'

import { ProfileSettings } from './ProfileSettings'

export const ProfilePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Profile</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your account settings and investment preferences
          </p>
        </div>

        {/* Current Profile Info */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Current Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Full Name</h3>
              <p className="mt-1 text-sm text-neutral-900 dark:text-white">
                {user?.full_name || 'Not set'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Email</h3>
              <p className="mt-1 text-sm text-neutral-900 dark:text-white">
                {user?.email}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Risk Tolerance</h3>
              <p className="mt-1 text-sm text-neutral-900 dark:text-white capitalize">
                {user?.risk_tolerance || 'Not set'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Investment Goals</h3>
              <p className="mt-1 text-sm text-neutral-900 dark:text-white">
                {user?.investment_goals?.length ? user.investment_goals.join(', ') : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <ProfileSettings />
      </main>
    </div>
  )
}
