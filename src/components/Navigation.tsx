import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DarkModeToggle } from './DarkModeToggle'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  BarChart3, 
  Briefcase, 
  TrendingUp, 
  Shield, 
  Globe,
  Settings
} from 'lucide-react'

import { Menu as HeadlessMenu, Transition } from '@headlessui/react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
  { name: 'Rebalancing', href: '/rebalancing', icon: TrendingUp },
  { name: 'Risk Analysis', href: '/risk-analysis', icon: Shield },
  { name: 'Market News', href: '/market-news', icon: Globe }
]

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <nav className="bg-white/80 dark:bg-robinhood-dark/80 backdrop-blur-robinhood border-b border-neutral-200 dark:border-robinhood-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-robinhood rounded-robinhood flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-robinhood">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <h1 className="text-xl font-semibold robinhood-text-primary">
                QuantFlow
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-robinhood transition-all duration-200 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                      : 'robinhood-text-secondary hover:robinhood-text-primary hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />
            
            {/* User Menu */}
            <div className="hidden md:block">
              <HeadlessMenu as="div" className="relative">
                <HeadlessMenu.Button className="flex items-center space-x-3 text-sm font-medium robinhood-text-secondary hover:robinhood-text-primary transition-colors duration-200 p-2 rounded-robinhood hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary">
                  <div className="w-8 h-8 bg-gradient-robinhood rounded-full flex items-center justify-center shadow-robinhood">
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
                  <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right robinhood-card shadow-robinhood-lg focus:outline-none z-50">
                    <div className="py-2">
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-robinhood-dark-tertiary' : ''
                            } flex items-center w-full px-4 py-3 text-sm robinhood-text-secondary transition-colors duration-200`}
                          >
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link
                            to="/settings"
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-robinhood-dark-tertiary' : ''
                            } flex items-center w-full px-4 py-3 text-sm robinhood-text-secondary transition-colors duration-200`}
                          >
                            <Settings className="mr-3 h-4 w-4" />
                            Settings
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <div className="border-t border-neutral-200 dark:border-robinhood-dark-border my-1"></div>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={`${
                              active ? 'bg-neutral-50 dark:bg-robinhood-dark-tertiary' : ''
                            } flex items-center w-full px-4 py-3 text-sm robinhood-text-secondary transition-colors duration-200`}
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
                className="robinhood-text-secondary hover:robinhood-text-primary p-2 transition-colors duration-200 rounded-robinhood hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary"
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
        <div className="md:hidden bg-white/95 dark:bg-robinhood-dark/95 backdrop-blur-robinhood border-t border-neutral-200 dark:border-robinhood-dark-border">
          <div className="px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-robinhood text-base font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                      : 'robinhood-text-secondary hover:robinhood-text-primary hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile user menu */}
            <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-robinhood-dark-border">
              <div className="flex items-center space-x-3 px-4 py-3">
                <div className="w-10 h-10 bg-gradient-robinhood rounded-full flex items-center justify-center shadow-robinhood">
                  <span className="text-white font-medium text-sm">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium robinhood-text-primary">
                    {user?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs robinhood-text-tertiary">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Mobile Profile & Settings Links */}
              <Link
                to="/profile"
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm robinhood-text-secondary hover:robinhood-text-primary hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary rounded-robinhood transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>
              
              <Link
                to="/settings"
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm robinhood-text-secondary hover:robinhood-text-primary hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary rounded-robinhood transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm robinhood-text-secondary hover:robinhood-text-primary hover:bg-neutral-50 dark:hover:bg-robinhood-dark-tertiary rounded-robinhood transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
      
    </nav>
  )
}

