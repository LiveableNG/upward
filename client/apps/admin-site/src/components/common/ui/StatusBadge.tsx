import React from 'react'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'accent' | 'secondary' | 'neutral'

export interface StatusBadgeProps {
  variant?: BadgeVariant
  label: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
  success: { background: 'var(--success-faint)', color: 'var(--success)' },
  warning: { background: 'var(--warning-faint)', color: 'var(--warning)' },
  danger: { background: 'var(--danger-faint)', color: 'var(--danger)' },
  accent: { background: 'var(--accent-faint)', color: 'var(--accent)' },
  secondary: { background: 'var(--surface-hover)', color: 'var(--text-muted)' },
  neutral: { background: 'rgba(99,102,241,0.08)', color: '#6366f1' }, // example fallback
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'secondary',
  label,
  className = '',
  style,
}) => {
  const vStyle = variantStyles[variant] || variantStyles.secondary

  return (
    <span
      className={`badge ${className}`}
      style={{
        ...vStyle,
        ...style,
      }}
    >
      {label}
    </span>
  )
}
