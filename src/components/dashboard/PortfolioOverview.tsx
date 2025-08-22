import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface PortfolioOverviewProps {
  title: string
  value: string
  change: number | null
  changePercent: number | null
  icon: LucideIcon
  trend: 'up' | 'down' | 'neutral'
  isPercentage?: boolean
  isRisk?: boolean
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  trend,
  isPercentage = false,
  isRisk = false
}) => {
  const getTrendColor = () => {
    if (isRisk) {
      if (changePercent! >= 80) return 'text-red-600'
      if (changePercent! >= 60) return 'text-yellow-600'
      return 'text-green-600'
    }
    
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = () => {
    if (isRisk) return null
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />
      case 'down':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getRiskLevel = () => {
    if (!isRisk) return null
    
    if (changePercent! >= 80) return 'High Risk'
    if (changePercent! >= 60) return 'Medium Risk'
    return 'Low Risk'
  }

  const formatChange = () => {
    if (change === null || changePercent === null) return null
    
    const sign = change >= 0 ? '+' : ''
    const formattedChange = isPercentage 
      ? `${sign}${change.toFixed(2)}%`
      : `${sign}$${Math.abs(change).toLocaleString()}`
    
    return formattedChange
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Icon className="h-5 w-5 text-gray-400 mr-2" />
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {isRisk && (
              <span className="ml-2 text-sm font-medium text-gray-500">
                {getRiskLevel()}
              </span>
            )}
          </div>
          
          {change !== null && changePercent !== null && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {formatChange()}
              </span>
              {getTrendIcon() && (
                <span className={`ml-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                </span>
              )}
            </div>
          )}
        </div>
        
        {isRisk && (
          <div className="flex-shrink-0">
            <div className="relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={getTrendColor()}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${changePercent}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">
                  {changePercent}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
