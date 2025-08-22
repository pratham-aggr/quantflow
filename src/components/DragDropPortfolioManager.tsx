import React, { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit, Eye, EyeOff, Plus, Download, Upload } from 'lucide-react'
import { PortfolioWithHoldings, Holding } from '../types/portfolio'
import { csvService } from '../lib/csvService'
import { useToast } from '../hooks/useToast'

interface DragDropPortfolioManagerProps {
  portfolios: PortfolioWithHoldings[]
  onPortfolioReorder: (reorderedPortfolios: PortfolioWithHoldings[]) => void
  onPortfolioDelete: (portfolioId: string) => void
  onPortfolioEdit: (portfolio: PortfolioWithHoldings) => void
  onPortfolioVisibilityToggle: (portfolioId: string) => void
}

// Sortable Portfolio Item Component
interface SortablePortfolioItemProps {
  portfolio: PortfolioWithHoldings
  isActive: boolean
  expandedPortfolios: Set<string>
  onToggleExpansion: (portfolioId: string) => void
  onDelete: (portfolioId: string) => void
  onEdit: (portfolio: PortfolioWithHoldings) => void
  onVisibilityToggle: (portfolioId: string) => void
  onExport: (portfolio: PortfolioWithHoldings) => void
  onPortfolioReorder: (portfolios: PortfolioWithHoldings[]) => void
  portfolios: PortfolioWithHoldings[]
}

const SortablePortfolioItem: React.FC<SortablePortfolioItemProps> = ({
  portfolio,
  isActive,
  expandedPortfolios,
  onToggleExpansion,
  onDelete,
  onEdit,
  onVisibilityToggle,
  onExport,
  onPortfolioReorder,
  portfolios
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `portfolio-${portfolio.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border transition-all duration-200 ${
        isDragging ? 'shadow-lg rotate-2' : ''
      } ${isActive ? 'opacity-50' : ''}`}
    >
      {/* Portfolio Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:bg-gray-100 p-1 rounded"
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center space-x-2">
              <h4 className="text-lg font-semibold text-gray-900">
                {portfolio.name}
              </h4>
              <span className="text-sm text-gray-500">
                ({portfolio.holdings.length} holdings)
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onVisibilityToggle(portfolio.id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={portfolio.is_visible ? 'Hide Portfolio' : 'Show Portfolio'}
            >
              {portfolio.is_visible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onExport(portfolio)}
              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Export Portfolio"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(portfolio)}
              className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Edit Portfolio"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(portfolio.id)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Portfolio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Value:</span>
            <div className="font-semibold text-gray-900">
              ${portfolio.total_value?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Total P&L:</span>
            <div className={`font-semibold ${
              (portfolio.total_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${(portfolio.total_pnl || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Risk Score:</span>
            <div className="font-semibold text-gray-900">
              {portfolio.risk_score || 'N/A'}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {portfolio.holdings.length > 0 && (
          <button
            onClick={() => onToggleExpansion(portfolio.id)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {expandedPortfolios.has(portfolio.id) ? 'Collapse' : 'Expand'} Holdings
          </button>
        )}
      </div>

      {/* Holdings List (when expanded) */}
      {expandedPortfolios.has(portfolio.id) && portfolio.holdings.length > 0 && (
        <div className="border-t bg-gray-50">
          <SortableContext
            items={portfolio.holdings.map(h => `${portfolio.id}-holding-${h.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-4 space-y-2">
              {portfolio.holdings.map((holding) => (
                <SortableHoldingItem
                  key={holding.id}
                  holding={holding}
                  portfolioId={portfolio.id}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  )
}

// Sortable Holding Item Component
interface SortableHoldingItemProps {
  holding: Holding
  portfolioId: string
}

const SortableHoldingItem: React.FC<SortableHoldingItemProps> = ({
  holding,
  portfolioId
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `${portfolioId}-holding-${holding.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 shadow-sm border transition-all duration-200 ${
        isDragging ? 'shadow-lg rotate-1' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-gray-100 p-1 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {holding.symbol}
            </div>
            <div className="text-sm text-gray-500">
              {holding.company_name || 'Unknown Company'}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {holding.quantity} shares
          </div>
          <div className="text-sm text-gray-500">
            ${(holding.current_price || holding.avg_price).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

export const DragDropPortfolioManager: React.FC<DragDropPortfolioManagerProps> = ({
  portfolios,
  onPortfolioReorder,
  onPortfolioDelete,
  onPortfolioEdit,
  onPortfolioVisibilityToggle
}) => {
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (active.id !== over?.id) {
      const activeId = active.id as string
      const overId = over?.id as string

      if (activeId.startsWith('portfolio-')) {
        const oldIndex = portfolios.findIndex(p => `portfolio-${p.id}` === activeId)
        const newIndex = portfolios.findIndex(p => `portfolio-${p.id}` === overId)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedPortfolios = arrayMove(portfolios, oldIndex, newIndex)
          onPortfolioReorder(reorderedPortfolios)
        }
      } else if (activeId.includes('-holding-')) {
        const [portfolioId] = activeId.split('-holding-')
        const portfolio = portfolios.find(p => p.id === portfolioId)
        
        if (portfolio) {
          const oldIndex = portfolio.holdings.findIndex(h => `${portfolioId}-holding-${h.id}` === activeId)
          const newIndex = portfolio.holdings.findIndex(h => `${portfolioId}-holding-${h.id}` === overId)
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedHoldings = arrayMove(portfolio.holdings, oldIndex, newIndex)
            const updatedPortfolio = { ...portfolio, holdings: reorderedHoldings }
            const updatedPortfolios = portfolios.map(p => 
              p.id === portfolioId ? updatedPortfolio : p
            )
            onPortfolioReorder(updatedPortfolios)
          }
        }
      }
    }
  }

  const togglePortfolioExpansion = (portfolioId: string) => {
    const newExpanded = new Set(expandedPortfolios)
    if (newExpanded.has(portfolioId)) {
      newExpanded.delete(portfolioId)
    } else {
      newExpanded.add(portfolioId)
    }
    setExpandedPortfolios(newExpanded)
  }

  const handleExportPortfolio = (portfolio: PortfolioWithHoldings) => {
    try {
      const csvContent = csvService.exportPortfolioData(portfolio.holdings)
      const filename = `${portfolio.name}_holdings_${new Date().toISOString().split('T')[0]}.csv`
      csvService.downloadCSV(csvContent, filename)
      showToast('success', 'Export Successful', `Portfolio "${portfolio.name}" exported to CSV`)
    } catch (error) {
      showToast('error', 'Export Failed', 'Failed to export portfolio data')
    }
  }

  const handleImportTransactions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await csvService.importTransactions(file)
      if (result.success && result.data) {
        showToast('success', 'Import Successful', `Imported ${result.data.length} transactions`)
        // Here you would typically call an API to save the transactions
        // For now, we'll just show the success message
      } else {
        showToast('error', 'Import Failed', result.message)
        if (result.errors) {
          console.error('Import errors:', result.errors)
        }
      }
    } catch (error) {
      showToast('error', 'Import Failed', 'Failed to process CSV file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = csvService.generateImportTemplate()
    csvService.downloadCSV(template, 'transaction_template.csv')
    showToast('success', 'Template Downloaded', 'Transaction template downloaded successfully')
  }

  return (
    <div className="space-y-6">
      {/* Import/Export Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Management</h3>
          <div className="flex space-x-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportTransactions}
              className="hidden"
            />
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          Drag and drop portfolios to reorder them. Click on a portfolio to expand and view holdings.
        </p>
      </div>

      {/* Portfolios List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={portfolios.map(p => `portfolio-${p.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {portfolios.map((portfolio) => (
              <SortablePortfolioItem
                key={portfolio.id}
                portfolio={portfolio}
                isActive={activeId === `portfolio-${portfolio.id}`}
                expandedPortfolios={expandedPortfolios}
                onToggleExpansion={togglePortfolioExpansion}
                onDelete={onPortfolioDelete}
                onEdit={onPortfolioEdit}
                onVisibilityToggle={onPortfolioVisibilityToggle}
                onExport={handleExportPortfolio}
                onPortfolioReorder={onPortfolioReorder}
                portfolios={portfolios}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
                      

      {/* Empty State */}
      {portfolios.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Portfolios Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first portfolio to get started with portfolio management.
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Create Portfolio
          </button>
        </div>
      )}
    </div>
  )
}
