'use client'

import React from 'react'
import { Info } from 'lucide-react'

interface OccupancyWarningProps {
  unitStatus?: string | null
}

export function OccupancyWarning({ unitStatus }: OccupancyWarningProps) {
  if (!unitStatus || unitStatus.toUpperCase() !== 'OCCUPIED') {
    return null
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(234, 179, 8, 0.08)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        color: '#854d0e',
        fontSize: '12px',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginTop: '8px',
      }}
    >
      <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <strong>Notice:</strong> This unit is currently marked as <strong>Occupied</strong> in your canonical Upward PM inventory. You may still publish this listing for sale or future rent. The Alliance listing remains active unless you choose to unpublish it.
      </div>
    </div>
  )
}
