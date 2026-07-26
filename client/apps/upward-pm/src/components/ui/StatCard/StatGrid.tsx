'use client'

import React from 'react'

interface StatGridProps {
  children: React.ReactNode;
  /** Optional extra CSS class(es) for the outer grid container */
  className?: string;
}

export function StatGrid({ children, className }: StatGridProps) {
  return (
    <div className={`upward-stat-grid ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}

