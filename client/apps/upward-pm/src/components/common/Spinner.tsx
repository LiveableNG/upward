'use client'

import React from 'react'

export function Spinner({ size = 24, color = 'var(--clay)' }: { size?: number, color?: string }) {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <style jsx>{`
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          width: ${size}px;
          height: ${size}px;
          border: 2px solid ${color}22;
          border-top: 2px solid ${color};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
