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
      <div className="auth-layout__form auth-flow-loader">
        <Loader2 className="animate-spin" size={40} color="var(--clay)" />
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
          <div className="auth-visual-badge">
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

                <div className="auth-form__field">
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


                <div className="auth-form__field">
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
                    <div className="auth-field-hint auth-field-hint--error">
                      <AlertCircle size={12} /> Passwords don&apos;t match
                    </div>
                  )}
                </div>

                <div className="auth-form-info auth-u-mt-6">
                  <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
                  <p>Your data is protected and encrypted.</p>
                </div>

                <button
                  className="btn btn--primary btn--full btn--pay auth-form__mt-8"
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
        </div>
      </div>
    </div>
  )
}
