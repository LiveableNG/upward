'use client'

import { Smartphone, X } from 'lucide-react'

interface AppInstallBannerProps {
  onDismiss: () => void
}

export function AppInstallBanner({ onDismiss }: AppInstallBannerProps) {
  return (
    <div className="app-install-banner">
      <div className="app-install-banner__icon">
        <Smartphone size={18} />
      </div>
      <div className="app-install-banner__content">
        <p className="app-install-banner__title">Get the Upward App</p>
        <p className="app-install-banner__desc">Track payments & savings on the go.</p>
      </div>
      <div className="app-install-banner__actions">
        <button className="btn btn--primary btn--sm app-install-banner__download">Download</button>
        <button className="app-install-banner__close" onClick={onDismiss}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
