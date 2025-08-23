import React from 'react'

export const ConfigStatus: React.FC = () => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
  
  const isConfigured = supabaseUrl && 
    supabaseKey && 
    supabaseUrl !== '' &&
    supabaseKey !== ''

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Configuration Status</h3>
      <div className="text-sm space-y-1">
        <p>Supabase URL: {supabaseUrl ? '✅ Set' : '❌ Missing'}</p>
        <p>Supabase Key: {supabaseKey ? '✅ Set' : '❌ Missing'}</p>
        <p>Is Production: {isConfigured ? '✅ Yes' : '❌ No'}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
        {supabaseUrl && (
          <div className="text-xs text-gray-500">
            <p className="break-all">URL: {supabaseUrl}</p>
                    {(!supabaseUrl || supabaseUrl === '') && (
          <p className="text-red-500 font-medium">⚠️ Supabase URL not configured!</p>
        )}
          </div>
        )}
      </div>
    </div>
  )
}
