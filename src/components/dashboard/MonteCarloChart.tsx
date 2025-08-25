import React, { useState, useEffect, useMemo } from 'react'
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
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, BarChart3, AlertTriangle, Target } from 'lucide-react'

// Register Chart.js components
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

interface Holding {
  symbol: string
  quantity: number
  avg_price: number
  current_price?: number
}

interface MonteCarloData {
  timeSteps: number[]
  expectedPath: number[]
  percentilePaths: {
    p5: number[]
    p25: number[]
    p50: number[]
    p75: number[]
    p95: number[]
  }
  visiblePaths: number[][]
}

interface MonteCarloStats {
  finalValueStats: {
    mean: number
    median: number
    std: number
    min: number
    max: number
    p5: number
    p25: number
    p75: number
    p95: number
  }
  positiveReturnProbability: number
  var95: number
  var95Percent: number
  portfolioMeanReturn: number
  portfolioVolatility: number
}

interface MonteCarloChartProps {
  portfolioHoldings: Holding[]
  className?: string
}

const MonteCarloChart: React.FC<MonteCarloChartProps> = ({ portfolioHoldings, className = '' }) => {
  const [data, setData] = useState<MonteCarloData | null>(null)
  const [stats, setStats] = useState<MonteCarloStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('1y')
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true)

  const fetchMonteCarloData = async () => {
    if (!portfolioHoldings || portfolioHoldings.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/portfolio/monte-carlo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings: portfolioHoldings,
          period: period,
          simulations: 1000,
          timeSteps: 252, // 1 year of trading days
        }),
      })

      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setStats(result.statistics)
      } else {
        setError(result.error || 'Failed to fetch Monte Carlo data')
      }
    } catch (err) {
      setError('Failed to fetch Monte Carlo simulation data')
      console.error('Monte Carlo simulation error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonteCarloData()
  }, [portfolioHoldings, period])

  const chartData = useMemo(() => {
    if (!data) return null

    const datasets = []

    // Add confidence intervals
    if (showConfidenceIntervals) {
      // 95% confidence interval (p5 to p95)
      datasets.push({
        label: '95% Confidence Interval',
        data: data.percentilePaths.p95,
        borderColor: 'rgba(59, 130, 246, 0.1)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: '+1',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.1,
      })

      datasets.push({
        label: '95% Confidence Interval',
        data: data.percentilePaths.p5,
        borderColor: 'rgba(59, 130, 246, 0.1)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: false,
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.1,
      })

      // 50% confidence interval (p25 to p75)
      datasets.push({
        label: '50% Confidence Interval',
        data: data.percentilePaths.p75,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: '+1',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.1,
      })

      datasets.push({
        label: '50% Confidence Interval',
        data: data.percentilePaths.p25,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.1,
      })
    }



    // Add expected path (mean)
    datasets.push({
      label: 'Expected Path (Mean)',
      data: data.expectedPath,
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.1,
      fill: false,
    })

    // Add median path
    datasets.push({
      label: 'Median Path',
      data: data.percentilePaths.p50,
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0.1,
      fill: false,
    })

    return {
      labels: data.timeSteps.map(step => `Day ${step}`),
      datasets,
    }
  }, [data, showConfidenceIntervals])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => `Day ${context[0].dataIndex}`,
          label: (context: any) => {
            const value = context.parsed.y
            const percentage = ((value - 1) * 100).toFixed(2)
            return `${context.dataset.label}: ${value.toFixed(3)} (${percentage}%)`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Trading Days',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Portfolio Value (Normalized)',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
          callback: (value: any) => `${value.toFixed(2)}x`,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  if (!portfolioHoldings || portfolioHoldings.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="mx-auto h-12 w-12 mb-4" />
          <p>Add holdings to your portfolio to view Monte Carlo simulations</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monte Carlo Simulation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Portfolio value projections with confidence intervals
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Period:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showConfidenceIntervals}
                onChange={(e) => setShowConfidenceIntervals(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              Confidence Intervals
            </label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchMonteCarloData}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && chartData && (
        <div className="space-y-6">
          <div className="h-80">
            <Line data={chartData} options={options} />
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((stats.finalValueStats.mean - 1) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Expected Return</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.positiveReturnProbability.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Success Probability</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.var95Percent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">95% VaR</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(stats.portfolioVolatility * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Volatility</div>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  )
}

export default MonteCarloChart
