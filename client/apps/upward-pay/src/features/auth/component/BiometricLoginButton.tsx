'use client'

import React, { useEffect, useState } from 'react'
import { Fingerprint } from 'lucide-react'
import { BiometricsService } from '../services/biometricsService'
import { useToast } from '@/components/common/Toast'

interface BiometricLoginButtonProps {
  onAuthenticated: (email: string, password: string) => void
}

export function BiometricLoginButton({ onAuthenticated }: BiometricLoginButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const { error } = useToast()

  useEffect(() => {
    async function checkStatus() {
      const available = await BiometricsService.isAvailable()
      setIsAvailable(available)
      if (available) {
        const enabled = await BiometricsService.isEnabled()
        setIsEnabled(enabled)
      }
    }
    checkStatus()
  }, [])

  const handleBiometricLogin = async () => {
    try {
      const authenticated = await BiometricsService.authenticate(
        'Log in to Upward Pay'
      )
      
      if (authenticated) {
        const credentials = await BiometricsService.getCredentials()
        if (credentials) {
          onAuthenticated(credentials.email, credentials.password)
        } else {
          error('No stored credentials found. Please log in manually once.')
        }
      }
    } catch (err: any) {
      error(err.message || 'Biometric authentication failed')
    }
  }

  if (!isAvailable || !isEnabled) return null

  return (
    <div className="biometric-login">
      <div className="biometric-login__divider">
        <span>OR</span>
      </div>
      <button
        type="button"
        className="btn btn--outline btn--full biometric-login__btn"
        onClick={handleBiometricLogin}
      >
        <Fingerprint size={20} className="mr-2" />
        Log in with Biometrics
      </button>

      <style jsx>{`
        .biometric-login {
          margin-top: 1.5rem;
          width: 100%;
        }
        .biometric-login__divider {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .biometric-login__divider::before,
        .biometric-login__divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .biometric-login__divider span {
          padding: 0 12px;
        }
        .biometric-login__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-color: var(--border);
          color: var(--text);
          background: var(--surface);
        }
        .biometric-login__btn:active {
          background: var(--surface2);
        }
      `}</style>
    </div>
  )
}
