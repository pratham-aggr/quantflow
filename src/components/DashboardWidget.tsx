import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  GripVertical, 
  X, 
  Settings, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Download,
  MoreVertical
} from 'lucide-react'
import { Menu } from '@headlessui/react'
import { useNumberAnimation, useSlideIn, usePulse } from '../lib/animationSystem'

// Widget types
export type WidgetType = 'metric' | 'chart' | 'table' | 'gauge' | 'list' | 'custom'

// Widget size options
export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

// Widget interface
export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  position: { x: number; y: number }
  data?: any
  settings?: Record<string, any>
  refreshInterval?: number
  isVisible?: boolean
  isMinimized?: boolean
}

// Widget props
export interface DashboardWidgetProps {
  config: WidgetConfig
  onUpdate: (config: WidgetConfig) => void
  onDelete: (id: string) => void
  onDuplicate: (config: WidgetConfig) => void
  onRefresh: (id: string) => void
  isDragging?: boolean
  className?: string
}

// Size configurations
const SIZE_CONFIGS = {
  small: { cols: 1, rows: 1, minH: 100, minW: 200 },
  medium: { cols: 2, rows: 1, minH: 150, minW: 300 },
  large: { cols: 2, rows: 2, minH: 200, minW: 400 },
  full: { cols: 4, rows: 2, minH: 250, minW: 600 }
}

// Widget content components
const MetricWidget: React.FC<{ data: any; settings?: any }> = ({ data, settings }) => {
  const animatedValue = useNumberAnimation(data?.value || 0, {
    from: 0,
    format: 'currency',
    duration: 800
  })

  const animatedChange = useNumberAnimation(data?.change || 0, {
    from: 0,
    format: 'percentage',
    duration: 600
  })

  const isPositive = (data?.change || 0) >= 0
  const pulseStyle = usePulse(data?.isLive)

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2" style={pulseStyle}>
          {animatedValue}
        </div>
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{animatedChange}
        </div>
        {data?.label && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.label}
          </div>
        )}
      </div>
    </div>
  )
}

const GaugeWidget: React.FC<{ data: any; settings?: any }> = ({ data, settings }) => {
  const animatedValue = useNumberAnimation(data?.value || 0, {
    from: 0,
    duration: 1000
  })

  const percentage = Math.min(Math.max((data?.value || 0) / (data?.max || 100), 0), 1)
  const angle = percentage * 180 - 90

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="relative w-24 h-24">
        {/* Gauge background */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 50">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Gauge fill */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeDasharray={`${percentage * 125.6} 125.6`}
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {Math.round(Number(animatedValue))}%
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center">
        {data?.label || 'Progress'}
      </div>
    </div>
  )
}

const ListWidget: React.FC<{ data: any; settings?: any }> = ({ data, settings }) => {
  const items = data?.items || []
  const slideInStyle = useSlideIn(true, 'up')

  return (
    <div className="h-full p-4 overflow-hidden">
      <div className="space-y-2" style={slideInStyle}>
        {items.map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="flex items-center space-x-2">
              {item.icon && (
                <div className="w-4 h-4 text-blue-500">
                  {item.icon}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TableWidget: React.FC<{ data: any; settings?: any }> = ({ data, settings }) => {
  const columns = data?.columns || []
  const rows = data?.rows || []

  return (
    <div className="h-full overflow-hidden">
      <div className="overflow-x-auto h-full">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column: any, index: number) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((column: any, colIndex: number) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main widget component
export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  config,
  onUpdate,
  onDelete,
  onDuplicate,
  onRefresh,
  isDragging = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({ id: config.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (config.refreshInterval && config.refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        handleRefresh()
      }, config.refreshInterval * 1000)
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current)
      }
    }
  }, [config.refreshInterval])

  // Event handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    onRefresh(config.id)
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }, [config.id, onRefresh])

  const handleMinimize = useCallback(() => {
    onUpdate({
      ...config,
      isMinimized: !config.isMinimized
    })
  }, [config, onUpdate])

  const handleSizeChange = useCallback((size: WidgetSize) => {
    onUpdate({
      ...config,
      size
    })
  }, [config, onUpdate])

  const handleDuplicate = useCallback(() => {
    onDuplicate({
      ...config,
      id: `${config.id}-copy-${Date.now()}`,
      position: { x: config.position.x + 20, y: config.position.y + 20 }
    })
  }, [config, onDuplicate])

  const handleDelete = useCallback(() => {
    onDelete(config.id)
  }, [config.id, onDelete])

  // Render widget content based on type
  const renderWidgetContent = () => {
    if (config.isMinimized) {
      return (
        <div className="flex items-center justify-center h-full p-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {config.title} (Minimized)
          </span>
        </div>
      )
    }

    switch (config.type) {
      case 'metric':
        return <MetricWidget data={config.data} settings={config.settings} />
      case 'gauge':
        return <GaugeWidget data={config.data} settings={config.settings} />
      case 'list':
        return <ListWidget data={config.data} settings={config.settings} />
      case 'table':
        return <TableWidget data={config.data} settings={config.settings} />
      case 'chart':
        return (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Chart Widget
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Interactive charts will be rendered here
              </div>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Custom Widget
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {config.data?.content || 'No content available'}
              </div>
            </div>
          </div>
        )
    }
  }

  const sizeConfig = SIZE_CONFIGS[config.size]

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        gridColumn: `span ${sizeConfig.cols}`,
        gridRow: `span ${sizeConfig.rows}`,
        minHeight: sizeConfig.minH,
        minWidth: sizeConfig.minW
      }}
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        transition-all duration-200 hover:shadow-md
        ${isDragging ? 'z-50' : 'z-10'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          
          {/* Title */}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {config.title}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-primary-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Minimize/Maximize button */}
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={config.isMinimized ? "Maximize" : "Minimize"}
          >
            {config.isMinimized ? (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* More options menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDuplicate}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Duplicate
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDelete}
                      className={`${
                        active ? 'bg-red-50 dark:bg-red-900/20' : ''
                      } flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderWidgetContent()}
      </div>

      {/* Size indicator (only on hover) */}
      {isHovered && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {config.size}
        </div>
      )}
    </div>
  )
}
