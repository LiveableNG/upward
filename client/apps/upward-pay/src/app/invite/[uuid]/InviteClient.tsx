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
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { setCookie } from '@/lib/cookie-utils'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'
import { setAccessToken } from '@/lib/auth-token'

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

                  <div className="auth-form__field mt-1">
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
                    </div>
                  </div>

                  <div className="auth-form__field mt-1">
                    <label>Confirm Password</label>
                    <div className="input-with-icon">
                      <Lock size={17} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-info-box mt-4">
                    <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
                    <p>Complete your profile to continue.</p>
                  </div>

                  <button className="btn btn--primary btn--full btn--pay mt-6" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Activating…' : 'Activate Account'}
                    {!isSubmitting && <ArrowRight size={17} />}
                  </button>
                </form>
              </div>
            )}
          </div>

          <style jsx>{`
            .mt-1 { margin-top: 12px; }
            .mt-4 { margin-top: 24px; }
            .mt-6 { margin-top: 32px; }
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
            .auth-form__row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            @media (max-width: 480px) {
              .auth-form__row {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}
