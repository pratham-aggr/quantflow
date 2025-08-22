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
  TimeScale,
  ChartOptions
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart, 
  Settings, 
  Download,
  Maximize2,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react'
import { marketDataService, HistoricalData, StockQuote } from '../lib/marketDataService'
import { useToast } from './Toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface InteractiveStockChartProps {
  symbol: string
  height?: number
  showTechnicalIndicators?: boolean
  showVolume?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

type ChartType = 'line' | 'candlestick' | 'volume'
type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y'
type TechnicalIndicator = 'MA20' | 'MA50' | 'RSI' | 'BOLLINGER'

interface ChartData {
  labels: string[]
  datasets: any[]
}

export const InteractiveStockChart: React.FC<InteractiveStockChartProps> = ({
  symbol,
  height = 400,
  showTechnicalIndicators = true,
  showVolume = true,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null)
  const [realtimeQuote, setRealtimeQuote] = useState<StockQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [timeRange, setTimeRange] = useState<TimeRange>('1M')
  const [selectedIndicators, setSelectedIndicators] = useState<Set<TechnicalIndicator>>(new Set(['MA20'] as TechnicalIndicator[]))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { success, error: showError, info } = useToast()

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const to = new Date()
    const from = new Date()
    
    switch (timeRange) {
      case '1D':
        from.setHours(from.getHours() - 24)
        break
      case '5D':
        from.setDate(from.getDate() - 5)
        break
      case '1M':
        from.setMonth(from.getMonth() - 1)
        break
      case '3M':
        from.setMonth(from.getMonth() - 3)
        break
      case '6M':
        from.setMonth(from.getMonth() - 6)
        break
      case '1Y':
        from.setFullYear(from.getFullYear() - 1)
        break
      case '2Y':
        from.setFullYear(from.getFullYear() - 2)
        break
    }
    
    return { from, to }
  }, [timeRange])

  // Fetch historical data
  const fetchHistoricalData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const resolution = timeRange === '1D' || timeRange === '5D' ? 'D' : 'D'
      const data = await marketDataService.getHistoricalData(symbol, dateRange.from, dateRange.to, resolution)
      
      if (data && data.timestamps.length > 0) {
        setHistoricalData(data)
      } else {
        setError('No historical data available for this symbol')
      }
    } catch (err) {
      setError('Failed to fetch historical data')
      showError('Data Error', 'Failed to load historical price data')
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!symbol) return

    // Connect WebSocket if not already connected
    marketDataService.connectWebSocket()

    // Subscribe to real-time updates
    const unsubscribe = marketDataService.subscribeToRealTimeUpdates(symbol, (quote) => {
      setRealtimeQuote(quote)
    })

    return () => {
      unsubscribe()
    }
  }, [symbol])

  // Fetch data when symbol or time range changes
  useEffect(() => {
    if (symbol) {
      fetchHistoricalData()
    }
  }, [symbol, timeRange])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !symbol) return

    const interval = setInterval(() => {
      fetchHistoricalData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, symbol, refreshInterval, timeRange])

  // Calculate technical indicators
  const calculateTechnicalIndicators = useMemo(() => {
    if (!historicalData || !historicalData.closes.length) return {}

    const indicators: Record<string, number[]> = {}

    if (selectedIndicators.has('MA20')) {
      indicators.MA20 = marketDataService.calculateMovingAverage(historicalData.closes, 20)
    }

    if (selectedIndicators.has('MA50')) {
      indicators.MA50 = marketDataService.calculateMovingAverage(historicalData.closes, 50)
    }

    if (selectedIndicators.has('RSI')) {
      indicators.RSI = marketDataService.calculateRSI(historicalData.closes)
    }

    if (selectedIndicators.has('BOLLINGER')) {
      const ma20 = marketDataService.calculateMovingAverage(historicalData.closes, 20)
      const standardDeviations: number[] = []
      
      for (let i = 19; i < historicalData.closes.length; i++) {
        const slice = historicalData.closes.slice(i - 19, i + 1)
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length
        standardDeviations.push(Math.sqrt(variance))
      }
      
      indicators.BollingerUpper = ma20.map((ma, i) => ma + (standardDeviations[i] * 2))
      indicators.BollingerLower = ma20.map((ma, i) => ma - (standardDeviations[i] * 2))
    }

    return indicators
  }, [historicalData, selectedIndicators])

  // Prepare chart data
  const chartData: ChartData = useMemo(() => {
    if (!historicalData) {
      return { labels: [], datasets: [] }
    }

    const labels = historicalData.timestamps.map(ts => new Date(ts * 1000).toISOString())
    const datasets = []

    // Main price line
    datasets.push({
      label: `${symbol} Price`,
      data: historicalData.closes,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 5
    })

    // Add real-time data point if available
    if (realtimeQuote && realtimeQuote.price) {
      const lastTimestamp = historicalData.timestamps[historicalData.timestamps.length - 1] * 1000
      const realtimeTimestamp = Date.now()
      
      if (realtimeTimestamp > lastTimestamp) {
        labels.push(new Date(realtimeTimestamp).toISOString())
        datasets[0].data.push(realtimeQuote.price)
      }
    }

    // Technical indicators
    if (showTechnicalIndicators) {
      if (calculateTechnicalIndicators.MA20) {
        datasets.push({
          label: 'MA 20',
          data: [
            ...Array(historicalData.closes.length - calculateTechnicalIndicators.MA20.length).fill(null),
            ...calculateTechnicalIndicators.MA20
          ],
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        })
      }

      if (calculateTechnicalIndicators.MA50) {
        datasets.push({
          label: 'MA 50',
          data: [
            ...Array(historicalData.closes.length - calculateTechnicalIndicators.MA50.length).fill(null),
            ...calculateTechnicalIndicators.MA50
          ],
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        })
      }

      if (calculateTechnicalIndicators.BollingerUpper && calculateTechnicalIndicators.BollingerLower) {
        datasets.push({
          label: 'Bollinger Upper',
          data: [
            ...Array(historicalData.closes.length - calculateTechnicalIndicators.BollingerUpper.length).fill(null),
            ...calculateTechnicalIndicators.BollingerUpper
          ],
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        })

        datasets.push({
          label: 'Bollinger Lower',
          data: [
            ...Array(historicalData.closes.length - calculateTechnicalIndicators.BollingerLower.length).fill(null),
            ...calculateTechnicalIndicators.BollingerLower
          ],
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderWidth: 1,
          fill: '+1',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          pointRadius: 0
        })
      }
    }

    return { labels, datasets }
  }, [historicalData, realtimeQuote, symbol, showTechnicalIndicators, calculateTechnicalIndicators])

  // Volume chart data
  const volumeChartData: ChartData = useMemo(() => {
    if (!historicalData || !showVolume) {
      return { labels: [], datasets: [] }
    }

    const labels = historicalData.timestamps.map(ts => new Date(ts * 1000).toISOString())
    
    return {
      labels,
      datasets: [{
        label: 'Volume',
        data: historicalData.volumes,
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgba(156, 163, 175, 1)',
        borderWidth: 1
      }]
    }
  }, [historicalData, showVolume])

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        display: true
      },
      title: {
        display: true,
        text: `${symbol} - ${timeRange} Chart`
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(2) : context.parsed.y
            return `${label}: $${value}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '1D' ? 'hour' : timeRange === '5D' ? 'day' : 'day'
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Price ($)'
        }
      }
    }
  }

  const volumeChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '1D' ? 'hour' : 'day'
        }
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Volume'
        }
      }
    }
  }

  const toggleIndicator = (indicator: TechnicalIndicator) => {
    const newIndicators = new Set(selectedIndicators)
    if (newIndicators.has(indicator)) {
      newIndicators.delete(indicator)
    } else {
      newIndicators.add(indicator)
    }
    setSelectedIndicators(newIndicators)
  }

  const exportChart = () => {
    // Implementation for chart export
            info('Export', 'Chart export functionality coming soon!')
  }

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white p-4' 
    : 'relative'

  return (
    <div className={containerClass}>
      <div className="bg-white rounded-lg shadow-lg border">
        {/* Chart Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol} Interactive Chart
            </h3>
            {realtimeQuote && (
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900">
                  ${realtimeQuote.price.toFixed(2)}
                </span>
                <span className={`flex items-center text-sm font-medium ${
                  realtimeQuote.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {realtimeQuote.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {realtimeQuote.change >= 0 ? '+' : ''}${realtimeQuote.change.toFixed(2)} ({realtimeQuote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Chart Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={exportChart}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export Chart"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={fetchHistoricalData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <div className="flex flex-wrap gap-1">
                  {(['1D', '5D', '1M', '3M', '6M', '1Y', '2Y'] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        timeRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border hover:bg-gray-50'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setChartType('line')}
                    className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                      chartType === 'line'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    <LineChart className="w-4 h-4 mr-1" />
                    Line
                  </button>
                  <button
                    onClick={() => setChartType('volume')}
                    className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                      chartType === 'volume'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Volume
                  </button>
                </div>
              </div>

              {/* Technical Indicators */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technical Indicators</label>
                <div className="flex flex-wrap gap-1">
                  {(['MA20', 'MA50', 'RSI', 'BOLLINGER'] as TechnicalIndicator[]).map((indicator) => (
                    <button
                      key={indicator}
                      onClick={() => toggleIndicator(indicator)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedIndicators.has(indicator)
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 border hover:bg-gray-50'
                      }`}
                    >
                      {indicator}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading chart data...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 mb-2">{error}</div>
                <button
                  onClick={fetchHistoricalData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && chartData.labels.length > 0 && (
            <div className="space-y-4">
              {/* Main Chart */}
              <div style={{ height: `${height}px` }}>
                <Line data={chartData} options={chartOptions} />
              </div>

              {/* Volume Chart */}
              {showVolume && volumeChartData.labels.length > 0 && (
                <div style={{ height: '150px' }}>
                  <Bar data={volumeChartData} options={volumeChartOptions} />
                </div>
              )}

              {/* RSI Chart */}
              {selectedIndicators.has('RSI') && calculateTechnicalIndicators.RSI && (
                <div style={{ height: '120px' }}>
                  <Line 
                    data={{
                      labels: chartData.labels.slice(-calculateTechnicalIndicators.RSI.length),
                      datasets: [{
                        label: 'RSI',
                        data: calculateTechnicalIndicators.RSI,
                        borderColor: 'rgb(147, 51, 234)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'RSI (14)' }
                      },
                      scales: {
                        y: {
                          min: 0,
                          max: 100,
                          ticks: {
                            callback: function(value) {
                              if (value === 30 || value === 70) {
                                return value.toString()
                              }
                              return ''
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
