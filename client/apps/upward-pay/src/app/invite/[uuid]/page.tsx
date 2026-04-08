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
  const { login } = useAuth()

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<any>(null)
  const [formData, setFormData] = useState<any>({
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchInviteData()
  }, [uuid])

  async function fetchInviteData() {
    try {
      const res = await api.get(`/public/invite/${uuid}`)
      if (res.success) {
        setInviteData(res)
        setFormData({
          ...formData,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
          email: res.user.email,
          phone: res.user.phone,
          address: res.user.address
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
    if (formData.password !== formData.confirmPassword) {
      return toastError('Passwords do not match')
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
    <div className="invite-loading">
      <UpwardLogo size={36} color="#d97757" />
      <div className="loading-spinner" />
    </div>
  )

  const companyLogo = inviteData.company?.profilePic && inviteData.company.profilePic.trim() !== '' 
    ? inviteData.company.profilePic 
    : null;

  return (
    <div className="invite-page">
      <div className="invite-card">
        <header className="invite-header">
          <div className="brand-row">
            <UpwardLogo size={24} color="#d97757" />
            <span className="brand-name">UPWARD</span>
          </div>

          <div className="company-avatar-row">
            <div className="company-logo-wrap">
              {companyLogo ? (
                <img src={companyLogo} alt={inviteData.company?.name} className="company-logo-img" />
              ) : (
                <UpwardLogo size={24} color="#d97757" />
              )}
            </div>
            <div className="invite-badge">Official Invitation</div>
          </div>

          <h1 className="invite-title">Your rent now works for you</h1>
          <p className="invite-subtitle">
            {inviteData.manager?.name ? (
              <><strong>{inviteData.manager.name}</strong> at <strong>{inviteData.company?.name}</strong> has invited you. </>
            ) : (
              <><strong>{inviteData.company?.name}</strong> has invited you. </>
            )}
            Join Upward to build credit, earn rewards, and secure your tenancy record.
          </p>
        </header>

        <form className="invite-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <h3 className="section-title">Verify Your Data</h3>
            <div className="input-grid">
              <div className="input-field">
                <label><User size={13} /> First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="input-field">
                <label><User size={13} /> Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="input-field full-width">
                <label><Mail size={13} /> Email</label>
                <input type="email" value={formData.email} disabled className="disabled-input" />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="section-title">Set Your Password</h3>
            <div className="input-grid">
              <div className="input-field full-width">
                <label><Lock size={13} /> Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="input-field full-width">
                <label><Lock size={13} /> Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>
          </section>

          <div className="form-info-box">
            <ShieldCheck size={18} color="var(--success)" style={{ flexShrink: 0 }} />
            <p>Your tenancy at <strong>{inviteData.property?.location?.area || 'your residential area'}</strong> will be verified upon joining.</p>
          </div>

          <button className="invite-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'One moment...' : 'Accept Invitation'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
      </div>

      <style jsx>{`
        .invite-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--surface);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--safe-top) 0 calc(var(--safe-bottom) + 2rem);
        }

        .invite-card {
          background: var(--bg);
          width: 100%;
          max-width: 500px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-solid);
          overflow: hidden;
          margin: 1.5rem 1rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .invite-header {
          padding: 2rem 1.5rem 1.5rem;
          background: var(--surface);
          border-bottom: 1px solid var(--border-solid);
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .brand-name {
          font-weight: 900;
          font-size: 0.9rem;
          letter-spacing: 1.5px;
          color: var(--text);
        }

        .company-avatar-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .company-logo-wrap {
          width: 44px;
          height: 44px;
          background: var(--bg);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid var(--border-solid);
          flex-shrink: 0;
        }

        .company-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .invite-badge {
          background: var(--clay-faint);
          color: var(--clay);
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .invite-title {
          font-size: 1.35rem;
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        .invite-subtitle {
          color: var(--text-muted);
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .invite-subtitle strong {
          color: var(--text);
          font-weight: 700;
        }

        .invite-form {
          padding: 1.5rem;
        }

        .form-section {
          margin-bottom: 1.75rem;
        }

        .section-title {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-muted);
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-solid);
        }

        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .input-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .full-width {
          grid-column: span 2;
        }

        .input-field label {
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-muted);
        }

        .input-field input {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          color: var(--text);
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s;
          width: 100%;
        }

        .input-field input:focus {
          background: var(--bg);
          border-color: var(--clay);
          box-shadow: 0 0 0 3px var(--clay-glow);
          outline: none;
        }

        .disabled-input {
          cursor: not-allowed;
          opacity: 0.6;
          background: var(--surface2) !important;
        }

        .form-info-box {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          padding: 0.85rem;
          border-radius: var(--radius-lg);
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .form-info-box p {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .form-info-box p strong {
          color: var(--text);
        }

        .invite-submit {
          width: 100%;
          background: var(--clay);
          color: white;
          border: none;
          padding: 0.9rem;
          border-radius: var(--radius-lg);
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .invite-submit:hover:not(:disabled) {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }

        .invite-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .invite-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          background: var(--bg);
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 2px solid var(--surface2);
          border-top-color: var(--clay);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .invite-card {
            margin: 0;
            border-radius: 0;
            border: none;
            min-height: 100vh;
          }
          .input-grid {
            grid-template-columns: 1fr;
          }
          .full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  )
}