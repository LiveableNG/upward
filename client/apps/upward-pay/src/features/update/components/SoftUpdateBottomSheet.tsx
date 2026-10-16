'use client'

import React, { useState } from 'react'
import { ArrowDownToLine, ArrowRight, Check } from 'lucide-react'

export interface SoftUpdateBottomSheetProps {
  currentVersion: string
  latestVersion: string
  title?: string | null
  message?: string | null
  releaseNotes?: string[] | null
  storeUrl: string
  fallbackStoreUrl?: string
  onDismiss: () => void
}

export const SoftUpdateBottomSheet: React.FC<SoftUpdateBottomSheetProps> = ({
  latestVersion,
  title,
  message,
  releaseNotes,
  storeUrl,
  fallbackStoreUrl,
  onDismiss,
}) => {
  const [isClosing, setIsClosing] = useState(false)

  const handleDismiss = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      onDismiss()
    }, 220)
  }

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

  const defaultNotes = [
    'Faster one-tap card checkout.',
    'Instant rent receipt generation and sharing.',
    'Enhanced security and reliability updates.',
  ]

  const notes = releaseNotes && releaseNotes.length > 0 ? releaseNotes : defaultNotes

  return (
    <div
      className={`app-update-sheet-overlay ${isClosing ? 'app-update-sheet-overlay--closing' : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-sheet-title"
      aria-describedby="app-update-sheet-desc"
    >
      <div
        className={`app-update-sheet ${isClosing ? 'app-update-sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle drag handle for mobile affordance */}
        <div className="app-update-sheet__drag-handle" aria-hidden="true" />

        {/* Header with refined icon and title */}
        <div className="app-update-sheet__header">
          <div className="app-update-sheet__icon-wrap" aria-hidden="true">
            <ArrowDownToLine size={20} strokeWidth={2.2} />
          </div>
          <div className="app-update-sheet__header-copy">
            <div className="app-update-sheet__title-row">
              <h2 id="app-update-sheet-title" className="app-update-sheet__title">
                {title || 'A new version is available'}
              </h2>
              {latestVersion && (
                <span className="app-update-sheet__version-badge">
                  Version {latestVersion}
                </span>
              )}
            </div>
            <p id="app-update-sheet-desc" className="app-update-sheet__subtitle">
              {message || 'Update Upward Pay to get the latest improvements and a smoother experience.'}
            </p>
          </div>
        </div>

        {/* What's new section: clean, vertical list on the main surface without grey container box */}
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

        {/* Dedicated action area with distinct visual hierarchy */}
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
            onClick={handleDismiss}
            className="app-update-sheet__btn-secondary"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
