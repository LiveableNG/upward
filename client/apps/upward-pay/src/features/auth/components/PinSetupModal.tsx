'use client'

import React, { useState, useEffect } from 'react'
import { Scan, Fingerprint, Delete, Shield, Check, ArrowRight, X } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { PinService, PinUserInfo } from '../services/pinService'
import { BiometricsService, getBiometryLabel } from '../services/biometricsService'
import { BiometryType } from '@capgo/capacitor-native-biometric'

interface PinSetupModalProps {
  user: PinUserInfo
  onComplete: () => void
  allowDismiss?: boolean
}

type SetupStage = 'create' | 'confirm' | 'biometric'

export function PinSetupModal({ user, onComplete, allowDismiss = false }: PinSetupModalProps) {
  const [stage, setStage] = useState<SetupStage>('create')
  const [firstPin, setFirstPin] = useState<string[]>([])
  const [confirmPin, setConfirmPin] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null)
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false)

  useEffect(() => {
    async function checkBio() {
      const avail = await BiometricsService.isAvailable()
      setIsBiometricAvailable(avail)
      if (avail) {
        const type = await BiometricsService.getBiometryType()
        setBiometryType(type)
      }
    }
    checkBio()
  }, [])

  const isFaceId =
    biometryType === BiometryType.FACE_ID ||
    biometryType === BiometryType.FACE_AUTHENTICATION
  const biometryLabel = getBiometryLabel(biometryType)

  const currentDigits = stage === 'create' ? firstPin : confirmPin

  const handleKeyPress = (digit: string) => {
    if (stage === 'biometric') return
    if (currentDigits.length >= 6) return
    setError(null)

    if (stage === 'create') {
      const updated = [...firstPin, digit]
      setFirstPin(updated)
      if (updated.length === 6) {
        setTimeout(() => setStage('confirm'), 200)
      }
    } else if (stage === 'confirm') {
      const updated = [...confirmPin, digit]
      setConfirmPin(updated)
      if (updated.length === 6) {
        const pin1 = firstPin.join('')
        const pin2 = updated.join('')
        if (pin1 === pin2) {
          if (isBiometricAvailable) {
            setStage('biometric')
          } else {
            finalize(false)
          }
        } else {
          setShaking(true)
          setError('PINs did not match. Please try again.')
          setTimeout(() => {
            setConfirmPin([])
            setStage('create')
            setFirstPin([])
            setShaking(false)
          }, 600)
        }
      }
    }
  }

  const handleDelete = () => {
    if (stage === 'create') {
      setFirstPin((prev) => prev.slice(0, -1))
    } else if (stage === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1))
    }
  }

  const finalize = async (enableBio: boolean) => {
    const finalPin = firstPin.join('')
    await PinService.setupPin(finalPin, user, enableBio)
    onComplete()
  }

  return (
    <div className="pin-setup-overlay">
      <div className="pin-setup-container">
        <div className="pin-setup-header">
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="pin-setup-logo">
              <UpwardLogo size={32} color="var(--clay)" />
            </div>
            {allowDismiss && (
              <button
                type="button"
                className="pin-setup-close-btn"
                onClick={onComplete}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {stage === 'create' && (
            <>
              <h2 className="pin-setup-title">Set up your 6-digit PIN</h2>
              <p className="pin-setup-desc">
                Choose a 6-digit PIN to securely access Upward Pay without typing your password each time.
              </p>
            </>
          )}

          {stage === 'confirm' && (
            <>
              <h2 className="pin-setup-title">Confirm your 6-digit PIN</h2>
              <p className="pin-setup-desc">Please re-enter your 6-digit PIN to verify.</p>
            </>
          )}

          {stage === 'biometric' && (
            <>
              <div className="pin-bio-icon">
                {isFaceId ? <Scan size={44} strokeWidth={1.75} /> : <Fingerprint size={44} strokeWidth={1.75} />}
              </div>
              <h2 className="pin-setup-title">Enable {biometryLabel}?</h2>
              <p className="pin-setup-desc">
                Log in and verify transactions faster using {biometryLabel}.
              </p>
            </>
          )}
        </div>

        {stage !== 'biometric' ? (
          <>
            {/* PIN Dots */}
            <div className="pin-setup-dots-wrapper">
              <div
                className={`pin-setup-dots ${shaking ? 'pin-setup-dots--shake' : ''} ${error ? 'pin-setup-dots--error' : ''}`}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`pin-setup-dot ${i < currentDigits.length ? 'pin-setup-dot--filled' : ''}`}
                  />
                ))}
              </div>
              {error && <p className="pin-setup-error">{error}</p>}
            </div>

            {/* Keypad */}
            <div className="pin-setup-keypad">
              <div className="pin-keypad-row">
                <button type="button" className="pin-key" onClick={() => handleKeyPress('1')}>
                  1
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('2')}>
                  2
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('3')}>
                  3
                </button>
              </div>
              <div className="pin-keypad-row">
                <button type="button" className="pin-key" onClick={() => handleKeyPress('4')}>
                  4
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('5')}>
                  5
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('6')}>
                  6
                </button>
              </div>
              <div className="pin-keypad-row">
                <button type="button" className="pin-key" onClick={() => handleKeyPress('7')}>
                  7
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('8')}>
                  8
                </button>
                <button type="button" className="pin-key" onClick={() => handleKeyPress('9')}>
                  9
                </button>
              </div>
              <div className="pin-keypad-row">
                <div className="pin-key pin-key--blank" />
                <button type="button" className="pin-key" onClick={() => handleKeyPress('0')}>
                  0
                </button>
                <button type="button" className="pin-key pin-key--action" onClick={handleDelete}>
                  <Delete size={24} strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="pin-bio-actions">
            <button
              type="button"
              className="btn btn--primary btn--full"
              style={{
                height: '52px',
                borderRadius: '12px',
                background: 'var(--btn-primary-bg, linear-gradient(135deg, #d97757 0%, #c86848 100%))',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={() => finalize(true)}
            >
              Enable {biometryLabel} <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn btn--outline btn--full"
              style={{
                height: '48px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '12px',
              }}
              onClick={() => finalize(false)}
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .pin-setup-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 60px 28px 36px 28px;
          animation: pinSetupFade 0.2s ease-out;
        }

        @keyframes pinSetupFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pin-setup-container {
          width: 100%;
          max-width: 340px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .pin-setup-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .pin-setup-logo {
          margin-bottom: 0;
        }

        .pin-setup-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .pin-setup-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .pin-setup-title {
          font-size: 26px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: -0.4px;
        }

        .pin-setup-desc {
          font-size: 14.5px;
          line-height: 1.45;
          color: #64748b;
          margin: 0;
        }

        .pin-setup-dots-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 24px 0;
        }

        .pin-setup-dots {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 28px;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .pin-setup-dots--shake {
          animation: pinShake 0.4s ease-in-out;
        }

        .pin-setup-dots--error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        .pin-setup-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: background 0.15s, transform 0.15s;
        }

        .pin-setup-dot--filled {
          background: #0f172a;
          transform: scale(1.15);
        }

        .pin-setup-error {
          color: #ef4444;
          font-size: 13px;
          font-weight: 500;
          margin-top: 10px;
        }

        .pin-bio-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.1);
          color: var(--clay, #d97757);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
        }

        .pin-bio-actions {
          margin-top: auto;
          width: 100%;
        }

        .pin-setup-keypad {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: auto;
        }

        .pin-keypad-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pin-key {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #f8fafc;
          border: none;
          outline: none;
          font-size: 26px;
          font-weight: 500;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }

        .pin-key:active {
          background: #e2e8f0;
          transform: scale(0.94);
        }

        .pin-key--blank {
          background: transparent;
          cursor: default;
        }

        .pin-key--action {
          background: transparent;
          color: #ef4444;
        }

        .pin-key--action:active {
          background: #f1f5f9;
        }

        .pin-setup-footer-action {
          width: 100%;
          text-align: center;
          margin-top: 14px;
        }

        .pin-setup-skip-btn {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.15s;
        }

        .pin-setup-skip-btn:hover {
          color: #475569;
        }
      `}</style>
    </div>
  )
}
