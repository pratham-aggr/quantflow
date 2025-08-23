import React from 'react'

interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`robinhood-shimmer rounded ${className}`} />
  )
}

export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`robinhood-card p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  )
}

export const SkeletonTable: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`robinhood-card overflow-hidden ${className}`}>
      <div className="p-6">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const SkeletonChart: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`robinhood-card p-6 ${className}`}>
      <Skeleton className="h-6 w-1/2 mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-3/6" />
        <Skeleton className="h-4 w-2/6" />
      </div>
    </div>
  )
}

export const SkeletonMetric: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`robinhood-card p-6 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}
