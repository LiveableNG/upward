'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useChangePassword } from '@/features/pm/hooks/usePmSettings'
import { Fingerprint, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { login as verifyLogin } from '@/features/auth/services/authService'
import { useToast } from '@/components/common/Toast'

const securitySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

type SecurityFormData = z.infer<typeof securitySchema>

export function SecurityForm() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const { mutate: changePassword, isPending } = useChangePassword()

  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
      } catch (err: any) {
        error(err.message || 'Failed to disable biometrics')
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
        'Prove your identity to enable biometric login'
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
    } catch (err: any) {
      error(err.message || 'Failed to enable biometrics')
    } finally {
      setProcessing(false)
    }
  }

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema)
  })

  const onSubmit = (data: SecurityFormData) => {
    changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }, {
      onSuccess: () => reset()
    })
  }

  return (
    <section className="settings__section">
      <div className="settings__section-header">
        <h2 className="settings__section-title">Security</h2>
        <p className="settings__section-subtitle">Manage your password and account security.</p>
      </div>

      <form className="settings__form" onSubmit={handleSubmit(onSubmit)}>
        <div className="settings__field">
          <label className="settings__label">Current Password</label>
          <input 
            type="password"
            {...register('currentPassword')}
            className="settings__input"
            placeholder="••••••••"
          />
          {errors.currentPassword && <span className="text-error text-xs">{errors.currentPassword.message}</span>}
        </div>

        <div className="settings__grid">
          <div className="settings__field">
            <label className="settings__label">New Password</label>
            <input 
              type="password"
              {...register('newPassword')}
              className="settings__input"
              placeholder="••••••••"
            />
            {errors.newPassword && <span className="text-error text-xs">{errors.newPassword.message}</span>}
          </div>
          <div className="settings__field">
            <label className="settings__label">Confirm New Password</label>
            <input 
              type="password"
              {...register('confirmPassword')}
              className="settings__input"
              placeholder="••••••••"
            />
            {errors.confirmPassword && <span className="text-error text-xs">{errors.confirmPassword.message}</span>}
          </div>
        </div>

        <button 
          type="submit" 
          className="settings__submit"
          disabled={isPending || !isDirty}
        >
          {isPending ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {isAvailable && (
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <button 
            type="button" 
            onClick={handleToggle}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '16px',
              background: 'var(--bg-soft)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
              <Fingerprint size={24} color="var(--forest)" />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: 'var(--text)' }}>Biometric Login</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Use Face ID or fingerprint to sign in securely</p>
              </div>
            </div>
            {processing ? (
              <Loader2 size={18} className="animate-spin" color="var(--text-muted)" />
            ) : (
              <div style={{
                width: '40px',
                height: '24px',
                borderRadius: '12px',
                background: isEnabled ? 'var(--forest)' : 'var(--border)',
                position: 'relative',
                transition: 'background 0.2s'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: isEnabled ? '19px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}></div>
              </div>
            )}
          </button>
        </div>
      )}

      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Enable Biometrics</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Enter your current account password to securely link your biometrics for login.
            </p>

            <form onSubmit={handleConfirmPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '0 48px 0 16px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={processing}
                  className="btn btn--secondary"
                  style={{ flex: 1, borderRadius: '12px', height: '48px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !password}
                  className="btn btn--primary"
                  style={{ flex: 1, borderRadius: '12px', height: '48px', gap: '8px' }}
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
