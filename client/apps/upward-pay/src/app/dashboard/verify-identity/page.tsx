'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ChevronLeft, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Check, 
  HelpCircle,
  Loader2,
  X
} from 'lucide-react'
import { verifyBvn, getMe } from '@/features/auth/services/authService'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'

export default function VerifyIdentityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { login: setAuthUser } = useAuth()
  
  const [bvn, setBvn] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  
  const redirectPath = searchParams ? searchParams.get('redirect') : null

  // Ensure digits only and max 11 characters
  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 11) {
      setBvn(val)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bvn.length !== 11) {
      setError('BVN must be exactly 11 digits.')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await verifyBvn(bvn)
      if (result.success) {
        setSuccessMsg(result.message || 'Identity verified successfully!')
        
        // Refresh cached user profile
        try {
          const freshUser = await getMe()
          setAuthUser(freshUser)
          queryClient.setQueryData(['user'], freshUser)
          queryClient.invalidateQueries({ queryKey: ['user'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        } catch (err) {
          console.error('Failed to refresh user profile data after verification', err)
        }

        // Redirect after short delay
        setTimeout(() => {
          if (redirectPath) {
            router.push(redirectPath)
          } else {
            router.push('/dashboard')
          }
        }, 1500)
      } else {
        setError(result.message || 'Verification failed. Please check details and try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="verify-page">
      <div className="verify-container">
        
        {/* Left Column: Form Entry */}
        <div className="verify-column verify-column--form">
          <header className="verify-header">
            <button className="verify-back-btn" onClick={handleBack}>
              <ChevronLeft size={20} />
            </button>
            <span className="verify-header-title">Enter Your BVN</span>
          </header>

          <div className="verify-content">
            <div className="verify-title-section">
              <h2>Enter Your BVN</h2>
              <p>Confirming your BVN helps us verify your identity and keep your account secure from fraud.</p>
            </div>

            <form onSubmit={handleSubmit} className="verify-form">
              {error && (
                <div className="verify-alert verify-alert--error animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="verify-alert verify-alert--success animate-in fade-in slide-in-from-top-2 duration-200">
                  <ShieldCheck size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="verify-field">
                <label htmlFor="bvn-input">Bank Verification Number</label>
                <div className="verify-input-wrap">
                  <input
                    id="bvn-input"
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="1234 5678 900"
                    value={bvn}
                    onChange={handleBvnChange}
                    disabled={isLoading || !!successMsg}
                    required
                  />
                  {isLoading && <Loader2 className="verify-spinner animate-spin" size={18} />}
                </div>
                <div className="verify-field-hint">
                  {bvn.length}/11 digits
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary verify-submit-btn"
                disabled={bvn.length !== 11 || isLoading || !!successMsg}
              >
                {isLoading ? 'Verifying...' : 'Continue'}
              </button>
            </form>

            <div className="verify-notice-mobile">
              <button 
                type="button" 
                className="verify-info-trigger"
                onClick={() => setShowInfoModal(true)}
              >
                <HelpCircle size={14} /> Why we need your BVN?
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Info Sheet */}
        <div id="why-bvn-info" className="verify-column verify-column--info">
          <div className="info-sheet">
            <div className="info-sheet__header">
              <h3>Why we need your BVN?</h3>
            </div>
            
            <p className="info-sheet__text">
              The goal of the Bank Verification Number (BVN) is to uniquely verify the identity of a customer for &apos;know your customer&apos; (KYC) purposes.
            </p>

            <div className="info-sheet__block">
              <div className="info-sheet__block-icon">
                <Check size={14} strokeWidth={3} />
              </div>
              <div className="info-sheet__block-content">
                <strong>We only have access to your:</strong>
                <ul>
                  <li>Name</li>
                  <li>Phone number</li>
                  <li>Email address</li>
                  <li>Date of birth</li>
                </ul>
              </div>
            </div>

            <p className="info-sheet__disclaimer">
              Confirming your BVN does not give us access to details of your bank account(s) and we cannot use your BVN to transfer money from your account(s).
            </p>

            <div className="info-sheet__footer">
              <Lock size={14} className="info-sheet__footer-icon" />
              <span>
                Your data is safe with us and we won&apos;t share your BVN with anyone. <strong>We do not save your BVN number</strong>.
              </span>
            </div>
          </div>
        </div>

      {showInfoModal && (
        <div
          className="verify-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInfoModal(false)
          }}
        >
          <div className="verify-modal-card animate-in zoom-in-95 duration-200">
            <button className="verify-modal-close" onClick={() => setShowInfoModal(false)}>
              <X size={16} />
            </button>
            <div className="info-sheet">
              <div className="info-sheet__header">
                <h3>Why we need your BVN?</h3>
              </div>
              
              <p className="info-sheet__text">
                The goal of the Bank Verification Number (BVN) is to uniquely verify the identity of a customer for &apos;know your customer&apos; (KYC) purposes.
              </p>

              <div className="info-sheet__block">
                <div className="info-sheet__block-icon">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="info-sheet__block-content">
                  <strong>We only have access to your:</strong>
                  <ul>
                    <li>Name</li>
                    <li>Phone number</li>
                    <li>Email address</li>
                    <li>Date of birth</li>
                  </ul>
                </div>
              </div>

              <p className="info-sheet__disclaimer">
                Confirming your BVN does not give us access to details of your bank account(s) and we cannot use your BVN to transfer money from your account(s).
              </p>

              <div className="info-sheet__footer">
                <Lock size={14} className="info-sheet__footer-icon" />
                <span>
                  Your data is safe with us and we won&apos;t share your BVN with anyone. <strong>We do not save your BVN number</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      <style jsx>{`
        .verify-page {
          min-height: calc(100vh - 64px);
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .verify-container {
          background: var(--bg);
          width: 100%;
          max-width: 960px;
          border-radius: 36px;
          border: 1px solid var(--border-solid);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.05);
          display: flex;
          overflow: hidden;
          min-height: 520px;
        }

        .verify-column {
          flex: 1;
        }

        .verify-column--form {
          border-right: 1px solid var(--border-solid);
          padding: 40px;
          display: flex;
          flex-direction: column;
        }

        .verify-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .verify-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-solid);
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .verify-back-btn:hover {
          color: var(--clay);
          border-color: rgba(217, 119, 87, 0.2);
          background: var(--clay-faint);
        }

        .verify-header-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .verify-content {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .verify-title-section h2 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 8px;
        }

        .verify-title-section p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .verify-form {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .verify-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
        }

        .verify-alert--error {
          background: #fee2e2;
          color: var(--error);
          border: 1.5px solid rgba(239, 68, 68, 0.15);
        }

        .verify-alert--success {
          background: #dcfce7;
          color: var(--success);
          border: 1.5px solid rgba(34, 197, 94, 0.15);
        }

        .verify-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .verify-field label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .verify-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .verify-input-wrap input {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: 1.5px solid var(--border-solid);
          background: var(--surface2);
          padding: 0 16px;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          outline: none;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }

        .verify-input-wrap input:focus {
          border-color: var(--clay);
          background: var(--bg);
          box-shadow: 0 0 0 4px var(--clay-faint);
        }

        .verify-spinner {
          position: absolute;
          right: 16px;
          color: var(--text-muted);
        }

        .verify-field-hint {
          font-size: 11px;
          color: var(--text-muted);
          text-align: right;
          font-weight: 600;
        }

        .verify-submit-btn {
          height: 52px;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 100px;
          box-shadow: 0 8px 24px rgba(217, 119, 87, 0.15);
          width: 100%;
        }

        .verify-notice-mobile {
          display: none;
        }

        /* Info column styling */
        .verify-column--info {
          background: linear-gradient(155deg, var(--clay-faint) 0%, transparent 100%);
          padding: 40px;
          display: flex;
          align-items: center;
        }

        .info-sheet {
          max-width: 380px;
          margin: 0 auto;
        }

        .info-sheet__header h3 {
          font-size: 18px;
          font-weight: 800;
          color: var(--clay);
          margin-bottom: 12px;
        }

        .info-sheet__text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .info-sheet__block {
          display: flex;
          gap: 12px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
        }

        .info-sheet__block-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dbeafe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .info-sheet__block-content {
          font-size: 13px;
        }

        .info-sheet__block-content strong {
          color: var(--text);
          display: block;
          margin-bottom: 8px;
        }

        .info-sheet__block-content ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .info-sheet__block-content li {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .info-sheet__block-content li::before {
          content: '•';
          color: #2563eb;
          font-weight: bold;
        }

        .info-sheet__disclaimer {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .info-sheet__footer {
          display: flex;
          gap: 10px;
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .info-sheet__footer-icon {
          color: var(--clay);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .verify-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .verify-modal-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border-solid);
          border-radius: 28px;
          padding: 36px 24px 24px;
          width: 100%;
          max-width: 440px;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
        }

        .verify-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--surface2, #f5f5f7);
          border: none;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .verify-modal-close:hover {
          background: var(--border-solid);
          color: var(--text);
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .verify-page {
            padding: 0;
            background: var(--bg);
            align-items: flex-start;
          }

          .verify-container {
            border: none;
            border-radius: 0;
            box-shadow: none;
            flex-direction: column;
            min-height: auto;
          }

          .verify-column--form {
            border-right: none;
            border-bottom: 1px solid var(--border-solid);
            padding: 24px;
          }

          .verify-column--info {
            display: none;
          }

          .verify-notice-mobile {
            display: block;
            margin-top: 24px;
            text-align: center;
          }

          .verify-info-trigger {
            font-size: 12px;
            font-weight: 700;
            color: var(--clay);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-decoration: underline;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}
