import React from 'react'

export function LandlordAvatar({
  letter,
  size = 44,
  color,
  style,
}: {
  letter: string
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        background: color || 'var(--clay-faint)',
        color: color ? '#fff' : 'var(--clay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        border: '1px solid var(--border-solid)',
        ...style,
      }}
    >
      {letter}
    </div>
  )
}
