'use client'

import React from 'react'
import { ArrowDownToLine, ArrowRight, Check, ShieldAlert } from 'lucide-react'

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
    'Critical security and reliability updates.',
    'Upgraded instant rent payment pipeline.',
    'Improved rental credibility scoring algorithms.',
  ]

  const notes = releaseNotes && releaseNotes.length > 0 ? releaseNotes : defaultNotes

  return (
    <div
      className="app-update-sheet-overlay app-update-sheet-overlay--locked"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-hard-update-title"
      aria-describedby="app-hard-update-desc"
    >
      <div className="app-update-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header with refined icon and title */}
        <div className="app-update-sheet__header">
          <div
            className="app-update-sheet__icon-wrap"
            style={
              isMaintenance
                ? {
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                  }
                : undefined
            }
            aria-hidden="true"
          >
            {isMaintenance ? (
              <ShieldAlert size={20} strokeWidth={2.2} />
            ) : (
              <ArrowDownToLine size={20} strokeWidth={2.2} />
            )}
          </div>
          <div className="app-update-sheet__header-copy">
            <div className="app-update-sheet__title-row">
              <h2 id="app-hard-update-title" className="app-update-sheet__title">
                {title || (isMaintenance ? 'System Maintenance' : 'Update Required')}
              </h2>
              <span className="app-update-sheet__version-badge">
                {isMaintenance ? 'Maintenance' : `Version ${latestVersion}`}
              </span>
            </div>
            <p id="app-hard-update-desc" className="app-update-sheet__subtitle">
              {message ||
                (isMaintenance
                  ? 'Our infrastructure is undergoing scheduled upgrades to serve you better. Please check back shortly.'
                  : `Your current version (${currentVersion}) is no longer supported. Please update to version ${latestVersion} to continue using Upward Pay securely.`)}
            </p>
          </div>
        </div>

        {/* What's new section: clean, vertical list on the main surface without grey container box */}
        {!isMaintenance && (
          <div className="app-update-sheet__body">
            <span className="app-update-sheet__section-title">What’s new</span>
            <ul className="app-update-sheet__highlights" role="list">
              {notes.map((note, idx) => (
                <li key={idx} className="app-update-sheet__highlight-item">
                  <span className="app-update-sheet__highlight-icon" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span className="app-update-sheet__highlight-text">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mandatory Action Area (No Later button) */}
        <div
          className="app-update-sheet__actions"
          style={{ marginTop: isMaintenance ? '20px' : '16px' }}
        >
          {!isMaintenance ? (
            <button
              type="button"
              onClick={handleUpdate}
              className="app-update-sheet__btn-primary"
            >
              <span>Update now</span>
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="app-update-sheet__btn-primary"
            >
              <span>Retry connection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
