'use client'

import React, { useEffect, useState } from 'react'
import { Fingerprint, Loader2, Eye, EyeOff, X } from 'lucide-react'
import { BiometricsService } from '../services/biometricsService'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '../AuthContext'
import { login as verifyLogin } from '../services/authService'
import { PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'

export function BiometricSwitch() {
  const { user } = useAuth()
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { success, error } = useToast()

  useEffect(() => {
    async function checkAvailability() {
      const available = await BiometricsService.isAvailable()
      setIsAvailable(available)
      if (available) {
        const enabled = await BiometricsService.isEnabled()
        setIsEnabled(enabled)
      }
      setLoading(false)
    }
    checkAvailability()
  }, [])

  const handleToggle = async () => {
    if (processing) return

    if (isEnabled) {
      setProcessing(true)
      try {
        await BiometricsService.clearCredentials()
        setIsEnabled(false)
        success('Biometric login disabled')
      } catch (err: unknown) {
        error(err instanceof Error ? err.message : 'Failed to disable biometrics')
      } finally {
        setProcessing(false)
      }
    } else {
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
            <Fingerprint size={18} />
          </span>
          <span className="settings-page__row-text">
            <span className="settings-page__row-title">Biometric login</span>
            <span className="settings-page__row-desc">Use Face ID or fingerprint to sign in</span>
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
