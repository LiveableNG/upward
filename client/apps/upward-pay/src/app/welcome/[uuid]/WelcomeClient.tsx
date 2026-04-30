/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

export default function WelcomeClient() {
  const params = useParams()
  const uuid = params.uuid as string
  const router = useRouter()
  const { success, error: toastError } = useToast()
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

      if (res.accessToken) {
        success('Welcome to Upward! Your account is ready.')
        // Redirect to dashboard (AuthContext will pick up cookies)
        window.location.href = '/dashboard'
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
          <h1>It's your turn.</h1>
          <p>
            You've been on the waitlist, and now it's time to experience 
            the future of rental credibility. Complete your account to get started.
          </p>
          
          <div className="waitlist-badge">
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

                <div className="auth-form__field mt-1">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={17} />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="input--disabled"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

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
                  <p>Your data is protected and encrypted.</p>
                </div>

                <button className="btn btn--primary btn--full btn--pay mt-6" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Account…' : 'Get Started'}
                  {!isSubmitting && <ArrowRight size={17} />}
                </button>
              </form>
            </div>
          </div>

          <style jsx>{`
            .mt-1 { margin-top: 12px; }
            .mt-4 { margin-top: 24px; }
            .mt-6 { margin-top: 32px; }
            .input--disabled {
              background: var(--bg-secondary);
              color: var(--text-muted);
              cursor: not-allowed;
            }
            .waitlist-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(34, 197, 94, 0.1);
              color: #22c55e;
              padding: 6px 12px;
              border-radius: 100px;
              font-size: 13px;
              font-weight: 600;
              margin-top: 24px;
            }
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
