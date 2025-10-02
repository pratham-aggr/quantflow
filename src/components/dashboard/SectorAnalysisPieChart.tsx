import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { PieChart as PieChartIcon } from 'lucide-react'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
)

interface SectorAnalysis {
  sector_allocation: Record<string, number>
  sector_risk: Record<string, number>
  concentration_risk: number
  recommendations: string[]
}

interface SectorAnalysisPieChartProps {
  analysis: SectorAnalysis
  className?: string
}

const SectorAnalysisPieChart: React.FC<SectorAnalysisPieChartProps> = ({ 
  analysis, 
  className = '' 
}) => {
  const chartData = useMemo(() => {
    const sectors = Object.keys(analysis.sector_allocation)
    const allocations = Object.values(analysis.sector_allocation)
    
    // Generate colors for each sector
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#EC4899', // Pink
      '#84CC16', // Lime
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#F43F5E', // Rose
    ]

    return {
      labels: sectors,
      datasets: [
        {
          data: allocations,
          backgroundColor: sectors.map((_, index) => colors[index % colors.length]),
          borderColor: sectors.map((_, index) => colors[index % colors.length]),
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      ],
    }
  }, [analysis.sector_allocation])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
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
            const label = context.label || ''
            const value = context.parsed
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${percentage}% ($${(value / 100).toLocaleString()})`
          },
        },
      },
      title: {
        display: true,
        text: 'Portfolio Sector Allocation',
        color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
  }

  // Calculate total portfolio value
  const totalValue = Object.values(analysis.sector_allocation).reduce((sum, allocation) => sum + allocation, 0)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <PieChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sector Allocation</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Portfolio distribution across sectors
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <Pie data={chartData} options={options} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Object.keys(analysis.sector_allocation).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Sectors</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            ${(totalValue / 100).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {(analysis.concentration_risk * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Concentration Risk</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.max(...Object.values(analysis.sector_allocation)).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Largest Sector</div>
        </div>
      </div>

      {/* Top Sectors */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Sectors</h4>
        <div className="space-y-2">
          {Object.entries(analysis.sector_allocation)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([sector, allocation], index) => (
              <div key={sector} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index]
                  }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sector}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{allocation.toFixed(1)}%</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default SectorAnalysisPieChart
