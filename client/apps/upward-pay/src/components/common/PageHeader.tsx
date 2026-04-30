'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  backPath?: string
  backLabel?: string
  onBack?: () => void
  showSettings?: boolean
  rightIcon?: React.ReactNode
  onRightClick?: () => void
  rightElement?: React.ReactNode
  statusBadge?: React.ReactNode
}

export function PageHeader({
  title,
  showBack = false,
  backPath,
  backLabel,
  onBack,
  showSettings = true,
  rightIcon,
  onRightClick,
  rightElement,
  statusBadge,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backPath) {
      router.push(backPath)
    } else {
      router.back()
    }
  }

  const handleRightClick = () => {
    if (onRightClick) {
      onRightClick()
    } else {
      router.push('/dashboard/settings')
    }
  }

  const effectiveBackLabel = backLabel || (backPath === '/dashboard' ? 'Back to Dashboard' : 'Back')

  return (
    <header className="dashboard__header page-header-sticky mobile-only">
      <div className="dashboard__header-left">
        {showBack && (
          <button
            className="dashboard__back"
            onClick={handleBack}
            type="button"
            data-back-label={effectiveBackLabel}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="dashboard__title">{title}</h1>
        {statusBadge && <div className="page-header__badge">{statusBadge}</div>}
      </div>
      <div className="dashboard__header-right">
        {rightElement ? (
          rightElement
        ) : (
          showSettings && (
            <button
              className="dashboard__icon-btn"
              onClick={handleRightClick}
              title={rightIcon ? 'Action' : 'Settings'}
              type="button"
            >
              {rightIcon || <Settings size={20} />}
            </button>
          )
        )}
      </div>
    </header>
  )
}