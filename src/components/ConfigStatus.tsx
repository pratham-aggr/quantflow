import React from 'react'

export const ConfigStatus: React.FC = () => {
  const isConfigured = process.env.REACT_APP_SUPABASE_URL && 
    process.env.REACT_APP_SUPABASE_ANON_KEY && 
    process.env.REACT_APP_SUPABASE_URL !== '' &&
    process.env.REACT_APP_SUPABASE_ANON_KEY !== ''

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Configuration Status</h3>
      <div className="text-sm space-y-1">
        <p>Supabase: {isConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
        {!isConfigured && (
          <p className="text-red-500 font-medium">⚠️ Supabase not configured!</p>
        )}
      </div>
    </div>
  )
}
