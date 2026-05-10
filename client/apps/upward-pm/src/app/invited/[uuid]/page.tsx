
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { KeyRound, CheckCircle2, ArrowRight, ShieldCheck, Mail } from 'lucide-react'
import { request } from '@/lib/api-client'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'

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
        // router.push('/login')
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
            <div className="w-12 h-12 bg-[var(--border)] rounded-full mb-4" />
            <div className="h-4 w-32 bg-[var(--border)] rounded" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[32px] border border-[var(--border)] text-center shadow-xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
            <p className="text-[var(--text-muted)] mb-8">This invitation link has expired or is invalid. Please contact the person who invited you.</p>
            <button className="btn btn--primary w-full h-14 rounded-2xl" onClick={() => router.push('/login')}>Go to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[var(--border)] mb-6 shadow-sm">
            <CheckCircle2 size={16} className="text-[var(--forest)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Verified Invitation</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--dark)] mb-4">Welcome to the Team!</h1>
          <p className="text-lg text-[var(--text-secondary)]">Hello <strong>{userData.firstName}</strong>, let's get your account ready.</p>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-[var(--border)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg)] rounded-bl-[100%] opacity-50" />
          
          <form onSubmit={handleClaim} className="space-y-6">
            <div className="form-group">
                <label className="text-sm font-bold text-[var(--dark)] mb-2 block">Set Your Password</label>
                <div className="relative">
                    <KeyRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input 
                        type="password" 
                        required
                        placeholder="Create a strong password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full h-14 bg-[var(--bg)] border-none rounded-2xl pl-12 focus:ring-2 focus:ring-[var(--clay)] transition-all"
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="text-sm font-bold text-[var(--dark)] mb-2 block">Confirm Password</label>
                <div className="relative">
                    <KeyRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input 
                        type="password" 
                        required
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full h-14 bg-[var(--bg)] border-none rounded-2xl pl-12 focus:ring-2 focus:ring-[var(--clay)] transition-all"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={claiming}
                className="w-full h-14 bg-[var(--clay)] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
                {claiming ? 'Activating Account...' : 'Activate My Account'}
                {!claiming && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[var(--border)] flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)]">
                <Mail size={18} />
            </div>
            <div className="text-sm">
                <div className="text-[var(--text-muted)]">Registered Email</div>
                <div className="font-bold">{userData.email}</div>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--text-muted)]">
            By activating your account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
