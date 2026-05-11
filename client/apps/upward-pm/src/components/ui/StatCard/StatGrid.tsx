'use client'

import React from 'react'

interface StatGridProps {
  children: React.ReactNode
}

export function StatGrid({ children }: StatGridProps) {
  return (
    <div className="upward-stat-grid">
      {children}
    </div>
  )
}
