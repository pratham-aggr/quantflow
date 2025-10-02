import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingDown, BarChart3, Activity } from 'lucide-react'
import { portfolioApiService } from '../../lib/portfolioApiService'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface DrawdownData {
  dates: string[]
  drawdowns: number[]
  running_max: number[]
  cumulative_returns: number[]
}

interface DrawdownMetrics {
  max_drawdown: number
  max_drawdown_date: string
  current_drawdown: number
  recovery_needed: number
  drawdown_duration: number
}

interface PortfolioDrawdownChartProps {
  portfolioHoldings: any[]
  className?: string
}

export const PortfolioDrawdownChart: React.FC<PortfolioDrawdownChartProps> = ({
  portfolioHoldings,
  className = ''
}) => {
  const [data, setData] = useState<DrawdownData | null>(null)
  const [metrics, setMetrics] = useState<DrawdownMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y' | '2y' | '5y'>('1y')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDrawdownData = useCallback(async () => {
    if (!portfolioHoldings || portfolioHoldings.length === 0) {
      setError('No portfolio holdings available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await portfolioApiService.getDrawdowns(portfolioHoldings, period)
      
      if (result.success) {
        setData(result.data)
        setMetrics(result.metrics)
      } else {
        throw new Error(result.error || 'Failed to calculate drawdowns')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [portfolioHoldings, period])

  // Debounced effect for portfolio holdings changes
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (portfolioHoldings && portfolioHoldings.length > 0) {
        fetchDrawdownData()
      }
    }, 500) // 500ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [portfolioHoldings?.length, portfolioHoldings?.map(h => h.symbol).join(','), fetchDrawdownData])

  // Immediate effect for period changes
  useEffect(() => {
    fetchDrawdownData()
  }, [period, fetchDrawdownData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const chartData = {
    labels: data?.dates || [],
    datasets: [
      {
        label: 'Portfolio Drawdown',
        data: data?.drawdowns || [],
        borderColor: document.documentElement.classList.contains('dark') ? '#EF4444' : '#DC2626',
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: document.documentElement.classList.contains('dark') ? '#EF4444' : '#DC2626',
        pointHoverBorderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(31, 41, 55, 0.95)' : 'rgba(0, 0, 0, 0.9)',
        titleColor: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#ffffff',
        bodyColor: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#ffffff',
        borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y
            return `Drawdown: ${value.toFixed(2)}%`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: 8,
        },
      },
      y: {
        display: true,
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6B7280',
          font: {
            size: 11,
          },
          callback: (value) => {
            return `${value}%`
          },
        },
        reverse: true, // Show drawdowns as negative values going up
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  }

  const getDrawdownColor = (value: number) => {
    if (value >= -5) return 'text-green-600 dark:text-green-400'
    if (value >= -10) return 'text-yellow-600 dark:text-yellow-400'
    if (value >= -20) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getDrawdownIcon = (value: number) => {
    if (value >= -5) return <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
    if (value >= -10) return <TrendingDown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
    if (value >= -20) return <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
    return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
            Portfolio Drawdowns
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
            Portfolio Drawdowns
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={fetchDrawdownData}
              className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Activity className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
          Portfolio Drawdowns
        </h3>
        
        {/* Period Selector */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-400 dark:focus:border-red-400 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
            <option value="5y">5 Years</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Drawdown Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Drawdown</span>
              {getDrawdownIcon(metrics.max_drawdown)}
            </div>
            <p className={`text-lg font-bold ${getDrawdownColor(metrics.max_drawdown)}`}>
              {metrics.max_drawdown.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Drawdown</span>
              {getDrawdownIcon(metrics.current_drawdown)}
            </div>
            <p className={`text-lg font-bold ${getDrawdownColor(metrics.current_drawdown)}`}>
              {metrics.current_drawdown.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Recovery Needed</span>
              <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {metrics.recovery_needed.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</span>
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.drawdown_duration} days
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Additional Info */}
      {metrics && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p className="text-center">
            Maximum drawdown occurred on {new Date(metrics.max_drawdown_date).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
