import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export const AuthDebug: React.FC = () => {
  const { user, loading, error, forceResetAuth } = useAuth()

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>🔐 Auth Status:</strong></div>
      <div>Loading: {loading ? '🔄 YES' : '✅ NO'}</div>
      <div>User: {user ? '✅ Logged in' : '❌ Not logged in'}</div>
      <div>Error: {error || 'None'}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
      
      {loading && (
        <button
          onClick={forceResetAuth}
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          🔄 Force Reset
        </button>
      )}
    </div>
  )
}
