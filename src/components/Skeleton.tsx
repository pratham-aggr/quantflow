import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  animated?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  animated = true
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`
        bg-gray-200 ${roundedClasses[rounded]}
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  )
}

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={16}
        className={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
)

export const SkeletonTitle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Skeleton height={24} className={`w-2/3 ${className}`} />
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <SkeletonTitle className="mb-4" />
    <SkeletonText lines={3} className="mb-4" />
    <div className="flex justify-between items-center">
      <Skeleton height={32} width={100} />
      <Skeleton height={32} width={80} />
    </div>
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} className="flex-1" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={16} className="flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <SkeletonTitle className="mb-6" />
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton height={16} width={120} className="mb-2" />
          <Skeleton height={40} className="w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end space-x-3 mt-6">
      <Skeleton height={40} width={80} />
      <Skeleton height={40} width={100} />
    </div>
  </div>
)

export const SkeletonProfile: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="flex items-center space-x-4 mb-6">
      <Skeleton height={64} width={64} rounded="full" />
      <div className="flex-1">
        <Skeleton height={24} className="w-1/2 mb-2" />
        <Skeleton height={16} className="w-1/3" />
      </div>
    </div>
    <div className="space-y-4">
      <SkeletonText lines={2} />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-full" />
      </div>
    </div>
  </div>
)

// Portfolio-specific skeleton components
export const SkeletonPortfolioCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-lg shadow p-6 ${className}`}>
    <div className="flex justify-between items-start mb-4">
      <Skeleton height={20} className="w-1/3" />
      <Skeleton height={16} className="w-1/4" />
    </div>
    <div className="space-y-3">
      <div className="flex justify-between">
        <Skeleton height={16} className="w-1/4" />
        <Skeleton height={16} className="w-1/4" />
      </div>
      <div className="flex justify-between">
        <Skeleton height={16} className="w-1/3" />
        <Skeleton height={16} className="w-1/4" />
      </div>
    </div>
  </div>
)

export const SkeletonStockCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-lg shadow p-4 ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center space-x-3">
        <Skeleton height={40} width={40} rounded="full" />
        <div>
          <Skeleton height={16} className="w-16 mb-1" />
          <Skeleton height={12} className="w-20" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton height={16} className="w-20 mb-1" />
        <Skeleton height={12} className="w-16" />
      </div>
    </div>
    <div className="flex justify-between items-center">
      <Skeleton height={14} className="w-24" />
      <Skeleton height={14} className="w-16" />
    </div>
  </div>
)

export const SkeletonHoldingsTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = ''
}) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-lg shadow overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 dark:bg-neutral-800 px-6 py-3 border-b border-gray-200 dark:border-neutral-700">
      <div className="grid grid-cols-6 gap-4">
        <Skeleton height={16} className="col-span-2" />
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton height={16} />
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200 dark:divide-neutral-700">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="grid grid-cols-6 gap-4 items-center">
            <div className="col-span-2 flex items-center space-x-3">
              <Skeleton height={32} width={32} rounded="full" />
              <div>
                <Skeleton height={16} className="w-16 mb-1" />
                <Skeleton height={12} className="w-20" />
              </div>
            </div>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Portfolio Overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonPortfolioCard />
      <SkeletonPortfolioCard />
      <SkeletonPortfolioCard />
    </div>
    
    {/* Holdings Table */}
    <SkeletonHoldingsTable rows={5} />
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
)
