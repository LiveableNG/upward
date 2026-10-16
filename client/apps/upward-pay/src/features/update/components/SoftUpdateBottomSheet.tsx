'use client'

import React from 'react'
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

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
    'Faster transaction confirmations',
    'Enhanced UI transitions and smoothness',
    'General bug fixes and optimizations',
  ]

  const notes = releaseNotes && releaseNotes.length > 0 ? releaseNotes : defaultNotes

  return (
    <div className="app-update-sheet-overlay" onClick={onDismiss} role="dialog" aria-modal="true">
      <div className="app-update-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="app-update-sheet__drag-handle" />

        <div className="app-update-sheet__header">
          <div className="app-update-sheet__icon-box">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="app-update-sheet__title">
              {title || `Upward Pay v${latestVersion} is Ready`}
            </h3>
            <p className="app-update-sheet__subtitle">
              {message || 'A fresh update is available on the store with exciting new improvements.'}
            </p>
          </div>
        </div>

        <div className="app-update-modal__notes-box" style={{ marginBottom: '14px' }}>
          <div className="app-update-modal__notes-header">Highlights in v{latestVersion}</div>
          {notes.map((note, idx) => (
            <div key={idx} className="app-update-modal__note-item">
              <CheckCircle2 size={14} className="app-update-modal__note-bullet" />
              <span>{note}</span>
            </div>
          ))}
        </div>

        <div className="app-update-sheet__actions">
          <button
            type="button"
            onClick={onDismiss}
            className="app-update-btn-secondary"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="app-update-btn-primary"
          >
            <span>Update Now</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
