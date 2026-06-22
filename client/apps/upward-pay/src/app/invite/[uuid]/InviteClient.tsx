/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { setCookie } from '@/lib/cookie-utils'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'
import { setAccessToken } from '@/lib/auth-token'
import { PasswordStrengthMeter } from '@/features/auth/component/signup/PasswordStrengthMeter'

export default function InviteClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = (params.uuid as string) || searchParams.get('token') || searchParams.get('invite') || ''
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { login } = useAuth()
  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<any>(null)
  const [step, setStep] = useState<'form'>('form')
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
    fetchInviteData()
  }, [token])

  async function fetchInviteData() {
    try {
      const res = await api.get(`/public/invite/${token}`)
      if (res?.isWaitlist) {
        router.replace(`/waitlist/${token}`)
        router.refresh()
        return
      }
      
      if (res.success) {
        if (res.hasPassword) {
          success('Your account is already active. Please sign in.')
          router.push('/login')
          return
        }
        setInviteData(res)
        setFormData({
          ...formData,
          firstName: res.firstName || '',
          lastName: res.lastName || '',
          email: res.email || ''
        })
      }
    } catch (err) {
      toastError('Invite not found or has expired')
      router.push('/signup?mode=login')
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
      const res = await api.post(`/public/invite/${token}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      })

      if (res.success) {
        success('Account activated! Welcome to Upward.')
        // The controller sets cookies, but we might need to trigger AuthContext
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
          <h1>Preparing your invite.</h1>
          <p>Securing your data and loading your personalized invitation...</p>
        </div>
      </div>
      <div className="auth-layout__form auth-flow-loader">
        <Loader2 className="animate-spin" size={40} color="var(--clay)" />
      </div>
    </div>
  )

  const companyName = inviteData?.company?.name || 'Your Landlord'

  return (
    <div className="auth-layout">
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock"></div>
          </div>
          <h1>Join {companyName}.</h1>
          <p>
            You've been invited to Upward. Accept your invitation to start
            building your rental credibility effortlessly.
          </p>
        </div>
      </div>

      <div className="auth-layout__form">
        <div className="auth-shell auth-shell--signup">
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>

          <div className="auth-stage">
            {step === 'form' && (
              <div className="animate-pop">
                <div className="auth-stage__header">
                  <h1 className="auth-stage__title">Complete your profile</h1>
                  <p className="auth-stage__subtitle">
                    Verify your details and set a password to activate your account.
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

                  <div className="auth-form-info auth-u-mt-4">
                    <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
                    <p>Complete your profile to continue.</p>
                  </div>

                  <button
                    className="btn btn--primary btn--full btn--pay auth-form__mt-6"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !formData.password ||
                      !(/.{8,}/.test(formData.password) && /[A-Z]/.test(formData.password) && /[0-9!@#$%^&*(),.?":{}|<> ]/.test(formData.password)) ||
                      formData.password !== formData.confirmPassword
                    }
                  >
                    {isSubmitting ? 'Activating…' : 'Activate Account'}
                    {!isSubmitting && <ArrowRight size={17} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
