'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck, ArrowRight, ExternalLink, CheckCircle2, Lock, FileText, Building2 } from 'lucide-react'
import { acceptTerms } from '../services/authService'
import { UpwardLogo } from '@/components/common/UpwardLogo'

interface PmTermsAcceptanceModalProps {
  onAccepted: () => void
}

export function PmTermsAcceptanceModal({ onAccepted }: PmTermsAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleAccept = async () => {
    if (!agreed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await acceptTerms('2026-08-24')
      onAccepted()
    } catch (err: any) {
      console.error('Failed to record PM terms acceptance', err)
      setError(err.message || 'Failed to update agreement. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'

  if (!mounted) return null

  return createPortal(
    <div className="pm-modal-overlay pm-terms-overlay" style={{ zIndex: 999999 }}>
      <div className="pm-terms-modal animate-pop">
        <div className="pm-terms-modal__header">
          <div className="pm-terms-modal__icon-ring">
            <ShieldCheck size={28} color="var(--forest)" />
          </div>
          <div className="pm-terms-modal__brand">
            <UpwardLogo size={24} color="var(--forest)" />
          </div>
          <h2 className="pm-terms-modal__title">Updated Property Manager Terms</h2>
          <p className="pm-terms-modal__subtitle">
            Please review and accept our updated Terms of Use &amp; Privacy Policy to continue managing your properties on Upward.
          </p>
        </div>

        <div className="pm-terms-modal__body">
          <div className="pm-terms-modal__highlights">
            <div className="pm-terms-modal__highlight-item">
              <Building2 size={16} className="pm-terms-modal__check-icon" />
              <div>
                <strong>Property Operations &amp; Verification</strong>
                <p>Framework for property management, listing data, and tenant screening tools.</p>
              </div>
            </div>

            <div className="pm-terms-modal__highlight-item">
              <Lock size={16} className="pm-terms-modal__check-icon" />
              <div>
                <strong>Data Protection &amp; Compliance</strong>
                <p>Compliant with the Nigeria Data Protection Act (NDPA 2023) and regulatory guidelines.</p>
              </div>
            </div>
          </div>

          <div className="pm-terms-modal__doc-links">
            <a
              href={`${webUrl}/legal/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-terms-modal__doc-card"
            >
              <div className="pm-terms-modal__doc-info">
                <FileText size={18} />
                <span>Terms of Use</span>
              </div>
              <ExternalLink size={15} />
            </a>

            <a
              href={`${webUrl}/legal/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-terms-modal__doc-card"
            >
              <div className="pm-terms-modal__doc-info">
                <ShieldCheck size={18} />
                <span>Privacy Policy</span>
              </div>
              <ExternalLink size={15} />
            </a>
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: '13px', textAlign: 'center', fontWeight: 500 }}>
              {error}
            </div>
          )}
        </div>

        <div className="pm-terms-modal__footer">
          <label className="pm-terms-modal__checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="pm-terms-modal__checkbox"
            />
            <span>
              I have read, understood, and agree to the <strong>Terms of Use</strong> and{' '}
              <strong>Privacy Policy</strong>.
            </span>
          </label>

          <button
            type="button"
            className="auth-btn auth-btn--primary auth-btn--large"
            disabled={!agreed || submitting}
            onClick={handleAccept}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span>{submitting ? 'Updating...' : 'Accept & Continue'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .pm-terms-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 31, 20, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .pm-terms-modal {
          background: #fff;
          border-radius: 20px;
          max-width: 480px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 24px 48px rgba(10, 31, 20, 0.2);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .pm-terms-modal__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .pm-terms-modal__icon-ring {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(22, 101, 52, 0.08);
          border: 1px solid rgba(22, 101, 52, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .pm-terms-modal__brand {
          margin-bottom: 8px;
        }
        .pm-terms-modal__title {
          font-size: 20px;
          font-weight: 800;
          color: var(--dark);
          margin-bottom: 6px;
        }
        .pm-terms-modal__subtitle {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .pm-terms-modal__body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pm-terms-modal__highlights {
          background: #f8faf9;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pm-terms-modal__highlight-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 12.5px;
          color: var(--text-secondary);
        }
        .pm-terms-modal__highlight-item strong {
          color: var(--dark);
          display: block;
          margin-bottom: 2px;
          font-size: 13.5px;
        }
        .pm-terms-modal__highlight-item p {
          margin: 0;
          line-height: 1.3;
        }
        .pm-terms-modal__check-icon {
          color: var(--forest);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .pm-terms-modal__doc-links {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .pm-terms-modal__doc-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: var(--dark);
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .pm-terms-modal__doc-card:hover {
          border-color: var(--forest);
          color: var(--forest);
          background: rgba(22, 101, 52, 0.02);
        }
        .pm-terms-modal__doc-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pm-terms-modal__footer {
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .pm-terms-modal__checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .pm-terms-modal__checkbox {
          accent-color: var(--forest);
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
        }
        .pm-terms-modal :global(.auth-btn:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
          background: #94a3b8 !important;
          border-color: #94a3b8 !important;
        }
      `}</style>
    </div>,
    document.body
  )
}
