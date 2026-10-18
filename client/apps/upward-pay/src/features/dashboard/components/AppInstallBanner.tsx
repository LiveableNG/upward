'use client'

import { Smartphone, X } from 'lucide-react'
import { AppleIcon, PlayStoreIcon } from '@/components/StoreIcons'

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
        <a
          href={
            typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? 'https://apps.apple.com/us/app/upwardpay/id6807898152'
              : 'https://play.google.com/store/apps/details?id=com.goodtenants.upward'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--sm app-install-banner__download"
          style={{ textDecoration: 'none' }}
        >
          <div className="app-install-btn__icons">
            <AppleIcon size={12} />
            <PlayStoreIcon size={12} />
          </div>
          <span>Get App</span>
        </a>
        <button className="app-install-banner__close" onClick={onDismiss}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
