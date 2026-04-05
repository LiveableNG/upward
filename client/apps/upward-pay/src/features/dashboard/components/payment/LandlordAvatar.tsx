import React from 'react'
import { User } from 'lucide-react'

export function LandlordAvatar({
  size = 44,
  color,
  style,
}: {
  letter?: string
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '12px',
        background: color || 'rgba(217, 119, 87, 0.08)',
        color: color ? '#fff' : 'var(--clay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        flexShrink: 0,
        border: `1px solid ${color ? 'transparent' : 'rgba(217, 119, 87, 0.15)'}`,
        ...style,
      }}
    >
      <User size={size * 0.5} strokeWidth={2.5} />
    </div>
  )
}
