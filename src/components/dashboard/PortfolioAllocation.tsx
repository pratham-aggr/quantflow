import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

interface AllocationData {
  sector: string
  value: number
  percentage: number
}

interface PortfolioAllocationProps {
  data: AllocationData[]
}

const colors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
]

export const PortfolioAllocation: React.FC<PortfolioAllocationProps> = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.sector),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets[0]
            const backgroundColor = datasets.backgroundColor as string[]
            const borderColor = datasets.borderColor as string[]
            
            return chart.data.labels!.map((label, index) => ({
              text: `${label} (${data[index].percentage}%)`,
              fillStyle: backgroundColor[index] || colors[index],
              strokeStyle: borderColor[index] || colors[index] + '80',
              lineWidth: 2,
              pointStyle: 'circle',
              hidden: false,
              index,
            }))
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed
            const percentage = data[context.dataIndex]?.percentage || 0
            return `${label}: $${value.toLocaleString()} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <Pie data={chartData} options={options} />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.slice(0, 6).map((item, index) => (
          <div
            key={item.sector}
            className="flex items-center p-3 bg-gray-50 rounded-lg"
          >
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: colors[index] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.sector}
              </p>
              <p className="text-xs text-gray-500">
                {item.percentage}%
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total Value */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Total Portfolio Value</span>
          <span className="text-lg font-bold text-blue-900">
            ${data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
