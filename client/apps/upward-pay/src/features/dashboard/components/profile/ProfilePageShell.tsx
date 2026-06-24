'use client'

import { Settings } from 'lucide-react'

interface ProfilePageShellProps {
  title: string
  subtitle?: string
  onSettings: () => void
  children: React.ReactNode
}

export function ProfilePageShell({
  title,
  subtitle,
  onSettings,
  children,
}: ProfilePageShellProps) {
  return (
    <div className="profile-page dashboard--nav-offset">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <div className="profile-page__header-text">
            <h1 className="profile-page__title">{title}</h1>
            {subtitle ? <p className="profile-page__subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="profile-page__settings"
            onClick={onSettings}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </header>
        <div className="profile-page__body">{children}</div>
      </div>
    </div>
  )
}
