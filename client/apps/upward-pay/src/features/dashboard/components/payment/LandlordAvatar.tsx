import React from 'react'
import { User } from 'lucide-react'

export function LandlordAvatar({
  letter,
  size = 44,
  color,
  style,
}: {
  letter?: string
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  const isPm = !!color
  const className = ['pay-flow__avatar', size >= 48 ? 'pay-flow__avatar--lg' : '', isPm ? 'pay-flow__avatar--pm' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        ...(color ? { background: color, color: '#fff', borderColor: 'transparent' } : {}),
        ...style,
      }}
    >
      {letter ? (
        <span>{letter.toUpperCase()}</span>
      ) : (
        <User size={size * 0.45} strokeWidth={2.5} />
      )}
    </div>
  )
}
