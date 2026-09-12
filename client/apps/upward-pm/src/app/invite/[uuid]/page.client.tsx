
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Lock, 
  ArrowRight, 
  Mail, 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  User,
  UserCheck,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react'
import { request } from '@/lib/api-client'
import { claimAccount, getEmployeeInviteDetails, acceptEmployeeInvite } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { AuthLayout } from '@/components/auth/AuthLayout'

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'

export default function ClaimAccountPage() {
  const { uuid } = useParams()
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [isEmployeeInvite, setIsEmployeeInvite] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        // Try employee invite first
        try {
          const res = await getEmployeeInviteDetails(uuid as string)
          if (res) {
            setUserData(res)
            setIsEmployeeInvite(true)
            setFirstName(res.firstName || '')
            setLastName(res.lastName || '')
            return
          }
        } catch {
          // Fallback to legacy PM invite
          const res = await request<any>(`/pm/auth/invite-details/${uuid}`)
          setUserData(res)
          setIsEmployeeInvite(false)
          setFirstName(res.firstName || '')
          setLastName(res.lastName || '')
        }
      } catch (err) {
        error('Invalid or expired invitation link.')
      } finally {
        setLoading(false)
      }
    }
    if (uuid) fetchUser()
  }, [uuid])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return error('Please enter a password')
    if (password !== confirmPassword) return error('Passwords do not match')
    if (password.length < 6) return error('Password must be at least 6 characters')

    setClaiming(true)
    try {
      let res: any
      if (isEmployeeInvite) {
        res = await acceptEmployeeInvite(uuid as string, { password, firstName, lastName })
      } else {
        res = await claimAccount(uuid as string, { password, firstName, lastName })
      }

      if (res.user) {
        setAuthUser(res.user)
        queryClient.setQueryData(['user'], res.user)
      }
      success('Account activated successfully! Welcome to Upward.')
      router.push('/dashboard')
    } catch (err: any) {
      error(err.message || 'Failed to activate account')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ivory,#faf6ec)]">
        <div className="animate-pulse flex flex-col items-center">
          <UpwardLogo color="var(--forest-800)" size={48} />
          <div className="h-4 w-32 bg-[var(--line,#e4ddc9)] rounded mt-4" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <AuthLayout 
        visualTitle="Welcome to Upward"
        visualDesc="Manage properties, tenants and collections seamlessly with your team."
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AlertCircle size={48} color="var(--error)" />
          </div>
          <div className="card-head">
            <h2>Invitation invalid or expired</h2>
            <p>
              This invitation link is invalid or has already been claimed. Please reach out to the person who invited you.
            </p>
          </div>
          <button 
            type="button" 
            className="primary-btn" 
            onClick={() => router.push('/login')}
            style={{ marginTop: 24 }}
          >
            <span>Go to sign in</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  const inviter = userData.invitedBy

  return (
    <AuthLayout
      eyebrow="Team Invitation"
      visualTitle="Activate your team member account."
      visualDesc="Join your property management team on Upward to collaborate and manage workflows seamlessly."
    >
      <div className="animate-fade-in">
        {/* Card Header */}
        <div className="card-head">
          <h2>Activate your account</h2>
          <p>
            Complete your details below to set your password and access your workspace.
          </p>
        </div>

        {/* Workspace Invitation Card */}
        <div className="workspace-invite-card">
          <div className="workspace-invite-card__icon">
            <Building2 size={22} />
          </div>
          <div className="workspace-invite-card__body">
            <span className="workspace-invite-card__eyebrow">Workspace Invitation</span>
            <h3 className="workspace-invite-card__title">
              {inviter?.companyName || inviter?.name || 'Upward Workspace'}
            </h3>
            <div className="workspace-invite-card__meta">
              <span className="workspace-invite-card__email">
                <Mail size={13} />
                {userData.email}
              </span>
              {inviter?.name && inviter.name !== inviter?.companyName && (
                <span className="workspace-invite-card__inviter">
                  · Invited by {inviter.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleClaim} noValidate>
          <div className="field-grid-2">
            <div className="field">
              <label htmlFor="claim-first-name">First name</label>
              <div className="input-shell">
                <User size={17} />
                <input
                  id="claim-first-name"
                  type="text"
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="claim-last-name">Last name</label>
              <div className="input-shell">
                <User size={17} />
                <input
                  id="claim-last-name"
                  type="text"
                  required
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="claim-pass">Create password</label>
            <div className="input-shell">
              <Lock size={17} />
              <input
                id="claim-pass"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="icon-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="claim-confirm-pass">Confirm password</label>
            <div className="input-shell">
              <Lock size={17} />
              <input
                id="claim-confirm-pass"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="icon-btn"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={claiming}
            className="primary-btn"
            style={{ marginTop: 12 }}
          >
            <span>{claiming ? 'Activating account...' : 'Activate my account'}</span>
            {claiming ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
        </form>

        {/* Legal Footer */}
        <p className="foot-note" style={{ fontSize: 12.5, marginTop: 20 }}>
          By activating your account, you agree to our{' '}
          <a
            href={`${WEB_URL}/legal/terms`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Use
          </a>{' '}
          and{' '}
          <a
            href={`${WEB_URL}/legal/privacy`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  )
}

