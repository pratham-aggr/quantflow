import React, { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { TrendingUp, BarChart3, RefreshCw } from 'lucide-react'
import { finnhubNewsService, FinnhubNewsItem } from '../../lib/finnhubNewsService'
import { useToast } from '../Toast'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SentimentAnalysisChartProps {
  portfolioHoldings: any[]
  className?: string
}

interface SentimentData {
  date: string
  sentiment: number
  count: number
  positive: number
  negative: number
  neutral: number
}

interface PortfolioData {
  date: string
  returns: number
  cumulative: number
}

export const SentimentAnalysisChart: React.FC<SentimentAnalysisChartProps> = ({
  portfolioHoldings,
  className = ''
}) => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([])
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')
  const { error: showError } = useToast()

  // Fetch sentiment data
  const fetchSentimentData = async () => {
    if (!portfolioHoldings || portfolioHoldings.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Get news for all portfolio symbols
      const allNews: FinnhubNewsItem[] = []
      
      for (const holding of portfolioHoldings) {
        try {
          const response = await finnhubNewsService.getCompanyNews(holding.symbol, 20)
          allNews.push(...response.news)
        } catch (error) {
          console.log(`Failed to fetch news for ${holding.symbol}`)
        }
      }

      // Process sentiment data by date
      const sentimentByDate: Record<string, { 
        total: number; 
        count: number; 
        positive: number; 
        negative: number; 
        neutral: number 
      }> = {}
      
      allNews.forEach(news => {
        const date = new Date(parseInt(news.time_published) * 1000).toISOString().split('T')[0]
        const sentiment = news.overall_sentiment_score || 0
        const label = news.overall_sentiment_label || 'neutral'
        
        if (!sentimentByDate[date]) {
          sentimentByDate[date] = { 
            total: 0, 
            count: 0, 
            positive: 0, 
            negative: 0, 
            neutral: 0 
          }
        }
        sentimentByDate[date].total += sentiment
        sentimentByDate[date].count += 1
        
        // Count sentiment labels
        if (label.toLowerCase().includes('positive') || sentiment > 0.1) {
          sentimentByDate[date].positive += 1
        } else if (label.toLowerCase().includes('negative') || sentiment < -0.1) {
          sentimentByDate[date].negative += 1
        } else {
          sentimentByDate[date].neutral += 1
        }
      })

      // Convert to array and sort by date
      const sentimentArray = Object.entries(sentimentByDate)
        .map(([date, data]) => ({
          date,
          sentiment: data.count > 0 ? data.total / data.count : 0,
          count: data.count,
          positive: data.positive,
          negative: data.negative,
          neutral: data.neutral
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30) // Last 30 days

      setSentimentData(sentimentArray)

      // Calculate portfolio returns for the same period
      const portfolioReturns = await calculatePortfolioReturns(portfolioHoldings, sentimentArray)
      setPortfolioData(portfolioReturns)

    } catch (err) {
      console.error('Error fetching sentiment data:', err)
      setError('Failed to fetch sentiment data')
      showError('Sentiment Analysis Error', 'Failed to fetch sentiment data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate portfolio returns
  const calculatePortfolioReturns = async (holdings: any[], sentimentDates: SentimentData[]): Promise<PortfolioData[]> => {
    if (!sentimentDates.length) return []
    
    const returns: PortfolioData[] = []
    let cumulativeReturn = 0

    for (const sentimentDate of sentimentDates) {
      const date = new Date(sentimentDate.date)
      let dailyReturn = 0
      let totalValue = 0

      // Calculate weighted return for the portfolio
      for (const holding of holdings) {
        try {
          // Get historical data for this date
          const historicalData = await fetch(`/api/market-data/historical/${holding.symbol}?start=${date.toISOString().split('T')[0]}&end=${date.toISOString().split('T')[0]}`)
          const data = await historicalData.json()
          
          if (data && data.length > 0) {
            const price = data[0].close
            const avgPrice = holding.avg_price
            const quantity = holding.quantity
            
            if (avgPrice > 0) {
              const holdingReturn = (price - avgPrice) / avgPrice
              const holdingValue = quantity * avgPrice
              dailyReturn += holdingReturn * holdingValue
              totalValue += holdingValue
            }
          }
        } catch (error) {
          console.log(`Failed to get historical data for ${holding.symbol}`)
        }
      }

      const weightedReturn = totalValue > 0 ? dailyReturn / totalValue : 0
      cumulativeReturn += weightedReturn

      returns.push({
        date: sentimentDate.date,
        returns: weightedReturn * 100, // Convert to percentage
        cumulative: cumulativeReturn * 100
      })
    }

    return returns
  }

  // Chart data
  const chartData = useMemo(() => {
    if (!sentimentData.length || !portfolioData.length) return null

    const labels = sentimentData.map(item => {
      const date = new Date(item.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    return {
      labels,
      datasets: [
        {
          label: 'News Sentiment',
          data: sentimentData.map(item => item.sentiment),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y-sentiment',
          type: chartType as any
        },
        {
          label: 'Portfolio Returns (%)',
          data: portfolioData.map(item => item.cumulative),
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y-returns',
          type: 'line' as any
        },
        {
          label: 'Positive Articles',
          data: sentimentData.map(item => item.positive),
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          fill: false,
          yAxisID: 'y-sentiment',
          type: 'line' as any,
          hidden: true
        },
        {
          label: 'Negative Articles',
          data: sentimentData.map(item => item.negative),
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          fill: false,
          yAxisID: 'y-sentiment',
          type: 'line' as any,
          hidden: true
        }
      ]
    }
  }, [sentimentData, portfolioData, chartType])

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#FFFFFF',
        titleColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            if (label.includes('Sentiment')) {
              return `${label}: ${value.toFixed(3)}`
            } else {
              return `${label}: ${value.toFixed(2)}%`
            }
          },
        },
      },
      title: {
        display: true,
        text: 'News Sentiment vs Portfolio Returns',
        color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
      },
      'y-sentiment': {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Sentiment Score',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
      },
      'y-returns': {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Portfolio Returns (%)',
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
      },
    },
  }

  // Load data on mount
  useEffect(() => {
    fetchSentimentData()
  }, [portfolioHoldings])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4" />
          <p>No sentiment data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sentiment Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              News sentiment vs portfolio performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chart Type
            </label>
            <div className="relative">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
                className="appearance-none px-4 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <button
            onClick={fetchSentimentData}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            title="Refresh sentiment data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {chartType === 'bar' ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg Sentiment</p>
          <p className="text-lg font-bold text-blue-600">
            {(sentimentData.reduce((sum, item) => sum + item.sentiment, 0) / sentimentData.length).toFixed(3)}
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Returns</p>
          <p className="text-lg font-bold text-green-600">
            {portfolioData.length > 0 ? portfolioData[portfolioData.length - 1].cumulative.toFixed(2) : '0.00'}%
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
          <p className="text-lg font-bold text-green-600">
            {sentimentData.reduce((sum, item) => sum + item.positive, 0)}
          </p>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Negative</p>
          <p className="text-lg font-bold text-red-600">
            {sentimentData.reduce((sum, item) => sum + item.negative, 0)}
          </p>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sentiment Distribution</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ 
                width: `${sentimentData.reduce((sum, item) => sum + item.positive, 0) / Math.max(sentimentData.reduce((sum, item) => sum + item.count, 0), 1) * 100}%` 
              }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {Math.round(sentimentData.reduce((sum, item) => sum + item.positive, 0) / Math.max(sentimentData.reduce((sum, item) => sum + item.count, 0), 1) * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ 
                width: `${sentimentData.reduce((sum, item) => sum + item.negative, 0) / Math.max(sentimentData.reduce((sum, item) => sum + item.count, 0), 1) * 100}%` 
              }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {Math.round(sentimentData.reduce((sum, item) => sum + item.negative, 0) / Math.max(sentimentData.reduce((sum, item) => sum + item.count, 0), 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default SentimentAnalysisChart
