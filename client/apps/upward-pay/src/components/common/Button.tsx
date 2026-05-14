'use client'

import React, { forwardRef } from 'react'
import '@/styles/buttons.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  fullWidth?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'tight'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', fullWidth, loading, size, children, ...props }, ref) => {
    const classes = [
      'btn',
      `btn--${variant}`,
      fullWidth ? 'btn--full' : '',
      size ? `btn--${size}` : '',
      className
    ].filter(Boolean).join(' ')

    return (
      <button 
        ref={ref} 
        className={classes} 
        disabled={loading || props.disabled} 
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
