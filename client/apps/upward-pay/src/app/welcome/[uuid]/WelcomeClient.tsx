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
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { setAccessToken } from '@/lib/auth-token'

interface WelcomeClientProps {
  overrideUuid?: string
}

export default function WelcomeClient({ overrideUuid }: WelcomeClientProps = {}) {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawParam =
    overrideUuid ||
    (params?.uuid as string) ||
    searchParams.get('uuid') ||
    searchParams.get('claim') ||
    ''
  const uuid =
    rawParam && rawParam !== 'placeholder'
      ? rawParam
      : (typeof window !== 'undefined'
          ? window.location.pathname.match(/\/welcome\/([^/?#]+)/)?.[1]
          : '') || ''
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
    if (!uuid || uuid === 'placeholder') {
      setLoading(false)
      return
    }
    try {
      const res = await api.get(`/waitlist/claim/${uuid}`)
      if (res.success) {
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
      toastError('Waitlist record not found or expired')
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

      if (res.success || res.accessToken) {
        success('Welcome to Upward! Your account is ready.')
        if (res.user) {
          if (res.accessToken) setAccessToken(res.accessToken)
          login(res.user)
          router.replace('/dashboard')
        } else {
          // Fallback if res.user is missing but registration succeeded
          router.replace('/login')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to create account')
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
          <p>We're retrieving your waitlist details...</p>
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
          <h1>It's your turn.</h1>
          <p>
            You've been on the waitlist, and now it's time to experience 
            the future of rental credibility. Complete your account to get started.
          </p>
          
          <div className="auth-visual-badge auth-visual-badge--success">
            <Sparkles size={16} />
            <span>Priority Access Granted</span>
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
                <h1 className="auth-stage__title">Finalize your account</h1>
                <p className="auth-stage__subtitle">
                  We've pre-filled your details from the waitlist. 
                  Just set a password to continue.
                </p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {localError && <div className="auth-form__error">{localError}</div>}
                
                <div className="auth-form__row">
                  <div className="auth-form__field">
                    <label>First Name</label>
                    <div className="input-with-icon">
                      <User size={17} />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        placeholder="First name"
                      />
                    </div>
                  </div>
                  <div className="auth-form__field">
                    <label>Last Name</label>
                    <div className="input-with-icon">
                      <User size={17} />
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-form__field auth-u-mt-4">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={17} />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="disabled-input"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

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
                  </div>
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

                <div className="auth-form-info auth-u-mt-4">
                  <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
                  <p>Your data is protected and encrypted.</p>
                </div>

                <button className="btn btn--primary btn--full btn--pay auth-form__mt-6" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Account…' : 'Get Started'}
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
