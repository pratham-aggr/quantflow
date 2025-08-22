import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
  ChartOptions,
  ChartData,
  InteractionItem
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import zoomPlugin from 'chartjs-plugin-zoom'

import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  Maximize2,
  Minimize2,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react'
import { useChartAnimation, useRealTimeValue } from '../lib/animationSystem'

// Register Chart.js plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
)

// Chart types
export type ChartType = 'line' | 'bar' | 'doughnut'
export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

// Data interfaces
export interface ChartDataPoint {
  label: string
  value: number
  timestamp?: number
  metadata?: Record<string, any>
}

export interface InteractiveChartProps {
  data: ChartDataPoint[]
  type?: ChartType
  title?: string
  subtitle?: string
  timeRange?: TimeRange
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  animated?: boolean
  realTime?: boolean
  onDataPointClick?: (point: ChartDataPoint) => void
  onTimeRangeChange?: (range: TimeRange) => void
  onChartTypeChange?: (type: ChartType) => void
  className?: string
}

// Time range options
const TIME_RANGES: { value: TimeRange; label: string; days: number }[] = [
  { value: '1D', label: '1 Day', days: 1 },
  { value: '1W', label: '1 Week', days: 7 },
  { value: '1M', label: '1 Month', days: 30 },
  { value: '3M', label: '3 Months', days: 90 },
  { value: '6M', label: '6 Months', days: 180 },
  { value: '1Y', label: '1 Year', days: 365 },
  { value: 'ALL', label: 'All Time', days: 0 }
]

// Chart type options
const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'line', label: 'Line', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'doughnut', label: 'Doughnut', icon: <PieChart className="w-4 h-4" /> }
]

export const InteractiveDashboardChart: React.FC<InteractiveChartProps> = ({
  data,
  type = 'line',
  title,
  subtitle,
  timeRange = '1M',
  height = 400,
  showLegend = true,
  showGrid = true,
  animated = true,
  realTime = false,
  onDataPointClick,
  onTimeRangeChange,
  onChartTypeChange,
  className = ''
}) => {
  // State management
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>(timeRange)
  const [currentChartType, setCurrentChartType] = useState<ChartType>(type)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Refs
  const lineChartRef = useRef<ChartJS<'line'>>(null)
  const barChartRef = useRef<ChartJS<'bar'>>(null)
  const doughnutChartRef = useRef<ChartJS<'doughnut'>>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animated data
  const animatedData = useChartAnimation(data, {
    type: animated ? 'stagger' : 'fade',
    staggerDelay: 50,
    duration: 800
  })

  // Real-time value updates
  const { value: realTimeData, isAnimating } = useRealTimeValue(data, {
    duration: realTime ? 300 : 0
  })

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (currentTimeRange === 'ALL') return animatedData

    const days = TIME_RANGES.find(r => r.value === currentTimeRange)?.days || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return animatedData.filter(point => {
      if (!point.timestamp) return true
      return new Date(point.timestamp) >= cutoffDate
    })
  }, [animatedData, currentTimeRange])

  // Chart data configuration
  const chartData = useMemo(() => {
    const labels = filteredData.map(point => point.label)
    const values = filteredData.map(point => point.value)

    if (currentChartType === 'doughnut') {
      return {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      }
    }

    return {
      labels,
      datasets: [
        {
          label: title || 'Value',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: type === 'line',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }
      ]
    }
  }, [filteredData, currentChartType, title, type])

  // Chart options
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const point = filteredData[context.dataIndex]
              return `${context.dataset.label}: ${point.value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}`
            }
          }
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'xy' as const,
          },
          pan: {
            enabled: true,
            mode: 'xy' as const,
          },
        },

      },
      onClick: (event: any, elements: any) => {
        if (elements.length > 0) {
          const element = elements[0] as InteractionItem
          const point = filteredData[element.index]
          setSelectedPoint(point)
          onDataPointClick?.(point)
        }
      }
    }

    if (currentChartType === 'doughnut') {
      return baseOptions
    }

    return {
      ...baseOptions,
      scales: {
        x: {
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            maxTicksLimit: 10,
            font: {
              size: 11
            }
          }
        },
        y: {
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            font: {
              size: 11
            },
            callback: (value: any) => {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(Number(value))
            }
          }
        }
      }
    }
  }, [filteredData, showLegend, showGrid, currentChartType, onDataPointClick])

  // Event handlers
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setCurrentTimeRange(range)
    onTimeRangeChange?.(range)
  }, [onTimeRangeChange])

  const handleChartTypeChange = useCallback((chartType: ChartType) => {
    setCurrentChartType(chartType)
    onChartTypeChange?.(chartType)
  }, [onChartTypeChange])

  const handleZoomIn = useCallback(() => {
    const chart = lineChartRef.current || barChartRef.current
    if (chart) {
      chart.zoom(1.2)
      setZoomLevel(prev => prev * 1.2)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    const chart = lineChartRef.current || barChartRef.current
    if (chart) {
      chart.zoom(0.8)
      setZoomLevel(prev => prev * 0.8)
    }
  }, [])

  const handleReset = useCallback(() => {
    const chart = lineChartRef.current || barChartRef.current
    if (chart) {
      chart.resetZoom()
      setZoomLevel(1)
    }
  }, [])

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    }
  }, [isFullscreen])

  const handleDownload = useCallback(() => {
    const chart = lineChartRef.current || barChartRef.current || doughnutChartRef.current
    if (chart) {
      const canvas = chart.canvas
      const link = document.createElement('a')
      link.download = `${title || 'chart'}-${currentTimeRange}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
  }, [title, currentTimeRange])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Loading state simulation
  useEffect(() => {
    if (realTime && isAnimating) {
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [realTime, isAnimating])

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Chart Type Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {CHART_TYPES.map((chartType) => (
              <button
                key={chartType.value}
                onClick={() => handleChartTypeChange(chartType.value)}
                className={`p-2 rounded-md transition-colors ${
                  currentChartType === chartType.value
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={chartType.label}
              >
                {chartType.icon}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  currentTimeRange === range.value
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleDownload}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title="Download Chart"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 p-4">
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        <div className="relative" style={{ height: '100%' }}>
          {currentChartType === 'line' && (
            <Line
              ref={lineChartRef}
              data={chartData}
              options={chartOptions}
            />
          )}
          {currentChartType === 'bar' && (
            <Bar
              ref={barChartRef}
              data={chartData}
              options={chartOptions}
            />
          )}
          {currentChartType === 'doughnut' && (
            <Doughnut
              ref={doughnutChartRef}
              data={chartData}
              options={chartOptions}
            />
          )}
        </div>

        {/* Selected Point Info */}
        {selectedPoint && (
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {selectedPoint.label}
            </h4>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {selectedPoint.value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </p>
            {selectedPoint.metadata && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {Object.entries(selectedPoint.metadata).map(([key, value]) => (
                  <div key={key}>
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Real-time Indicator */}
        {realTime && isAnimating && (
          <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Data Points: {filteredData.length}</span>
          <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}
