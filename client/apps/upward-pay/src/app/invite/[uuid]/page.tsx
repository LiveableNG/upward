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
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { setCookie } from '@/lib/cookie-utils'

export default function InvitePage() {
  const { uuid } = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { login, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
      return
    }
    fetchInviteData()
  }, [uuid, user])

  async function fetchInviteData() {
    try {
      const res = await api.get(`/public/invite/${uuid}`)
      if (res.success) {
        if (res.hasPassword) {
          success('Your account is already active. Please sign in.')
          router.push('/login')
          return
        }
        setInviteData(res)
        setFormData((prev: any) => ({
          ...prev,
          firstName: res.user.firstName || '',
          lastName: res.user.lastName || '',
          email: res.user.email || '',
          phone: res.user.phone || '',
          address: res.user.address || ''
        }))
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
      const res = await api.post(`/public/invite/${uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      })

      if (res.success) {
        success('Account activated! Welcome to Upward.')
        // Direct login
        if (res.user && res.accessToken) {
          setCookie('access_token', res.accessToken)
          login(res.user)
          router.push('/dashboard')
        } else {
          router.push('/signup?mode=login')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to activate account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="auth-shell auth-shell--signup flex-center">
      <div className="loading-spinner" />
      <style jsx>{`
        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--surface2);
          border-top-color: var(--clay);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  const companyName = inviteData?.company?.name || 'Your Landlord'

  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Activate your account</h1>
          <p className="auth-stage__subtitle">
            You&apos;ve been invited by <strong>{companyName}</strong> to join Upward and start building your payment credibility.
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
                className="disabled-input" 
              />
            </div>
          </div>

          <div className="auth-form__row mt-1">
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
          </div>

          <div className="form-info-box mt-4">
            <ShieldCheck size={18} color="var(--success)" strokeWidth={2.5} />
            <p>Direct invitation from <strong>{companyName}</strong>. Your data is secure and verified.</p>
          </div>

          <button className="btn btn--primary btn--full btn--pay mt-6" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Activating account…' : 'Accept Invitation'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
      </div>

      <style jsx>{`
        .auth-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .mt-1 {
          margin-top: 12px;
        }
        .disabled-input {
          cursor: not-allowed;
          opacity: 0.7;
          background: var(--surface2) !important;
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
        @media (max-width: 480px) {
          .auth-form__row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}