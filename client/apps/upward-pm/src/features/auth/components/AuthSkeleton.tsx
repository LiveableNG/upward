'use client'

import React from 'react'
import '@/styles/auth.css'

export const AuthSkeleton = () => {
  return (
    <div className="auth-shell animate-pulse">
      <div style={{ height: '32px', width: '60%', background: 'var(--ivory-dark)', borderRadius: '8px', marginBottom: '12px' }} />
      <div style={{ height: '16px', width: '40%', background: 'var(--ivory-dim)', borderRadius: '4px', marginBottom: '32px' }} />
      
      {[1, 2, 3].map(i => (
        <div key={i} className="form-group">
          <div style={{ height: '14px', width: '30%', background: 'var(--ivory-dark)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '48px', width: '100%', background: 'white', border: '1.5px solid var(--ivory-dark)', borderRadius: 'var(--radius-md)' }} />
        </div>
      ))}
      
      <div style={{ height: '52px', width: '100%', background: 'var(--ivory-dark)', borderRadius: 'var(--radius-md)', marginTop: '24px' }} />
    </div>
  )
}
