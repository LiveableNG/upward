'use client'

import React, { useEffect, useState } from 'react'
import { Fingerprint, Loader2, Eye, EyeOff, X } from 'lucide-react'
import { BiometricsService } from '../services/biometricsService'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '../AuthContext'
import { login as verifyLogin } from '../services/authService'

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
      // 1. First verify identity via biometrics to ensure hardware is ready
      const authenticated = await BiometricsService.authenticate(
        'Prove your identity to enable biometric login'
      )
      
      if (!authenticated) {
        throw new Error('Biometric authentication cancelled')
      }

      // 2. Optional: Verify password with server to avoid saving typos
      // We use the existing login service as a verification step
      try {
        await verifyLogin({ email: user.email, password })
      } catch (err) {
        throw new Error('Invalid password. Please try again.')
      }

      // 3. Save to secure local storage
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

  if (loading || !isAvailable) return null

  return (
    <>
      <div className="settings-item settings-item--biometric" onClick={handleToggle}>
        <div className="settings-item__left">
          <div className="settings-item__icon-wrap">
            <Fingerprint size={20} color="var(--clay)" />
          </div>
          <div className="settings-item__content">
            <span className="settings-item__title">Biometric Login</span>
            <p className="settings-item__sub">Use FaceID or Fingerprint to sign in</p>
          </div>
        </div>
        <div className={`switch ${isEnabled ? 'is-active' : ''} ${processing ? 'is-loading' : ''}`}>
          <div className="switch__handle">
            {processing && <Loader2 size={12} className="animate-spin" />}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="confirm-modal-overlay animate-fade-in">
          <div className="confirm-modal">
            <div className="confirm-modal__header">
              <h3>Enable Biometrics</h3>
              <button className="confirm-modal__close" onClick={() => setShowConfirm(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="confirm-modal__text">
              Enter your password to securely store your credentials for biometric login.
            </p>
            
            <form onSubmit={handleConfirmPassword}>
              <div className="auth-form__field">
                <label>Your Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="confirm-modal__actions">
                <button 
                  type="button" 
                  className="btn btn--outline" 
                  onClick={() => setShowConfirm(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary" 
                  disabled={processing || !password}
                >
                  {processing ? 'Verifying...' : 'Enable Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-item--biometric {
          padding: 1.25rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .settings-item__left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .settings-item__icon-wrap {
          width: 36px;
          height: 36px;
          background: var(--surface2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .settings-item__content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .settings-item__title {
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
          display: block;
        }
        .settings-item__sub {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }
        .switch {
          width: 44px;
          height: 24px;
          background: var(--surface2);
          border-radius: 12px;
          padding: 2px;
          transition: all 0.3s;
          cursor: pointer;
          border: 1px solid var(--border);
        }
        .switch.is-active {
          background: var(--clay);
          border-color: var(--clay);
        }
        .switch__handle {
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .switch.is-active .switch__handle {
          transform: translateX(20px);
        }
        .switch.is-loading {
          opacity: 0.7;
          pointer-events: none;
        }

        .confirm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .confirm-modal {
          background: var(--bg);
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
        }
        .confirm-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .confirm-modal__header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }
        .confirm-modal__close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .confirm-modal__text {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .confirm-modal__actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 12px;
          margin-top: 24px;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
