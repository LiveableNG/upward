/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'
import { useAuth } from '@/features/auth/AuthContext'
import { setAccessToken } from '@/lib/auth-token'
import { PasswordStrengthMeter } from '@/features/auth/component/signup/PasswordStrengthMeter'

export default function WaitlistClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const uuid = (params.uuid as string) || searchParams.get('uuid') || searchParams.get('claim') || ''
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { login } = useAuth()
  const [loading, setLoading] = useState(true)
  const [waitlistData, setWaitlistData] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    fetchWaitlistData()
  }, [uuid])

  async function fetchWaitlistData() {
    try {
      const res = await api.get(`/waitlist/claim/${uuid}`)
      if (res.email) {
        if (res.hasPassword) {
          success('Your account is already active. Please sign in.')
          router.push('/login')
          return
        }
        setWaitlistData(res)
        setFormData({
          ...formData,
          firstName: res.firstName || '',
          lastName: res.lastName || '',
          email: res.email || ''
        })
      }
    } catch (err) {
      toastError('Waitlist entry not found or has expired')
      router.push('/signup')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.post(`/waitlist/claim/${uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      })

      if (res.success) {
        success('Account activated! Welcome to Upward.')
        if (res.user) {
          if (res.accessToken) setAccessToken(res.accessToken)
          login(res.user)
          router.replace('/dashboard')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to activate account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="auth-layout">
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
            <div className="auth-layout__card-mock" style={{ backdropFilter: 'blur(8px)' }}></div>
          </div>
          <h1>Welcome back.</h1>
          <p>We're preparing your priority access. Just a moment while we load your details...</p>
        </div>
      </div>
      <div className="auth-layout__form flex-center">
        <Loader2 className="animate-spin" size={40} color="var(--clay)" />
        <style jsx>{`
          .flex-center {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            min-height: 100vh;
          }
        `}</style>
      </div>
    </div>
  )

  return (
    <div className="auth-layout">
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock"></div>
          </div>
          <h1>Priority Access.</h1>
          <p>
            Thanks for your patience on our waitlist. You're now ready to start
            building your rental credibility with Upward.
          </p>
          <div className="visual-badge">
            <Sparkles size={16} />
            <span>Founding Member Access</span>
          </div>
        </div>
      </div>

      <div className="auth-layout__form">
        <div className="auth-shell auth-shell--signup">
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>

          <div className="auth-stage">
            <div className="animate-pop">
              <div className="auth-stage__header">
                <h1 className="auth-stage__title">Claim your account</h1>
                <p className="auth-stage__subtitle">
                  Confirm your details and set a password to get started.
                </p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {localError && <div className="auth-form__error">{localError}</div>}
                
                <OnboardingFields formData={formData} setFormData={setFormData} />

                <div className="auth-form__field mt-4">
                  <label>Set Password</label>
                  <div className="input-with-icon">
                    <Lock size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formData.password.length > 0 && (
                    <PasswordStrengthMeter password={formData.password} />
                  )}
                </div>


                <div className="auth-form__field mt-4">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <Lock size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      placeholder="Re-enter your password"
                      className={
                        formData.confirmPassword.length > 0
                          ? formData.confirmPassword === formData.password
                            ? 'input--match'
                            : 'input--error'
                          : ''
                      }
                    />
                    {formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password && (
                      <CheckCircle2 size={17} className="match-icon" />
                    )}
                  </div>
                  {formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password && (
                    <div className="field-hint field-hint--error">
                      <AlertCircle size={12} /> Passwords don't match
                    </div>
                  )}
                </div>

                <div className="form-info-box mt-6">
                  <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
                  <p>Your data is protected and encrypted.</p>
                </div>

                <button 
                  className="btn btn--primary btn--full btn--pay mt-8" 
                  type="submit" 
                  disabled={
                    isSubmitting || 
                    !formData.password || 
                    !(/.{8,}/.test(formData.password) && /[A-Z]/.test(formData.password) && /[0-9!@#$%^&*(),.?":{}|<> ]/.test(formData.password)) ||
                    formData.password !== formData.confirmPassword
                  }
                >
                  {isSubmitting ? 'Claiming…' : 'Claim Account'}
                  {!isSubmitting && <ArrowRight size={17} />}
                </button>
              </form>
            </div>
          </div>

          <style jsx>{`
            .mt-4 { margin-top: 16px; }
            .mt-6 { margin-top: 24px; }
            .mt-8 { margin-top: 32px; }
            .form-info-box {
              background: var(--surface);
              border: 1px solid var(--border-solid);
              padding: 12px;
              border-radius: var(--radius-md);
              display: flex;
              gap: 10px;
              align-items: center;
            }
            .form-info-box p {
              font-size: 13px;
              color: var(--text-secondary);
              line-height: 1.4;
              margin: 0;
            }
            .animate-pop {
              animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes pop {
              0% { transform: scale(0.95); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            .visual-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(255,255,255,0.1);
              padding: 8px 16px;
              border-radius: 100px;
              font-size: 12px;
              font-weight: 600;
              color: white;
              margin-top: 24px;
              backdrop-filter: blur(4px);
              border: 1px solid rgba(255,255,255,0.1);
            }
            .input--error { border-color: var(--error) !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }
            .input--match { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.1) !important; }
            .match-icon { position: absolute; right: 12px; color: #22c55e; pointer-events: none; }
            .field-hint { display: flex; align-items: center; gap: 4px; font-size: 11px; margin-top: 5px; }
            .field-hint--error { color: var(--error); }
          `}</style>
        </div>
      </div>
    </div>
  )
}
