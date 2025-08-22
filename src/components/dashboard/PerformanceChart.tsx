import React from 'react'
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PerformanceChartProps {
  data: number[]
  timeRange: '1D' | '1W' | '1M' | '1Y'
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, timeRange }) => {
  const generateLabels = () => {
    switch (timeRange) {
      case '1D':
        return ['9AM', '11AM', '1PM', '3PM', '5PM', 'Close']
      case '1W':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      case '1M':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      case '1Y':
        return ['Jan', 'Apr', 'Jul', 'Oct', 'Dec']
      default:
        return data.map((_, index) => `Point ${index + 1}`)
    }
  }

  const calculateChange = () => {
    if (data.length < 2) return 0
    const first = data[0]
    const last = data[data.length - 1]
    return ((last - first) / first) * 100
  }

  const change = calculateChange()
  const isPositive = change >= 0

  const chartData = {
    labels: generateLabels(),
    datasets: [
      {
        label: 'Portfolio Value',
        data: data,
        borderColor: isPositive ? '#10B981' : '#EF4444',
        backgroundColor: isPositive ? '#10B98120' : '#EF444420',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: isPositive ? '#10B981' : '#EF4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isPositive ? '#10B981' : '#EF4444',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            return `Value: $${context.parsed.y.toLocaleString()}`
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
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: '#E5E7EB',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
          callback: (value) => {
            return `$${(value as number / 1000).toFixed(0)}k`
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

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Performance</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Current Value</p>
          <p className="text-lg font-bold text-gray-900">
            ${data[data.length - 1]?.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>

      {/* Time Range Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {timeRange === '1D' && 'Intraday performance'}
          {timeRange === '1W' && 'Weekly performance'}
          {timeRange === '1M' && 'Monthly performance'}
          {timeRange === '1Y' && 'Yearly performance'}
        </p>
      </div>
    </div>
  )
}
