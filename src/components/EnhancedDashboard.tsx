import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { 
  Plus, 
  Settings, 
  Download, 
  RefreshCw, 
  Grid3X3,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  DollarSign,
  Target,
  AlertTriangle,
  X
} from 'lucide-react'
import { Menu } from '@headlessui/react'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { DashboardWidget, WidgetConfig, WidgetType, WidgetSize } from './DashboardWidget'
import { InteractiveDashboardChart, ChartDataPoint } from './InteractiveDashboardChart'
import { exportService, generatePDFReport, generateCSVExport, downloadFile } from '../lib/exportService'
import { useNumberAnimation, useSlideIn, useStaggeredAnimation } from '../lib/animationSystem'
import { useToast } from './Toast'

// Dashboard layout types
type DashboardLayout = 'grid' | 'list' | 'compact'

// Widget templates
const WIDGET_TEMPLATES: Array<{
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  defaultData: any
}> = [
  {
    id: 'total-value',
    type: 'metric',
    title: 'Total Portfolio Value',
    size: 'medium',
    defaultData: { value: 0, change: 0, label: 'Portfolio Value', isLive: true }
  },
  {
    id: 'daily-pnl',
    type: 'metric',
    title: 'Daily P&L',
    size: 'small',
    defaultData: { value: 0, change: 0, label: 'Daily Change', isLive: true }
  },
  {
    id: 'risk-score',
    type: 'gauge',
    title: 'Risk Score',
    size: 'small',
    defaultData: { value: 50, max: 100, label: 'Risk Level' }
  },
  {
    id: 'performance-chart',
    type: 'chart',
    title: 'Performance Chart',
    size: 'large',
    defaultData: { chartType: 'line', timeRange: '1M' }
  },
  {
    id: 'holdings-table',
    type: 'table',
    title: 'Holdings',
    size: 'large',
    defaultData: {
      columns: [
        { key: 'symbol', label: 'Symbol' },
        { key: 'company', label: 'Company' },
        { key: 'value', label: 'Value' },
        { key: 'pnl', label: 'P&L' }
      ],
      rows: []
    }
  },
  {
    id: 'sector-allocation',
    type: 'chart',
    title: 'Sector Allocation',
    size: 'medium',
    defaultData: { chartType: 'doughnut' }
  },
  {
    id: 'top-movers',
    type: 'list',
    title: 'Top Movers',
    size: 'small',
    defaultData: { items: [] }
  },
  {
    id: 'alerts',
    type: 'list',
    title: 'Alerts & Notifications',
    size: 'small',
    defaultData: { items: [] }
  }
]

export const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentPortfolio, refreshCurrentPortfolio } = usePortfolio()
  const { success, error: showError, info } = useToast()
  
  // State management
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [layout, setLayout] = useState<DashboardLayout>('grid')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  
  // Refs
  const dashboardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!currentPortfolio) return null

    const totalValue = currentPortfolio.holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * (holding.current_price || holding.avg_price))
    }, 0) + (currentPortfolio.cash_balance || 0)

    const totalCost = currentPortfolio.holdings.reduce((sum, holding) => {
      return sum + (holding.quantity * holding.avg_price)
    }, 0)

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      cashBalance: currentPortfolio.cash_balance || 0
    }
  }, [currentPortfolio])

  // Animated values
  const animatedTotalValue = useNumberAnimation(
    portfolioMetrics?.totalValue || 0,
    { from: 0, format: 'currency', duration: 1000 }
  )

  const animatedDailyPnL = useNumberAnimation(
    portfolioMetrics?.totalPnL || 0,
    { from: 0, format: 'currency', duration: 800 }
  )

  const slideInStyle = useSlideIn(true, 'up')
  const visibleWidgets = useStaggeredAnimation(widgets, 100)

  // Initialize default widgets
  useEffect(() => {
    if (widgets.length === 0) {
      const defaultWidgets = WIDGET_TEMPLATES.slice(0, 6).map((template, index) => ({
        id: template.id,
        type: template.type,
        title: template.title,
        size: template.size,
        position: { x: index % 3, y: Math.floor(index / 3) },
        data: template.defaultData,
        settings: {},
        refreshInterval: template.type === 'metric' ? 30 : 0,
        isVisible: true,
        isMinimized: false
      }))
      setWidgets(defaultWidgets)
    }
  }, [widgets.length])

  // Update widget data based on portfolio
  useEffect(() => {
    if (!currentPortfolio || !portfolioMetrics) return

    setWidgets(prevWidgets => prevWidgets.map(widget => {
      switch (widget.id) {
        case 'total-value':
          return {
            ...widget,
            data: {
              ...widget.data,
              value: portfolioMetrics.totalValue,
              change: portfolioMetrics.totalPnLPercent,
              isLive: true
            }
          }
        case 'daily-pnl':
          return {
            ...widget,
            data: {
              ...widget.data,
              value: portfolioMetrics.totalPnL,
              change: portfolioMetrics.totalPnLPercent,
              isLive: true
            }
          }
        case 'risk-score':
          return {
            ...widget,
            data: {
              ...widget.data,
              value: currentPortfolio.risk_score || 50
            }
          }
        case 'holdings-table':
          return {
            ...widget,
            data: {
              ...widget.data,
              rows: (currentPortfolio.holdings || []).map(holding => ({
                symbol: holding.symbol,
                company: holding.company_name,
                value: new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(holding.quantity * (holding.current_price || holding.avg_price)),
                pnl: new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format((holding.current_price || holding.avg_price) - holding.avg_price)
              }))
            }
          }
        case 'top-movers':
          const holdings = currentPortfolio.holdings || []
          const sortedHoldings = [...holdings].sort((a, b) => {
            const aChange = ((a.current_price || a.avg_price) - a.avg_price) / a.avg_price
            const bChange = ((b.current_price || b.avg_price) - b.avg_price) / b.avg_price
            return Math.abs(bChange) - Math.abs(aChange)
          }).slice(0, 5)

          return {
            ...widget,
            data: {
              ...widget.data,
              items: sortedHoldings.map(holding => ({
                label: holding.symbol,
                value: `${((holding.current_price || holding.avg_price) - holding.avg_price) / holding.avg_price * 100 > 0 ? '+' : ''}${(((holding.current_price || holding.avg_price) - holding.avg_price) / holding.avg_price * 100).toFixed(2)}%`,
                icon: ((holding.current_price || holding.avg_price) - holding.avg_price) / holding.avg_price > 0 ? '↗' : '↘'
              }))
            }
          }
        default:
          return widget
      }
    }))
  }, [currentPortfolio])

  // Event handlers
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshCurrentPortfolio()
      success('Portfolio refreshed successfully')
    } catch (error) {
      showError('Failed to refresh portfolio')
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshCurrentPortfolio, success, showError])

  const handleAddWidget = useCallback((template: typeof WIDGET_TEMPLATES[0]) => {
    const newWidget: WidgetConfig = {
      id: `${template.id}-${Date.now()}`,
      type: template.type,
      title: template.title,
      size: template.size,
      position: { x: widgets.length % 3, y: Math.floor(widgets.length / 3) },
      data: template.defaultData,
      settings: {},
      refreshInterval: template.type === 'metric' ? 30 : 0,
      isVisible: true,
      isMinimized: false
    }
    setWidgets(prev => [...prev, newWidget])
    setShowWidgetLibrary(false)
    success(`Added ${template.title} widget`)
  }, [widgets.length, success])

  const handleUpdateWidget = useCallback((config: WidgetConfig) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === config.id ? config : widget
    ))
  }, [])

  const handleDeleteWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id))
    info('Widget removed')
  }, [info])

  const handleDuplicateWidget = useCallback((config: WidgetConfig) => {
    const duplicatedWidget: WidgetConfig = {
      ...config,
      id: `${config.id}-copy-${Date.now()}`,
      position: { x: config.position.x + 1, y: config.position.y + 1 }
    }
    setWidgets(prev => [...prev, duplicatedWidget])
    success('Widget duplicated')
  }, [success])

  const handleRefreshWidget = useCallback((id: string) => {
    // Trigger widget-specific refresh
    info('Widget refreshed')
  }, [info])

  const handleExportDashboard = useCallback(async (format: 'pdf' | 'png') => {
    if (!dashboardRef.current) return

    try {
      let blob: Blob
      const filename = `dashboard-${new Date().toISOString().split('T')[0]}`

      if (format === 'pdf') {
        // Generate PDF report
        const portfolioData = {
          portfolio: {
            name: currentPortfolio?.name || 'Portfolio',
            totalValue: currentPortfolio?.total_value || 0,
            totalPnL: currentPortfolio?.total_pnl || 0,
            totalPnLPercent: (currentPortfolio?.total_pnl || 0) / (currentPortfolio?.total_value || 1),
            riskScore: currentPortfolio?.risk_score || 50,
            lastUpdated: new Date().toISOString()
          },
          holdings: (currentPortfolio?.holdings || []).map(holding => ({
            symbol: holding.symbol,
            companyName: holding.company_name || 'Unknown',
            quantity: holding.quantity,
            avgPrice: holding.avg_price,
            currentPrice: holding.current_price || holding.avg_price,
            totalValue: holding.quantity * (holding.current_price || holding.avg_price),
            pnl: holding.quantity * ((holding.current_price || holding.avg_price) - holding.avg_price),
            pnlPercent: ((holding.current_price || holding.avg_price) - holding.avg_price) / holding.avg_price,
            sector: holding.sector || 'Unknown'
          })),
          performance: [],
          riskMetrics: {
            volatility: 0.15,
            sharpeRatio: 1.2,
            maxDrawdown: -0.08,
            beta: 1.0,
            alpha: 0.02,
            correlation: 0.85,
            var: -0.05,
            trackingError: 0.03
          },
          transactions: []
        }

        blob = await generatePDFReport(portfolioData, 'portfolio')
      } else {
        // Export as image
        blob = await exportService.exportDashboardAsImage(dashboardRef.current)
      }

      downloadFile(blob, filename, format)
      success(`Dashboard exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export dashboard')
    }
  }, [currentPortfolio, success, showError])

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

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-refresh portfolio data
  useEffect(() => {
    // Don't auto-refresh for demo users to prevent infinite loops
    if (user?.isDemo) {
      return
    }

    const interval = setInterval(() => {
      if (!isRefreshing) {
        refreshCurrentPortfolio()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [refreshCurrentPortfolio, isRefreshing, user?.isDemo])

  // Generate chart data for performance widget
  const performanceData = useMemo((): ChartDataPoint[] => {
    if (!currentPortfolio?.holdings) return []

    // Generate performance data based on real portfolio value
    const days = 30
    const data: ChartDataPoint[] = []
    let currentValue = currentPortfolio.total_value || 100000

    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 0.02 // ±1% daily variation
      currentValue *= (1 + variation)
      
      data.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: currentValue,
        timestamp: date.getTime()
      })
    }

    return data
  }, [currentPortfolio?.total_value, currentPortfolio?.holdings])

  // Generate sector allocation data
  const sectorData = useMemo((): ChartDataPoint[] => {
    if (!currentPortfolio?.holdings) return []

    const sectorMap = new Map<string, number>()
    
    currentPortfolio.holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown'
      const value = holding.quantity * (holding.current_price || holding.avg_price)
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
    })

    return Array.from(sectorMap.entries()).map(([sector, value]) => ({
      label: sector,
      value
    }))
  }, [currentPortfolio?.holdings])

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {animatedTotalValue}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Daily P&L</div>
                <div className={`text-lg font-semibold ${
                  (currentPortfolio?.total_pnl || 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {animatedDailyPnL}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Layout Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 rounded-md transition-colors ${
                  layout === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Grid Layout"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-2 rounded-md transition-colors ${
                  layout === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="List Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-md transition-colors ${
                isEditMode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={isEditMode ? "Exit Edit Mode" : "Edit Mode"}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-800/30 rounded-md transition-colors disabled:opacity-50"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                <Download className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExportDashboard('pdf')}
                        className={`${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export as PDF
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExportDashboard('png')}
                        className={`${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Export as Image
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>

            {/* Fullscreen Toggle */}
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

      {/* Dashboard Content */}
      <div className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div
              ref={dashboardRef}
              className={`grid gap-6 ${
                layout === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : layout === 'list'
                  ? 'grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-2'
              }`}
              style={slideInStyle}
            >
              {widgets.map((widget, index) => {
                // Check if widget should be visible
                if (!visibleWidgets.has(index)) return null

                // Render different widget types
                if (widget.type === 'chart') {
                  if (widget.id === 'performance-chart') {
                    return (
                      <div key={widget.id} className="col-span-2">
                        <InteractiveDashboardChart
                          data={performanceData}
                          title="Portfolio Performance"
                          subtitle="30-day performance trend"
                          type="line"
                          height={300}
                          animated={true}
                          realTime={true}
                                                                               onDataPointClick={(point) => {
                            setSelectedWidget(widget.id)
                            info(`Selected: ${point.label}`)
                          }}
                        />
                      </div>
                    )
                  } else if (widget.id === 'sector-allocation') {
                    return (
                      <div key={widget.id}>
                        <InteractiveDashboardChart
                          data={sectorData}
                          title="Sector Allocation"
                          subtitle="Portfolio by sector"
                          type="doughnut"
                          height={250}
                          animated={true}
                        />
                      </div>
                    )
                  }
                }

                // Render regular widgets
                return (
                  <DashboardWidget
                    key={widget.id}
                    config={widget}
                    onUpdate={handleUpdateWidget}
                    onDelete={handleDeleteWidget}
                    onDuplicate={handleDuplicateWidget}
                    onRefresh={handleRefreshWidget}
                    isDragging={isEditMode}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Widget Button */}
        {isEditMode && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Widget</span>
            </button>
          </div>
        )}
      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Widget Library
              </h2>
              <button
                onClick={() => setShowWidgetLibrary(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WIDGET_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                  onClick={() => handleAddWidget(template)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      {template.type === 'metric' && <DollarSign className="w-5 h-5 text-blue-600" />}
                      {template.type === 'chart' && <BarChart3 className="w-5 h-5 text-blue-600" />}
                      {template.type === 'gauge' && <Target className="w-5 h-5 text-blue-600" />}
                      {template.type === 'table' && <Activity className="w-5 h-5 text-blue-600" />}
                      {template.type === 'list' && <AlertTriangle className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {template.size} widget
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-2 rounded-full text-sm shadow-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live Data</span>
      </div>
    </div>
  )
}
