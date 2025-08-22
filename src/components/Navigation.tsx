import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DarkModeToggle } from './DarkModeToggle'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  BarChart3, 
  Briefcase, 
  TrendingUp, 
  Shield, 
  Globe 
} from 'lucide-react'
import { NotificationCenter } from './NotificationCenter'
import { Menu as HeadlessMenu, Transition } from '@headlessui/react'

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
    { name: 'Rebalancing', href: '/rebalancing', icon: TrendingUp },
    { name: 'Risk Analysis', href: '/risk-analysis', icon: Shield },
    { name: 'Market Data', href: '/market-data', icon: Globe },
    { name: 'Profile', href: '/profile', icon: User }
  ]

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <nav className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                QuantFlow
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-6">
            {/* Notification Bell */}
            <button
              onClick={() => setNotificationCenterOpen(true)}
              className="relative p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-loss-500 rounded-full"></span>
            </button>
            
            {/* Dark Mode Toggle */}
            <DarkModeToggle />
            
            {/* User Menu */}
            <div className="hidden md:block">
              <HeadlessMenu as="div" className="relative">
                <HeadlessMenu.Button className="flex items-center space-x-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="max-w-24 truncate">
                    {user?.full_name || user?.email?.split('@')[0]}
                  </span>
                </HeadlessMenu.Button>

                <Transition
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-neutral-900 rounded-lg shadow-elevated border border-neutral-200 dark:border-neutral-700 focus:outline-none z-50">
                    <div className="py-2">
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-neutral-800' : ''
                            } flex items-center px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 transition-colors`}
                          >
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-neutral-800' : ''
                            } flex items-center px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 transition-colors`}
                          >
                            <Settings className="mr-3 h-4 w-4" />
                            Settings
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <div className="border-t border-neutral-200 dark:border-neutral-700 my-1"></div>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-neutral-800' : ''
                            } flex items-center w-full px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 transition-colors`}
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign out
                          </button>
                        )}
                      </HeadlessMenu.Item>
                    </div>
                  </HeadlessMenu.Items>
                </Transition>
              </HeadlessMenu>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 p-2 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Transition
        show={mobileMenuOpen}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 -translate-y-1"
        enterTo="transform opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 translate-y-0"
        leaveTo="transform opacity-0 -translate-y-1"
      >
        <div className="md:hidden bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800">
          <div className="px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile user info */}
            <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center space-x-3 px-3 py-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </nav>
  )
}

