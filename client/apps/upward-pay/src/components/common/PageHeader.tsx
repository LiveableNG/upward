'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  backPath?: string
  onBack?: () => void
  showSettings?: boolean
  rightIcon?: React.ReactNode
  onRightClick?: () => void
  rightElement?: React.ReactNode
}

export function PageHeader({
  title,
  showBack = false,
  backPath,
  onBack,
  showSettings = true,
  rightIcon,
  onRightClick,
  rightElement,
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

  return (
    <header className="dashboard__header dashboard__header--mobile">
      <div className="dashboard__header-left">
        {showBack && (
          <button className="dashboard__back" onClick={handleBack} type="button">
            <ArrowLeft size={22} />
          </button>
        )}
        <h1 className="dashboard__title">{title}</h1>
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
