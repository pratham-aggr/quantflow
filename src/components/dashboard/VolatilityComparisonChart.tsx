import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Activity, Brain } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface VolatilityData {
  dates: string[]
  predicted_volatility: number[]
  realized_volatility: number[]
  confidence_interval_upper: number[]
  confidence_interval_lower: number[]
}

interface VolatilityMetrics {
  avg_predicted_volatility: number
  avg_realized_volatility: number
  prediction_accuracy: number
  volatility_trend: 'increasing' | 'decreasing' | 'stable'
  risk_level: 'low' | 'moderate' | 'high'
}

interface VolatilityComparisonChartProps {
  portfolioHoldings: any[]
  className?: string
}

export const VolatilityComparisonChart: React.FC<VolatilityComparisonChartProps> = ({
  portfolioHoldings,
  className = ''
}) => {
  const [data, setData] = useState<VolatilityData | null>(null)
  const [metrics, setMetrics] = useState<VolatilityMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y' | '2y'>('1y')

  const fetchVolatilityData = async () => {
    if (!portfolioHoldings || portfolioHoldings.length === 0) {
      setError('No portfolio holdings available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL || 'http://127.0.0.1:5001'}/api/risk/volatility-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings: portfolioHoldings,
          period: period
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch volatility comparison data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setMetrics(result.metrics)
      } else {
        throw new Error(result.error || 'Failed to calculate volatility comparison')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVolatilityData()
  }, [portfolioHoldings, period])

  const chartData = {
    labels: data?.dates || [],
    datasets: [
      {
        label: 'Predicted Volatility (ML)',
        data: data?.predicted_volatility || [],
        borderColor: document.documentElement.classList.contains('dark') ? '#3B82F6' : '#2563EB',
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: document.documentElement.classList.contains('dark') ? '#3B82F6' : '#2563EB',
        pointHoverBorderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        pointHoverBorderWidth: 2,
      },
      {
        label: 'Realized Volatility',
        data: data?.realized_volatility || [],
        borderColor: document.documentElement.classList.contains('dark') ? '#EF4444' : '#DC2626',
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: document.documentElement.classList.contains('dark') ? '#EF4444' : '#DC2626',
        pointHoverBorderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        pointHoverBorderWidth: 2,
      },
      {
        label: 'Confidence Interval',
        data: data?.confidence_interval_upper || [],
        borderColor: 'transparent',
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.05)',
        borderWidth: 0,
        fill: '+1',
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
      {
        label: 'Confidence Interval',
        data: data?.confidence_interval_lower || [],
        borderColor: 'transparent',
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.05)',
        borderWidth: 0,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
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
            return `${context.dataset.label}: ${(value * 100).toFixed(2)}%`
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
            return `${(Number(value) * 100).toFixed(1)}%`
          },
        },
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

  const getVolatilityColor = (value: number) => {
    if (value <= 0.15) return 'text-green-600 dark:text-green-400'
    if (value <= 0.25) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getVolatilityIcon = (value: number) => {
    if (value <= 0.15) return <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
    if (value <= 0.25) return <Activity className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
    return <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            ML Volatility Prediction vs Realized
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            ML Volatility Prediction vs Realized
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={fetchVolatilityData}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
          <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          ML Volatility Prediction vs Realized
        </h3>
        
        {/* Period Selector */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Volatility Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Predicted</span>
              {getVolatilityIcon(metrics.avg_predicted_volatility)}
            </div>
            <p className={`text-lg font-bold ${getVolatilityColor(metrics.avg_predicted_volatility)}`}>
              {(metrics.avg_predicted_volatility * 100).toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Realized</span>
              {getVolatilityIcon(metrics.avg_realized_volatility)}
            </div>
            <p className={`text-lg font-bold ${getVolatilityColor(metrics.avg_realized_volatility)}`}>
              {(metrics.avg_realized_volatility * 100).toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy</span>
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {metrics.prediction_accuracy.toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Risk Level</span>
              <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {metrics.risk_level}
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
            Volatility trend: <span className="font-medium capitalize">{metrics.volatility_trend}</span> • 
            ML model accuracy: <span className="font-medium">{metrics.prediction_accuracy.toFixed(1)}%</span>
          </p>
        </div>
      )}
    </div>
  )
}
