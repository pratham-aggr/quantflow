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
    <div className={className}>
      {/* Just the Chart - No Card */}
      <div className="h-80">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  )
}

export default SectorAnalysisPieChart
