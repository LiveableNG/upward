'use client'

import React, { useState } from 'react'
import { ShieldCheck, ArrowRight, ExternalLink, CheckCircle2, Lock, FileText } from 'lucide-react'
import { acceptTerms } from '../services/authService'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface TermsAcceptanceModalProps {
  onAccepted: () => void
}

export function TermsAcceptanceModal({ onAccepted }: TermsAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    if (!agreed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await acceptTerms('2026-08-24')
      onAccepted()
    } catch (err: any) {
      console.error('Failed to record terms acceptance', err)
      setError(err.message || 'Failed to update agreement. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'

  return (
    <div className="modal-overlay modal-overlay--legal-gate" style={{ zIndex: 99999 }}>
      <div className="modal-content modal-content--terms-gate animate-pop">
        <div className="terms-gate__header">
          <div className="terms-gate__icon-ring">
            <ShieldCheck size={28} color="var(--clay)" />
          </div>
          <div className="terms-gate__brand">
            <UpwardLogo size={22} color="var(--clay)" />
          </div>
          <h2 className="terms-gate__title">Updated Terms of Use & Privacy Policy</h2>
          <p className="terms-gate__subtitle">
            Please review and accept our updated legal agreements to continue using Upward.
          </p>
        </div>

        <div className="terms-gate__body">
          <div className="terms-gate__highlights">
            <div className="terms-gate__highlight-item">
              <CheckCircle2 size={16} className="terms-gate__check-icon" />
              <div>
                <strong>Verified Credit &amp; Rental Records</strong>
                <p>Learn how rent payments build your verifiable financial profile.</p>
              </div>
            </div>

            <div className="terms-gate__highlight-item">
              <Lock size={16} className="terms-gate__check-icon" />
              <div>
                <strong>Data Safeguards &amp; Privacy</strong>
                <p>Aligned with the Nigeria Data Protection Act (NDPA 2023).</p>
              </div>
            </div>
          </div>

          <div className="terms-gate__doc-links">
            <a
              href={`${webUrl}/legal/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="terms-gate__doc-card"
            >
              <div className="terms-gate__doc-info">
                <FileText size={18} />
                <span>Terms of Use</span>
              </div>
              <ExternalLink size={15} />
            </a>

            <a
              href={`${webUrl}/legal/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="terms-gate__doc-card"
            >
              <div className="terms-gate__doc-info">
                <ShieldCheck size={18} />
                <span>Privacy Policy</span>
              </div>
              <ExternalLink size={15} />
            </a>
          </div>

          {error && <div className="auth-form__error" style={{ marginTop: '12px' }}>{error}</div>}
        </div>

        <div className="terms-gate__footer">
          <label className="terms-gate__checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="terms-gate__checkbox"
            />
            <span className="terms-gate__checkbox-text">
              I have read, understood, and agree to the <strong>Terms of Use</strong> and{' '}
              <strong>Privacy Policy</strong>.
            </span>
          </label>

          <button
            type="button"
            className="btn btn--primary btn--full btn--pay terms-gate__submit"
            disabled={!agreed || submitting}
            onClick={handleAccept}
          >
            {submitting ? 'Updating...' : 'Accept & Continue'}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay--legal-gate {
          position: fixed;
          inset: 0;
          background: rgba(15, 15, 14, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal-content--terms-gate {
          background: #fff;
          border-radius: 24px;
          max-width: 460px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .terms-gate__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .terms-gate__icon-ring {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(194, 80, 31, 0.08);
          border: 1px solid rgba(194, 80, 31, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .terms-gate__brand {
          margin-bottom: 8px;
        }
        .terms-gate__title {
          font-family: var(--font-head);
          font-size: 18px;
          font-weight: 800;
          color: #141413;
          margin-bottom: 6px;
        }
        .terms-gate__subtitle {
          font-size: 13px;
          color: #66645e;
          line-height: 1.4;
        }
        .terms-gate__body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .terms-gate__highlights {
          background: #faf9f6;
          border: 1px solid #ebe9e4;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .terms-gate__highlight-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 12px;
          color: #4a4944;
        }
        .terms-gate__highlight-item strong {
          color: #141413;
          display: block;
          margin-bottom: 2px;
          font-size: 13px;
        }
        .terms-gate__highlight-item p {
          margin: 0;
          color: #66645e;
          line-height: 1.3;
        }
        .terms-gate__check-icon {
          color: var(--clay);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .terms-gate__doc-links {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .terms-gate__doc-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #e5e3dc;
          border-radius: 14px;
          color: #141413;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .terms-gate__doc-card:hover {
          border-color: var(--clay);
          color: var(--clay);
          background: rgba(194, 80, 31, 0.02);
        }
        .terms-gate__doc-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .terms-gate__footer {
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-top: 1px solid #f0eee9;
          padding-top: 16px;
        }
        .terms-gate__checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          font-size: 12px;
          color: #4a4944;
          line-height: 1.4;
        }
        .terms-gate__checkbox {
          accent-color: var(--clay);
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
