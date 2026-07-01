import React from 'react'

export const Square: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, border: '2px solid var(--border)', borderRadius: '4px' }} />
)

export const CheckSquare: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}`, backgroundColor: color, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)
