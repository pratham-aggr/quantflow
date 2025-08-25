import React, { useState, useEffect } from 'react'
import { marketDataService } from '../lib/marketDataService'
import { Trash2, RefreshCw, BarChart3, Settings } from 'lucide-react'

interface CacheStats {
  memorySize: number
  backgroundQueueSize: number
}

const CacheManager: React.FC = () => {
  const [stats, setStats] = useState<CacheStats>({ memorySize: 0, backgroundQueueSize: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [backgroundRefreshEnabled, setBackgroundRefreshEnabled] = useState(true)

  useEffect(() => {
    // Update stats every 5 seconds
    const interval = setInterval(() => {
      const cacheStats = marketDataService.getCacheStats()
      setStats(cacheStats)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleClearCache = () => {
    marketDataService.clearCache()
    setStats({ memorySize: 0, backgroundQueueSize: 0 })
  }

  const handleToggleBackgroundRefresh = () => {
    const newState = !backgroundRefreshEnabled
    setBackgroundRefreshEnabled(newState)
    marketDataService.enableBackgroundRefresh(newState)
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 z-50"
        title="Cache Manager"
      >
        <Settings size={20} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 size={20} />
          Cache Manager
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* Cache Statistics */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cache Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.memorySize}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Memory Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.backgroundQueueSize}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Background Queue</div>
            </div>
          </div>
        </div>

        {/* Cache Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Background Refresh</span>
            <button
              onClick={handleToggleBackgroundRefresh}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                backgroundRefreshEnabled 
                  ? 'bg-blue-600 dark:bg-blue-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  backgroundRefreshEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClearCache}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Clear Cache
            </button>
            <button
              onClick={() => setStats(marketDataService.getCacheStats())}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Cache Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>• Stock quotes: 2 min cache</div>
          <div>• Company profiles: 1 hour cache</div>
          <div>• Search results: 30 min cache</div>
          <div>• Auto-refresh: 30 seconds</div>
        </div>
      </div>
    </div>
  )
}

export default CacheManager
