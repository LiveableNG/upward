
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
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { request } from '@/lib/api-client'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { AuthLayout } from '@/components/auth/AuthLayout'

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'

export default function ClaimAccountPage() {
  const { uuid } = useParams()
  const router = useRouter()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await request<any>(`/pm/auth/invite-details/${uuid}`)
        setUserData(res)
        setFirstName(res.firstName || '')
        setLastName(res.lastName || '')
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
      await request(`/pm/auth/claim-account/${uuid}`, {
        method: 'POST',
        body: JSON.stringify({ password, firstName, lastName }),
      })
      success('Account claimed successfully! Welcome to Upward.')
      router.push('/login')
    } catch (err: any) {
      error(err.message || 'Failed to claim account')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse flex flex-col items-center">
          <UpwardLogo color="var(--forest)" size={48} />
          <div className="h-4 w-32 bg-[var(--border-strong)] rounded mt-4" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center' }}>
          <UpwardLogo color="var(--forest)" size={48} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 16, marginBottom: 8, color: 'var(--dark)' }}>
            Invitation Expired or Invalid
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            This invitation link is invalid or has already been claimed. Please contact the administrator who invited you.
          </p>
          <button 
            type="button" 
            className="btn btn--primary" 
            style={{ width: '100%', height: 48, borderRadius: 12 }} 
            onClick={() => router.push('/login')}
          >
            Go to Login
          </button>
        </div>
      </AuthLayout>
    )
  }

  const inviter = userData.invitedBy

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        {/* Header with Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
          <UpwardLogo color="var(--forest)" size={48} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 16, marginBottom: 8, color: 'var(--dark)' }}>
            Activate Your Account
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, lineHeight: 1.5 }}>
            You&apos;ve been invited to join the property management team on Upward. Complete your details below to activate access.
          </p>
        </div>

        {/* Invitation Summary Banner */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {inviter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(26, 77, 46, 0.08)',
                  color: 'var(--forest)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserCheck size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Invited By
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inviter.name}
                  {inviter.companyName && <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> ({inviter.companyName})</span>}
                </div>
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'var(--forest-faint)',
                  color: 'var(--forest)',
                  whiteSpace: 'nowrap',
                }}
              >
                {inviter.accessLevel === 'ALL' ? 'Admin Access' : 'Manager Access'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(26, 77, 46, 0.08)',
                color: 'var(--forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Mail size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Registered Email
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', wordBreak: 'break-all' }}>
                {userData.email}
              </div>
            </div>
          </div>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleClaim} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6, display: 'block' }}>
                First Name
              </label>
              <input
                type="text"
                required
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0 14px',
                  fontSize: 14,
                  background: '#FFFFFF',
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6, display: 'block' }}>
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0 14px',
                  fontSize: 14,
                  background: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6, display: 'block' }}>
              Create Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0 40px 0 42px',
                  fontSize: 14,
                  background: '#FFFFFF',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 14,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6, display: 'block' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0 40px 0 42px',
                  fontSize: 14,
                  background: '#FFFFFF',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 14,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 2,
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={claiming}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: 'var(--forest)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: claiming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
              transition: 'all 0.2s',
            }}
          >
            {claiming ? (
              'Activating Account...'
            ) : (
              <>
                Activate My Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Legal Footer */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 24,
            lineHeight: 1.5,
          }}
        >
          By activating your account, you agree to our{' '}
          <a
            href={`${WEB_URL}/legal/terms`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'none' }}
          >
            Terms of Use
          </a>{' '}
          and{' '}
          <a
            href={`${WEB_URL}/legal/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'none' }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  )
}

