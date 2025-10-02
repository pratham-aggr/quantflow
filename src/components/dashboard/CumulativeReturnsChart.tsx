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
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'

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

interface CumulativeReturnsData {
  dates: string[]
  portfolio_cumulative: number[]
  benchmark_cumulative: number[]
  portfolio_returns: number[]
  benchmark_returns: number[]
}

interface PerformanceMetrics {
  portfolio_total_return: number
  benchmark_total_return: number
  excess_return: number
  portfolio_volatility: number
  benchmark_volatility: number
  portfolio_sharpe: number
  benchmark_sharpe: number
}

interface CumulativeReturnsChartProps {
  portfolioHoldings: any[]
  className?: string
}

export const CumulativeReturnsChart: React.FC<CumulativeReturnsChartProps> = ({
  portfolioHoldings,
  className = ''
}) => {
  const [data, setData] = useState<CumulativeReturnsData | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y' | '2y' | '5y'>('1y')
  const [benchmark, setBenchmark] = useState('SPY')

  const fetchCumulativeReturns = async () => {
    if (!portfolioHoldings || portfolioHoldings.length === 0) {
      setError('No portfolio holdings available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL || 'http://127.0.0.1:5001'}/api/portfolio/cumulative-returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings: portfolioHoldings,
          benchmark: benchmark,
          period: period
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cumulative returns data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setMetrics(result.metrics)
      } else {
        throw new Error(result.error || 'Failed to calculate cumulative returns')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCumulativeReturns()
  }, [portfolioHoldings, period, benchmark])

  const chartData = {
    labels: data?.dates || [],
    datasets: [
      {
        label: 'Portfolio',
        data: data?.portfolio_cumulative || [],
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        borderWidth: 3,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#10B981',
        pointHoverBorderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        pointHoverBorderWidth: 2,
      },
      {
        label: `Benchmark (${benchmark})`,
        data: data?.benchmark_cumulative || [],
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3B82F6',
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
            const percentage = ((value - 1) * 100).toFixed(2)
            return `${context.dataset.label}: ${percentage}%`
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
            const percentage = ((value as number - 1) * 100).toFixed(0)
            return `${percentage}%`
          },
        },
        border: {
          color: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
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

  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Cumulative Returns vs Benchmark
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
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Cumulative Returns vs Benchmark
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={fetchCumulativeReturns}
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
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Cumulative Returns vs Benchmark
        </h3>
        
        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Benchmark Selector */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Benchmark
            </label>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm"
            >
              <option value="SPY">S&P 500 (SPY)</option>
              <option value="QQQ">NASDAQ (QQQ)</option>
              <option value="IWM">Russell 2000 (IWM)</option>
              <option value="VTI">Total Market (VTI)</option>
              <option value="BND">Bonds (BND)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
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
              <option value="5y">5 Years</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Portfolio Return</span>
              {getPerformanceIcon(metrics.portfolio_total_return)}
            </div>
            <p className={`text-lg font-bold ${getPerformanceColor(metrics.portfolio_total_return)}`}>
              {metrics.portfolio_total_return >= 0 ? '+' : ''}{metrics.portfolio_total_return.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Benchmark Return</span>
              {getPerformanceIcon(metrics.benchmark_total_return)}
            </div>
            <p className={`text-lg font-bold ${getPerformanceColor(metrics.benchmark_total_return)}`}>
              {metrics.benchmark_total_return >= 0 ? '+' : ''}{metrics.benchmark_total_return.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Excess Return</span>
              {getPerformanceIcon(metrics.excess_return)}
            </div>
            <p className={`text-lg font-bold ${getPerformanceColor(metrics.excess_return)}`}>
              {metrics.excess_return >= 0 ? '+' : ''}{metrics.excess_return.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sharpe Ratio</span>
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.portfolio_sharpe.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Additional Metrics */}
      {metrics && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <span className="text-gray-600">Portfolio Volatility: </span>
            <span className="font-semibold">{metrics.portfolio_volatility}%</span>
          </div>
          <div className="text-center">
            <span className="text-gray-600">Benchmark Volatility: </span>
            <span className="font-semibold">{metrics.benchmark_volatility}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
