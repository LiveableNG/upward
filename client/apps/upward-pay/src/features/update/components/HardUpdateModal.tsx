'use client'

import React from 'react'
import { ArrowRight, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'

export interface HardUpdateModalProps {
  currentVersion: string
  latestVersion: string
  title?: string | null
  message?: string | null
  releaseNotes?: string[] | null
  storeUrl: string
  fallbackStoreUrl?: string
  isMaintenance?: boolean
}

export const HardUpdateModal: React.FC<HardUpdateModalProps> = ({
  currentVersion,
  latestVersion,
  title,
  message,
  releaseNotes,
  storeUrl,
  fallbackStoreUrl,
  isMaintenance,
}) => {
  const handleUpdate = () => {
    try {
      window.location.href = storeUrl
      // Fallback timeout in case custom scheme doesn't resolve in browser
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

  const defaultNotes = [
    'Critical security and reliability enhancements',
    'Upgraded instant rent payment pipeline',
    'Improved rental credibility scoring algorithms',
  ]

  const notes = releaseNotes && releaseNotes.length > 0 ? releaseNotes : defaultNotes

  return (
    <div className="app-update-overlay" role="dialog" aria-modal="true">
      <div className="app-update-modal">
        <div className="app-update-modal__brand-badge">
          {isMaintenance ? <ShieldAlert size={32} /> : <UpwardLogo size={36} color="#ffffff" />}
        </div>

        <div className="app-update-modal__pill">
          <Sparkles size={13} />
          {isMaintenance ? 'System Maintenance' : `Update Required · v${latestVersion}`}
        </div>

        <h2 className="app-update-modal__title">
          {title || (isMaintenance ? 'Upward Maintenance' : 'Update Upward Pay to Continue')}
        </h2>

        <p className="app-update-modal__subtitle">
          {message ||
            (isMaintenance
              ? 'Our infrastructure is undergoing scheduled upgrades to serve you better. Please check back shortly.'
              : `Your current version (${currentVersion}) is no longer supported. Please update to version ${latestVersion} to continue using Upward Pay securely.`)}
        </p>

        {!isMaintenance && (
          <div className="app-update-modal__notes-box">
            <div className="app-update-modal__notes-header">What's New in this Release</div>
            {notes.map((note, idx) => (
              <div key={idx} className="app-update-modal__note-item">
                <CheckCircle2 size={15} className="app-update-modal__note-bullet" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        <div className="app-update-modal__actions">
          {!isMaintenance ? (
            <button
              type="button"
              onClick={handleUpdate}
              className="app-update-btn-primary"
            >
              <span>Update Upward Pay</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="app-update-btn-primary"
            >
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
