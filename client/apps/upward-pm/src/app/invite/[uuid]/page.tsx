
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, CheckCircle2, ArrowRight, ShieldCheck, Mail } from 'lucide-react'
import { request } from '@/lib/api-client'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'

import { AuthLayout } from '@/components/auth/AuthLayout'

export default function ClaimAccountPage() {
  const { uuid } = useParams()
  const router = useRouter()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await request<any>(`/pm/auth/invite-details/${uuid}`)
        setUserData(res)
      } catch (err) {
        error("Invalid or expired invitation link.")
      } finally {
        setLoading(false)
      }
    }
    if (uuid) fetchUser()
  }, [uuid])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return error("Passwords do not match")
    if (password.length < 6) return error("Password must be at least 6 characters")

    setClaiming(true)
    try {
      await request(`/pm/auth/claim-account/${uuid}`, {
        method: 'POST',
        body: JSON.stringify({ password })
      })
      success("Account claimed successfully! Welcome to Upward.")
      router.push('/login')
    } catch (err: any) {
      error(err.message || "Failed to claim account")
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-[var(--border-strong)] rounded-full mb-4" />
            <div className="h-4 w-32 bg-[var(--border-strong)] rounded" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <AuthLayout 
        title="Invalid Link"
        subtitle="This invitation link has expired or is invalid. Please contact the person who invited you."
      >
        <button className="auth-btn auth-btn--primary" onClick={() => router.push('/login')}>
          Go to Login
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout 
      title="Welcome to the Team!"
      subtitle={`Hello ${userData.firstName || 'there'}, let's get your account ready by setting a password.`}
      visualTitle={<>Join the <br /><span className="text-gradient">future</span> of management.</>}
      visualDesc="You've been invited to join a high-performance team on Upward. Set up your access to start managing properties efficiently."
    >
      <form onSubmit={handleClaim} className="space-y-6">
        <div className="form-group">
            <label className="form-label">Create Password</label>
            <div className="input-wrapper">
                <KeyRound size={20} className="input-icon" />
                <input 
                    type="password" 
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input form-input--with-icon"
                />
            </div>
        </div>

        <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
                <KeyRound size={20} className="input-icon" />
                <input 
                    type="password" 
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="form-input form-input--with-icon"
                />
            </div>
        </div>

        <button 
            type="submit" 
            disabled={claiming}
            className="auth-btn auth-btn--primary"
        >
            {claiming ? 'Activating Account...' : 'Activate My Account'}
            {!claiming && <ArrowRight size={20} />}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-[var(--border)] flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[var(--ivory-dim)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)]">
            <Mail size={18} />
        </div>
        <div className="text-sm">
            <div className="text-[var(--text-muted)]">Registered Email</div>
            <div className="font-bold text-[var(--dark)]">{userData.email}</div>
        </div>
      </div>

      <p className="auth-footer text-xs">
          By activating your account, you agree to our <Link href="#">Terms of Service</Link> and <Link href="#">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  )
}
