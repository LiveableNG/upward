'use client'

import React from 'react'

interface ControlBarProps {
  children: React.ReactNode
}

export function ControlBar({ children }: ControlBarProps) {
  return (
    <div className="upward-control-bar">
      {children}
    </div>
  )
}
