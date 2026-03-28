'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { setToken, setTenant } from '@/lib/auth'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const prefillName = searchParams.get('name') || ''
  const from = searchParams.get('from') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [fullName, setFullName] = useState(prefillName)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !fullName) return

    setLoading(true)
    setError('')

    try {
      const result = await api.signup({ email, password, fullName })
      setToken(result.accessToken)
      setTenant(result.tenant)
      
      // If they came from a payment link, they might want to go back there
      // But usually we just go to dashboard after signup
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <PoweredByUpward />
      </header>

      <div className="auth-page__content">
        <div className="auth-page__hero">
          <h1 className="auth-page__title">Create Account</h1>
          <p className="auth-page__subtitle">
            {from === 'payment' 
              ? 'Sign up to complete your payment and save your receipt.'
              : 'Join Upward to manage your rent and build credibility.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-form__error">{error}</div>}

          <div className="auth-form__field">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              placeholder="Sarah Johnson"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="sarah@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-page__alt">
          Already have an account?{' '}
          <button onClick={() => router.push('/login')}>Sign in</button>
        </div>
      </div>

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <UpwardLogo size={28} color="#fff" />
            </div>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
