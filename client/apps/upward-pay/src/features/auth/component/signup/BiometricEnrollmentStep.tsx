'use client'

import React, { useState, useEffect } from 'react'
import { BiometryType } from '@capgo/capacitor-native-biometric'
import { 
  Fingerprint, 
  ShieldCheck, 
  ChevronRight,
  CheckCircle2,
  Lock,
  Loader2
} from 'lucide-react'
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
  const [isAvailable, setIsAvailable] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    async function init() {
      const available = await BiometricsService.isAvailable()
      setIsAvailable(available)
      if (available) {
        const type = await BiometricsService.getBiometryType()
        setBiometryType(type)
      } else {
        // If somehow reached but not available, auto-skip
        onComplete()
      }
    }
    init()
  }, [])

  const handleEnable = async () => {
    setProcessing(true)
    try {
      // 1. Authenticate to ensure the user has setup biometrics on their device
      const authenticated = await BiometricsService.authenticate(
        `Enable ${biometryType === BiometryType.FACE_ID ? 'Face ID' : 'Biometrics'} for Upward`
      )

      if (!authenticated) {
        error('Authentication failed')
        return
      }

      // 2. Save credentials to secure storage
      await BiometricsService.saveCredentials(email, password)
      await BiometricsService.setEnabled(true)

      success('Biometrics enabled successfully!')
      onComplete()
    } catch (err: any) {
      error(err.message || 'Failed to enable biometrics')
    } finally {
      setProcessing(false)
    }
  }

  const getIcon = () => {
    if (biometryType === BiometryType.FACE_ID) {
      return <ShieldCheck size={64} color="var(--clay)" strokeWidth={1.5} />
    }
    return <Fingerprint size={64} color="var(--clay)" strokeWidth={1.5} />
  }

  const getTitle = () => {
    if (biometryType === BiometryType.FACE_ID) return 'Enable Face ID?'
    if (biometryType === BiometryType.TOUCH_ID || biometryType === BiometryType.FINGERPRINT) return 'Enable Fingerprint?'
    return 'Enable Biometric Login?'
  }

  return (
    <div className="enrollment-shell animate-fade-in">
      <div className="enrollment-card">
        <div className="enrollment-card__visual">
          <div className="enrollment-card__icon-pulse">
            {getIcon()}
          </div>
        </div>

        <div className="enrollment-card__content">
          <h1 className="enrollment-card__title">{getTitle()}</h1>
          <p className="enrollment-card__description">
            Sign in faster and more securely next time. We'll use your 
            device's biometrics to keep your account safe.
          </p>

          <div className="enrollment-card__benefits">
            <div className="benefit-pill">
              <Lock size={14} /> <span>Secure Encryption</span>
            </div>
            <div className="benefit-pill">
              <CheckCircle2 size={14} /> <span>Instant Access</span>
            </div>
          </div>
        </div>

        <div className="enrollment-card__actions">
          <button 
            className="btn btn--primary btn--full btn--large" 
            onClick={handleEnable}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enabling…
              </>
            ) : (
              <>
                Enable Now <ChevronRight size={18} />
              </>
            )}
          </button>
          
          <button 
            className="btn btn--link btn--full" 
            onClick={onComplete}
            disabled={processing}
          >
            Maybe Later
          </button>
        </div>
      </div>

      <style jsx>{`
        .enrollment-shell {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg);
        }
        .enrollment-card {
          width: 100%;
          max-width: 420px;
          text-align: center;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .enrollment-card__visual {
          margin-bottom: 32px;
          display: flex;
          justify-content: center;
        }
        .enrollment-card__icon-pulse {
          width: 120px;
          height: 120px;
          background: var(--surface2);
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .enrollment-card__icon-pulse::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: var(--clay);
          border-radius: 40px;
          opacity: 0.1;
          animation: pulse 2s infinite;
        }
        .enrollment-card__title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .enrollment-card__description {
          font-size: 16px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .enrollment-card__benefits {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 40px;
        }
        .benefit-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        .enrollment-card__actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn--large {
          padding: 18px;
          font-size: 16px;
          font-weight: 700;
        }
        .btn--link {
          background: none;
          color: var(--text-muted);
          font-weight: 600;
          padding: 12px;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.15); opacity: 0.05; }
          100% { transform: scale(1); opacity: 0.1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
