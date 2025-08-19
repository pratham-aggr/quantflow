import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const AuthContainer: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    if (location.pathname === '/register') {
      setIsLogin(false)
      setShowForgotPassword(false)
    } else if (location.pathname === '/login') {
      setIsLogin(true)
      setShowForgotPassword(false)
    }
  }, [location.pathname])

  const handleSwitchToRegister = () => {
    setIsLogin(false)
    setShowForgotPassword(false)
    navigate('/register')
  }

  const handleSwitchToLogin = () => {
    setIsLogin(true)
    setShowForgotPassword(false)
    navigate('/login')
  }

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
  }

  const handleBackToLogin = () => {
    setShowForgotPassword(false)
  }

  return (
    <div className="w-full max-w-md">
      {showForgotPassword ? (
        <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
      ) : isLogin ? (
        <LoginForm 
          onSwitchToRegister={handleSwitchToRegister} 
          onForgotPassword={handleForgotPassword}
        />
      ) : (
        <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
      )}
    </div>
  )
}
