'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { setToken, setTenant, isLoggedIn } from '@/lib/auth'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const prefillName = searchParams.get('name') || ''
  const from = searchParams.get('from') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [fullName, setFullName] = useState(prefillName)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoggedIn()) router.push('/dashboard')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !fullName) return

    setLoading(true)
    setError('')

    try {
      const result = await api.signup({ email, password, fullName, phone: phone || undefined })
      setToken(result.accessToken)
      setTenant(result.tenant)
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
          <h1 className="auth-page__title">Create your account</h1>
          <p className="auth-page__subtitle">
            {from === 'payment'
              ? 'Save your receipt and track all future payments'
              : from === 'invite'
                ? 'Accept your invitation and start managing payments'
                : 'Join thousands of tenants using Upward'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-form__error">{error}</div>}

          <div className="auth-form__field">
            <label htmlFor="fullName">Full Name *</label>
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
            <label htmlFor="email">Email</label>
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
            <label htmlFor="phone">
              Phone <span className="auth-form__optional">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+234 801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-page__alt">
          Already have an account? <button onClick={() => router.push('/login')}>Log in</button>
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
