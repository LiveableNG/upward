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
}

export function PageHeader({
  title,
  showBack = false,
  backPath,
  onBack,
  showSettings = true,
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

  return (
    <header className="dashboard__header dashboard__header--mobile">
      <div className="dashboard__header-left">
        {showBack && (
          <button className="dashboard__back" onClick={handleBack}>
            <ArrowLeft size={22} />
          </button>
        )}
        <h1 className="dashboard__title">{title}</h1>
      </div>
      <div className="dashboard__header-right">
        {showSettings && (
          <button
            className="dashboard__icon-btn"
            onClick={() => router.push('/dashboard/settings')}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  )
}
