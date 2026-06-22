'use client'

import React, { useState, useEffect } from 'react'
import { BiometryType } from '@capgo/capacitor-native-biometric'
import {
  Fingerprint,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { BiometricsService } from '../../services/biometricsService'
import { useToast } from '@/components/common/Toast'

interface BiometricEnrollmentStepProps {
  email: string
  password: string
  onComplete: () => void
}

export function BiometricEnrollmentStep({ email, password, onComplete }: BiometricEnrollmentStepProps) {
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null)
  const [processing, setProcessing] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    async function init() {
      const available = await BiometricsService.isAvailable()
      if (available) {
        const type = await BiometricsService.getBiometryType()
        setBiometryType(type)
      } else {
        onComplete()
      }
    }
    init()
  }, [])

  const handleEnable = async () => {
    setProcessing(true)
    try {
      const authenticated = await BiometricsService.authenticate(
        `Enable ${biometryType === BiometryType.FACE_ID ? 'Face ID' : 'Biometrics'} for Upward`
      )

      if (!authenticated) {
        error('Authentication failed')
        return
      }

      await BiometricsService.saveCredentials(email, password)
      await BiometricsService.setEnabled(true)

      success('Biometrics enabled successfully!')
      onComplete()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable biometrics'
      error(message)
    } finally {
      setProcessing(false)
    }
  }

  const getIcon = () => {
    if (biometryType === BiometryType.FACE_ID) {
      return <ShieldCheck size={48} strokeWidth={1.5} />
    }
    return <Fingerprint size={48} strokeWidth={1.5} />
  }

  const getTitle = () => {
    if (biometryType === BiometryType.FACE_ID) return 'Enable Face ID?'
    if (biometryType === BiometryType.TOUCH_ID || biometryType === BiometryType.FINGERPRINT) {
      return 'Enable Fingerprint?'
    }
    return 'Enable Biometric Login?'
  }

  return (
    <div className="auth-shell auth-shell--welcome auth-enrollment">
      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__logo">
        <UpwardLogo size={36} color="var(--clay)" />
      </a>

      <div className="auth-enrollment__body">
        <div className="auth-enrollment__icon">{getIcon()}</div>
        <h1 className="auth-stage__title">{getTitle()}</h1>
        <p className="auth-stage__subtitle">
          Sign in faster and more securely next time. We&apos;ll use your device&apos;s biometrics to keep your account safe.
        </p>

        <div className="auth-enrollment__pills">
          <span className="auth-enrollment__pill">
            <Lock size={14} /> Secure Encryption
          </span>
          <span className="auth-enrollment__pill">
            <CheckCircle2 size={14} /> Instant Access
          </span>
        </div>
      </div>

      <div className="auth-shell__ctas">
        <button
          type="button"
          className="auth-cta auth-cta--primary"
          onClick={handleEnable}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Enabling…
            </>
          ) : (
            <>
              Enable Now <ArrowRight size={18} />
            </>
          )}
        </button>

        <button
          type="button"
          className="auth-cta auth-cta--secondary"
          onClick={onComplete}
          disabled={processing}
        >
          Maybe Later
        </button>
      </div>
    </div>
  )
}
