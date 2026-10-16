'use client'

import React from 'react'
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react'

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
    <div className="app-update-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-update-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="app-update-modal__brand-badge"
          style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
        >
          <Lock size={32} />
        </div>

        <div
          className="app-update-modal__pill"
          style={{
            background: 'rgba(37, 99, 235, 0.15)',
            borderColor: 'rgba(37, 99, 235, 0.3)',
            color: '#60a5fa',
          }}
        >
          <ShieldCheck size={13} />
          {featureLabel} Security
        </div>

        <h2 className="app-update-modal__title">
          {title || `Update Required for ${featureLabel}`}
        </h2>

        <p className="app-update-modal__subtitle">
          {message ||
            `To access ${featureLabel.toLowerCase()} with the newest security standards, please update to Upward Pay v${latestVersion}. You can continue browsing other parts of your app in the meantime.`}
        </p>

        <div className="app-update-modal__actions">
          <button
            type="button"
            onClick={handleUpdate}
            className="app-update-btn-primary"
          >
            <span>Update Upward Pay</span>
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="app-update-btn-secondary"
          >
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  )
}
