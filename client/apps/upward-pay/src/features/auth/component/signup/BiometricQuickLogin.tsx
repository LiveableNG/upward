'use client'

import { Fingerprint, Scan, Loader2 } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { BiometryType } from '@capgo/capacitor-native-biometric'

interface BiometricQuickLoginProps {
  userEmail: string
  biometryType: BiometryType | null
  loading: boolean
  onAuthenticate: () => void
  onUsePasswordInstead: () => void
}

export function BiometricQuickLogin({
  userEmail,
  biometryType,
  loading,
  onAuthenticate,
  onUsePasswordInstead,
}: BiometricQuickLoginProps) {
  const isFaceId =
    biometryType === BiometryType.FACE_ID ||
    biometryType === BiometryType.FACE_AUTHENTICATION

  const label = isFaceId
    ? 'Face ID'
    : biometryType === BiometryType.TOUCH_ID || biometryType === BiometryType.FINGERPRINT
      ? 'Touch ID'
      : 'Biometrics'

  // Extract display name prefix before @ if email exists
  const displayName = userEmail ? userEmail.split('@')[0] : 'User'

  return (
    <div className="auth-stage-card biometric-quick-card">
      <div className="auth-stage-card__header biometric-quick-header">
        <div className="auth-stage-card__logo-wrapper">
          <UpwardLogo />
        </div>
      </div>

      <div className="biometric-quick-content">
        <span className="biometric-quick-eyebrow">WELCOME BACK</span>
        <h2 className="biometric-quick-name">{displayName}</h2>
        <p className="biometric-quick-email">{userEmail}</p>

        <div className="biometric-trigger-wrapper">
          <button
            type="button"
            className={`biometric-trigger-btn ${loading ? 'biometric-trigger-btn--loading' : ''}`}
            onClick={onAuthenticate}
            disabled={loading}
            aria-label={`Authenticate with ${label}`}
          >
            <div className="biometric-trigger-glow" />
            <div className="biometric-trigger-icon-box">
              {loading ? (
                <Loader2 className="animate-spin" size={42} />
              ) : isFaceId ? (
                <Scan size={44} strokeWidth={1.75} />
              ) : (
                <Fingerprint size={44} strokeWidth={1.75} />
              )}
            </div>
            <span className="biometric-trigger-label">{label}</span>
          </button>
          <p className="biometric-trigger-hint">
            {loading ? 'Verifying identity…' : `Tap icon to log in with ${label}`}
          </p>
        </div>

        <button
          type="button"
          className="btn btn--outline btn--full biometric-switch-btn"
          onClick={onUsePasswordInstead}
        >
          Use Password Instead
        </button>
      </div>
    </div>
  )
}
