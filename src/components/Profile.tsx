import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { PrimaryButton } from './Button'
import { User, Shield, Target, Settings, Mail, Calendar, TrendingUp, BarChart3 } from 'lucide-react'

export const Profile: React.FC = () => {
  const { user } = useAuth()

  const getRiskToleranceColor = (tolerance: string) => {
    switch (tolerance) {
      case 'conservative': return 'text-gain-600 dark:text-gain-400'
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400'
      case 'aggressive': return 'text-loss-600 dark:text-loss-400'
      default: return 'robinhood-text-secondary'
    }
  }

  const getRiskToleranceIcon = (tolerance: string) => {
    switch (tolerance) {
      case 'conservative': return <Shield className="h-5 w-5" />
      case 'moderate': return <Target className="h-5 w-5" />
      case 'aggressive': return <Target className="h-5 w-5" />
      default: return <Target className="h-5 w-5" />
    }
  }

  const getRiskToleranceDescription = (tolerance: string) => {
    switch (tolerance) {
      case 'conservative': return 'Low risk, steady returns'
      case 'moderate': return 'Balanced risk and return'
      case 'aggressive': return 'Higher risk, higher potential returns'
      default: return 'Not specified'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-robinhood-dark dark:to-robinhood-dark-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold robinhood-text-primary mb-3">Profile</h1>
          <p className="robinhood-text-secondary text-lg">
            Your account information and investment preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="robinhood-card p-8 text-center">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-robinhood rounded-full flex items-center justify-center mx-auto mb-6 shadow-robinhood">
                <span className="text-white font-bold text-3xl">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>

              {/* Name and Email */}
              <h2 className="text-2xl font-bold robinhood-text-primary mb-2">
                {user?.full_name || 'Not set'}
              </h2>
              <p className="robinhood-text-secondary mb-6 flex items-center justify-center">
                <Mail className="h-4 w-4 mr-2" />
                {user?.email}
              </p>

              {/* Edit Profile Button */}
              <Link to="/settings">
                <PrimaryButton
                  leftIcon={<Settings className="h-4 w-4" />}
                  className="robinhood-btn-primary w-full"
                >
                  Edit Profile
                </PrimaryButton>
              </Link>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="robinhood-card p-8">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
                <h3 className="text-xl font-semibold robinhood-text-primary">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-2">Full Name</h4>
                  <p className="text-lg robinhood-text-primary font-medium">
                    {user?.full_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-2">Email Address</h4>
                  <p className="text-lg robinhood-text-primary font-medium">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Investment Preferences */}
            <div className="robinhood-card p-8">
              <div className="flex items-center mb-6">
                <BarChart3 className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
                <h3 className="text-xl font-semibold robinhood-text-primary">Investment Preferences</h3>
              </div>
              
              <div className="space-y-6">
                {/* Risk Tolerance */}
                <div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-3">Risk Tolerance</h4>
                  <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`${getRiskToleranceColor(user?.risk_tolerance || '')}`}>
                        {getRiskToleranceIcon(user?.risk_tolerance || '')}
                      </div>
                      <div>
                        <span className={`text-lg font-semibold capitalize ${getRiskToleranceColor(user?.risk_tolerance || '')}`}>
                          {user?.risk_tolerance || 'Not set'}
                        </span>
                        <p className="robinhood-text-secondary text-sm mt-1">
                          {getRiskToleranceDescription(user?.risk_tolerance || '')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Investment Goals */}
                <div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-3">Investment Goals</h4>
                  {user?.investment_goals?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.investment_goals.map((goal, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-robinhood-dark-tertiary dark:to-neutral-800 rounded-robinhood">
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                          <span className="text-sm robinhood-text-primary font-medium capitalize">
                            {goal.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <p className="robinhood-text-secondary">No investment goals set</p>
                      <p className="text-sm robinhood-text-tertiary mt-1">
                        Set your investment goals in settings to get personalized recommendations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="robinhood-card p-8">
              <div className="flex items-center mb-6">
                <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
                <h3 className="text-xl font-semibold robinhood-text-primary">Account Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-1">Account Type</h4>
                  <p className="text-lg robinhood-text-primary font-semibold">Individual</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-gain-100 to-gain-200 dark:from-gain-900/30 dark:to-gain-800/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-gain-600 dark:text-gain-400" />
                  </div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-1">Status</h4>
                  <p className="text-lg robinhood-gain font-semibold">Active</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <h4 className="text-sm font-medium robinhood-text-tertiary uppercase tracking-wide mb-1">Member Since</h4>
                  <p className="text-lg robinhood-text-primary font-semibold">2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
