'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  actions?: React.ReactNode
  /** Optional extra CSS class(es) for the root header element */
  className?: string
}

export function PageHeader({ title, subtitle, showBack, actions, className }: PageHeaderProps) {
  const router = useRouter()
  
  return (
    <header className={`upward-page-header ${className ?? ''}`.trim()}>
      <div className="upward-page-header__content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showBack && (
            <button 
              className="btn-icon" 
              onClick={() => router.back()}
              style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'white' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="upward-page-header__title">{title}</h1>
            {subtitle && <p className="upward-page-header__subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && (
        <div className="upward-page-header__actions">
          {actions}
        </div>
      )}
    </header>
  )
}
