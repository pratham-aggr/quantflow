import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { performanceMonitor } from '../lib/performance'

export const AuthDebug: React.FC = () => {
  const { user, loading, error } = useAuth()
  const [showDebug, setShowDebug] = useState(false)
  const [metrics, setMetrics] = useState<any[]>([])

  useEffect(() => {
    // Only show debug in development
    if (process.env.NODE_ENV === 'development') {
      setShowDebug(true)
    }
  }, [])

  useEffect(() => {
    if (showDebug) {
      const interval = setInterval(() => {
        setMetrics(performanceMonitor.getMetrics())
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [showDebug])

  if (!showDebug) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Auth Debug</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div>Status: {loading ? '🔄 Loading' : user ? '✅ Authenticated' : '❌ Not authenticated'}</div>
        {user && (
          <div>User: {user.email}</div>
        )}
        {error && (
          <div className="text-red-400">Error: {error}</div>
        )}
        
        {metrics.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold mb-1">Performance:</div>
            {metrics.map((metric, index) => (
              <div key={index} className="text-yellow-400">
                {metric.operation}: {metric.duration?.toFixed(0)}ms
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
