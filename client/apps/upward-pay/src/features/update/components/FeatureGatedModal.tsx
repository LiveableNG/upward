'use client'

import React from 'react'
import { Lock, ArrowRight } from 'lucide-react'

export interface FeatureGatedModalProps {
  featureName: string
  latestVersion: string
  title?: string | null
  message?: string | null
  storeUrl: string
  fallbackStoreUrl?: string
  onClose: () => void
}

export const FeatureGatedModal: React.FC<FeatureGatedModalProps> = ({
  featureName,
  latestVersion,
  title,
  message,
  storeUrl,
  fallbackStoreUrl,
  onClose,
}) => {
  const handleUpdate = () => {
    try {
      window.location.href = storeUrl
      if (fallbackStoreUrl) {
        setTimeout(() => {
          window.open(fallbackStoreUrl, '_blank')
        }, 1200)
      }
    } catch {
      if (fallbackStoreUrl) {
        window.open(fallbackStoreUrl, '_blank')
      }
    }
  }

  const featureLabel =
    featureName === 'PAYMENTS'
      ? 'Rent Checkout & Payments'
      : featureName === 'WALLET_DEPOSIT'
        ? 'Wallet Deposits'
        : 'This Feature'

  return (
    <div
      className="app-update-sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-feature-gate-title"
      aria-describedby="app-feature-gate-desc"
    >
      <div className="app-update-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="app-update-sheet__drag-handle" aria-hidden="true" />

        {/* Header */}
        <div className="app-update-sheet__header">
          <div className="app-update-sheet__icon-wrap" aria-hidden="true">
            <Lock size={20} strokeWidth={2.2} />
          </div>
          <div className="app-update-sheet__header-copy">
            <div className="app-update-sheet__title-row">
              <h2 id="app-feature-gate-title" className="app-update-sheet__title">
                {title || `Update Required for ${featureLabel}`}
              </h2>
              <span className="app-update-sheet__version-badge">
                Security v{latestVersion}
              </span>
            </div>
            <p id="app-feature-gate-desc" className="app-update-sheet__subtitle">
              {message ||
                `To access ${featureLabel.toLowerCase()} with the newest security standards, please update to Upward Pay v${latestVersion}. You can continue browsing other parts of your app in the meantime.`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="app-update-sheet__actions">
          <button
            type="button"
            onClick={handleUpdate}
            className="app-update-sheet__btn-primary"
          >
            <span>Update now</span>
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="app-update-sheet__btn-secondary"
          >
            Cancel & return
          </button>
        </div>
      </div>
    </div>
  )
}
