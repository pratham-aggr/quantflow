import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Portfolios', href: '/portfolios' },
  { name: 'Profile', href: '/profile' }
]

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">QuantFlow</h1>
            </Link>
            
            {/* Navigation Tabs */}
            <div className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Welcome, {user?.full_name || user?.email}
            </span>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

