'use client'

import React, { useEffect, useState } from 'react'
import { Fingerprint, Scan, Loader2, Eye, EyeOff, X } from 'lucide-react'
import { BiometricsService, getBiometryLabel } from '../services/biometricsService'
import { PinService } from '../services/pinService'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '../AuthContext'
import { login as verifyLogin } from '../services/authService'
import { PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { BiometryType } from '@capgo/capacitor-native-biometric'

interface BiometricSwitchProps {
  onPromptPinSetup?: () => void
}

export function BiometricSwitch({ onPromptPinSetup }: BiometricSwitchProps = {}) {
  const { user } = useAuth()
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { success, error } = useToast()

  const bioLabel = getBiometryLabel(biometryType)
  const isFaceId = biometryType === BiometryType.FACE_ID || biometryType === BiometryType.FACE_AUTHENTICATION

  useEffect(() => {
    async function checkAvailability() {
      const [available, enabled, type] = await Promise.all([
        BiometricsService.isAvailable(),
        BiometricsService.isEnabled(),
        BiometricsService.getBiometryType(),
      ])
      setIsAvailable(available)
      setIsEnabled(enabled)
      setBiometryType(type)
      setLoading(false)
    }
    checkAvailability()
  }, [])

  const handleToggle = async () => {
    if (processing) return

    if (isEnabled) {
      setProcessing(true)
      try {
        await BiometricsService.setEnabled(false)
        setIsEnabled(false)
        success('Biometric login disabled')
      } catch (err: unknown) {
        error(err instanceof Error ? err.message : 'Failed to disable biometrics')
      } finally {
        setProcessing(false)
      }
    } else {
      // Must have an enrolled PIN before enabling biometrics!
      const hasPin = await PinService.hasPin(user?.email)
      if (!hasPin) {
        error('Please set up an App PIN code before enabling biometric login')
        if (onPromptPinSetup) {
          onPromptPinSetup()
        }
        return
      }
      setShowConfirm(true)
    }
  }

  const handleConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email || !password) return

    setProcessing(true)
    try {
      const authenticated = await BiometricsService.authenticate(
        'Prove your identity to enable biometric login',
      )

      if (!authenticated) {
        throw new Error('Biometric authentication cancelled')
      }

      try {
        await verifyLogin({ email: user.email, password })
      } catch {
        throw new Error('Invalid password. Please try again.')
      }

      await BiometricsService.saveCredentials(user.email, password)
      await BiometricsService.setEnabled(true)

      setIsEnabled(true)
      setShowConfirm(false)
      setPassword('')
      success('Biometric login enabled successfully')
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Failed to enable biometrics')
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !isAvailable) return null

  return (
    <>
      <button type="button" className="settings-page__row" onClick={handleToggle}>
        <span className="settings-page__row-left">
          <span className="settings-page__row-icon">
            {isFaceId ? <Scan size={18} /> : <Fingerprint size={18} />}
          </span>
          <span className="settings-page__row-text">
            <span className="settings-page__row-title">{bioLabel} unlock</span>
            <span className="settings-page__row-desc">Use {bioLabel} to quickly unlock Upward Pay</span>
          </span>
        </span>
        <span
          className={`settings-page__switch ${isEnabled ? 'settings-page__switch--on' : ''} ${processing ? 'settings-page__switch--loading' : ''}`}
          aria-hidden
        >
          <span className="settings-page__switch-handle">
            {processing ? <Loader2 size={12} className="settings-page__switch-spin" /> : null}
          </span>
        </span>
      </button>

      {showConfirm ? (
        <div className="settings-modal-overlay">
          <div className="settings-modal" role="dialog" aria-labelledby="biometric-modal-title">
            <div className="settings-modal__header">
              <h3 id="biometric-modal-title" className="settings-modal__title">
                Enable biometrics
              </h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="settings-modal__text">
              Enter your password to securely store your credentials for biometric login.
            </p>

            <form onSubmit={handleConfirmPassword}>
              <div className="personal-field">
                <label htmlFor="biometricPassword">Your password</label>
                <div className="settings-page__field-wrap">
                  <input
                    id="biometricPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="settings-page__password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="settings-modal__actions">
                <button
                  type="button"
                  className="personal-sticky-actions__cancel"
                  onClick={() => setShowConfirm(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <PayFlowPrimaryButton type="submit" disabled={processing || !password} loading={processing}>
                  Enable now
                </PayFlowPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
