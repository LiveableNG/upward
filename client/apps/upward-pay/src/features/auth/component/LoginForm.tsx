'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLogin } from '../hooks/useLogin'
import { BiometricLoginButton } from './BiometricLoginButton'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const prefillEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')

  const { login, loading, error } = useLogin(redirect)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login(email, password)
  }

  function handleBiometricAuth(email: string, pass: string) {
    setEmail(email)
    setPassword(pass)
    login(email, pass)
  }

  return (
    <div className="auth-page__content">
      <div className="auth-page__hero">
        <h1 className="auth-page__title">Sign In</h1>
        <p className="auth-page__subtitle">
          Securely access your Upward Pay account. Manage rent payments and track your credit
          credibility.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}

        <div className="auth-form__field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="sarah@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <BiometricLoginButton onAuthenticated={handleBiometricAuth} />
      </form>

      <div className="auth-page__alt">
        Don&apos;t have an account?{' '}
        <button onClick={() => router.push('/signup')} className="text-secondary font-semibold">
          Sign up
        </button>
      </div>
    </div>
  )
}
