'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Scan, Delete, CheckCircle, Fingerprint, Loader2 } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { PinService, PinUserInfo } from '../services/pinService'
import { BiometricsService, getBiometryLabel } from '../services/biometricsService'
import { BiometryType } from '@capgo/capacitor-native-biometric'

interface PinLockScreenProps {
  user: PinUserInfo | null
  onUnlock: () => Promise<void> | void
  onLogout: () => void
}

export function PinLockScreen({ user, onUnlock, onLogout }: PinLockScreenProps) {
  const [pin, setPin] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const [isFaceIdPrompting, setIsFaceIdPrompting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null)
  const [hasBiometrics, setHasBiometrics] = useState(false)
  const autoTriggered = useRef(false)

  const isFaceId =
    biometryType === BiometryType.FACE_ID ||
    biometryType === BiometryType.FACE_AUTHENTICATION

  const bioLabel = getBiometryLabel(biometryType)
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    let isMounted = true

    async function checkBio() {
      try {
        const [avail, enabled, type] = await Promise.all([
          BiometricsService.isAvailable(),
          BiometricsService.isEnabled(),
          BiometricsService.getBiometryType(),
        ])

        if (!isMounted) return

        setBiometryType(type)
        const canUseBio = avail && enabled
        setHasBiometrics(canUseBio)

        // Only auto-trigger once if biometrics is enabled and supported
        if (canUseBio && !autoTriggered.current) {
          autoTriggered.current = true
          setTimeout(() => {
            if (isMounted) {
              triggerBiometric(type)
            }
          }, 450)
        }
      } catch (e) {
        console.warn('[PinLockScreen] Biometrics check error:', e)
      }
    }

    checkBio()

    return () => {
      isMounted = false
    }
  }, [])

  const triggerBiometric = async (currentBioType?: BiometryType | null) => {
    if (isFaceIdPrompting) return

    const typeToCheck = currentBioType !== undefined ? currentBioType : biometryType
    const label = getBiometryLabel(typeToCheck)

    setIsFaceIdPrompting(true)
    try {
      const success = await BiometricsService.authenticate(`Confirm ${label} to access Upward Pay`)
      if (success) {
        setIsAuthenticating(true)
        BiometricsService.setJustUnlocked()
        await onUnlock()
      }
    } catch (err) {
      console.warn('[PinLockScreen] Biometric unlock cancelled/failed:', err)
    } finally {
      setIsFaceIdPrompting(false)
      setIsAuthenticating(false)
    }
  }

  const handleKeyPress = async (digit: string) => {
    if (isAuthenticating || isFaceIdPrompting || pin.length >= 6) return
    setError(null)
    const newPin = [...pin, digit]
    setPin(newPin)

    if (newPin.length === 6) {
      const pinStr = newPin.join('')
      const isValid = await PinService.verifyPin(pinStr)
      if (isValid) {
        setIsAuthenticating(true)
        BiometricsService.setJustUnlocked()
        try {
          await onUnlock()
        } finally {
          setIsAuthenticating(false)
        }
      } else {
        setShaking(true)
        setError('Incorrect PIN')
        setTimeout(() => {
          setPin([])
          setShaking(false)
        }, 500)
      }
    }
  }

  const handleDelete = () => {
    if (isAuthenticating || isFaceIdPrompting || pin.length === 0) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }

  const handleLogoutClick = async () => {
    try {
      await PinService.clearPin()
      await BiometricsService.clearCredentials()
    } catch (e) {
      console.warn('[PinLockScreen] Error clearing PIN on logout:', e)
    }
    onLogout()
  }

  return (
    <div className="pin-lock-container">
      {/* Top Section */}
      <div className="pin-lock-header">
        <div className="pin-lock-avatar">
          <UpwardLogo size={32} color="var(--clay)" />
        </div>

        <h1 className="pin-lock-title">{displayName},</h1>
        <p className="pin-lock-subtitle">
          Please confirm your PIN to access your Upward Pay.{' '}
          <button type="button" className="pin-lock-logout-link" onClick={handleLogoutClick}>
            Not you? <strong>Log out</strong>
          </button>
        </p>
      </div>

      {/* PIN Dots Display */}
      <div className="pin-lock-display">
        <div className={`pin-dots-capsule ${shaking ? 'pin-dots--shake' : ''} ${error ? 'pin-dots--error' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const filled = index < pin.length
            return (
              <span
                key={index}
                className={`pin-dot ${filled ? 'pin-dot--filled' : ''} ${error ? 'pin-dot--error' : ''}`}
              />
            )
          })}
        </div>

        <div className="pin-encrypted-badge">
          {isAuthenticating ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Verifying &amp; signing in…</span>
            </>
          ) : (
            <>
              <span>100% Encrypted</span>
              <CheckCircle size={14} className="pin-encrypted-icon" />
            </>
          )}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="pin-keypad">
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
          {hasBiometrics ? (
            <button
              type="button"
              className="pin-key pin-key--action"
              onClick={() => triggerBiometric()}
              aria-label={`Unlock with ${bioLabel}`}
            >
              {isFaceId ? <Scan size={26} strokeWidth={1.75} /> : <Fingerprint size={26} strokeWidth={1.75} />}
            </button>
          ) : (
            <div className="pin-key pin-key--blank" />
          )}

          <button type="button" className="pin-key" onClick={() => handleKeyPress('0')}>
            0
          </button>

          <button
            type="button"
            className="pin-key pin-key--action pin-key--delete"
            onClick={handleDelete}
            aria-label="Delete digit"
          >
            <Delete size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .pin-lock-container {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 60px 28px 36px 28px;
          user-select: none;
          animation: pinFadeIn 0.2s ease-out;
        }

        @keyframes pinFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .pin-lock-header {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .pin-lock-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .pin-lock-title {
          font-size: 28px;
          font-weight: 700;
          color: #121826;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .pin-lock-subtitle {
          font-size: 15px;
          line-height: 1.45;
          color: #64748b;
          margin: 0;
        }

        .pin-lock-logout-link {
          background: none;
          border: none;
          padding: 0;
          font-size: 15px;
          color: #64748b;
          cursor: pointer;
          display: inline;
        }

        .pin-lock-logout-link strong {
          color: #121826;
          font-weight: 600;
          text-decoration: underline;
        }

        .pin-lock-display {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 20px 0;
        }

        .pin-dots-capsule {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 28px;
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s;
        }

        .pin-dots--error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .pin-dots--shake {
          animation: pinShake 0.4s ease-in-out;
        }

        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        .pin-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: background 0.15s, transform 0.15s;
        }

        .pin-dot--filled {
          background: #1e293b;
          transform: scale(1.15);
        }

        .pin-dot--error {
          background: #ef4444 !important;
        }

        .pin-encrypted-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 12.5px;
          font-weight: 500;
          color: #64748b;
        }

        :global(.pin-encrypted-icon) {
          color: #3b82f6;
        }

        /* Keypad Styling */
        .pin-keypad {
          width: 100%;
          max-width: 320px;
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
          -webkit-tap-highlight-color: transparent;
        }

        .pin-key:active {
          background: #e2e8f0;
          transform: scale(0.94);
        }

        .pin-key--action {
          background: transparent;
          color: #475569;
        }

        .pin-key--action:active {
          background: #f1f5f9;
        }

        .pin-key--delete {
          color: #ef4444;
        }
      `}</style>
    </div>
  )
}
