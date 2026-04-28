'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, showBack, children }: PageHeaderProps) {
  const router = useRouter()
  return (
    <header className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {showBack && (
          <button className="btn-icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="dashboard__title">{title}</h1>
          {subtitle && <p className="dashboard__subtitle">{subtitle}</p>}
        </div>
      </div>
      {children && (
        <div className="page-header__actions">
          {children}
        </div>
      )}
      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-6);
        }
        .page-header__actions {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }
      `}</style>
    </header>
  )
}
