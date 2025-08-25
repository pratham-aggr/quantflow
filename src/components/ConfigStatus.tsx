import React from 'react'

export const ConfigStatus: React.FC = () => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''
  
  const isConfigured = supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== '' &&
    supabaseAnonKey !== '' &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here'

  const hasPlaceholderValues = supabaseUrl === 'https://your-project-id.supabase.co' || 
                              supabaseAnonKey === 'your-anon-key-here'

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Configuration Status</h3>
      <div className="text-sm space-y-1">
        <p>Supabase: {isConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
        <p>URL Set: {supabaseUrl ? '✅' : '❌'}</p>
        <p>Key Set: {supabaseAnonKey ? '✅' : '❌'}</p>
        
        {hasPlaceholderValues && (
          <p className="text-red-500 font-medium">⚠️ Using placeholder values! Please configure your Supabase credentials.</p>
        )}
        
        {!isConfigured && !hasPlaceholderValues && (
          <p className="text-red-500 font-medium">⚠️ Supabase not configured! Create a .env.local file with your credentials.</p>
        )}
        
        {isConfigured && (
          <p className="text-green-500 font-medium">✅ Supabase is properly configured!</p>
        )}
      </div>
    </div>
  )
}
