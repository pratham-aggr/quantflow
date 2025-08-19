import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigation } from './Navigation'
import { ProfileSettings } from './ProfileSettings'

export const ProfilePage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Profile Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-2 text-gray-600">
              Manage your account settings and investment preferences
            </p>
          </div>

          {/* Current Profile Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.full_name || 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.email}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Risk Tolerance</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {user?.risk_tolerance || 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Investment Goals</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.investment_goals?.length ? user.investment_goals.join(', ') : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <ProfileSettings />
        </div>
      </main>
    </div>
  )
}
