'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLogin } from '../hooks/useLogin'
import { BiometricsService } from '../services/biometricsService'
import { BiometricLoginButton } from './BiometricLoginButton'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const prefillEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')

  const { login, loading, error } = useLogin(redirect)
  const [autoPrompted, setAutoPrompted] = useState(false)
  
  useEffect(() => {
    async function triggerAutoBiometrics() {
      if (autoPrompted) return
      
      const available = await BiometricsService.isAvailable()
      const enabled = await BiometricsService.isEnabled()
      
      if (available && enabled && !loading) {
        setAutoPrompted(true)
        setTimeout(async () => {
          try {
            const authenticated = await BiometricsService.authenticate('Log in to Upward Pay')
            if (authenticated) {
              const credentials = await BiometricsService.getCredentials()
              if (credentials) {
                handleBiometricAuth(credentials.email, credentials.password)
              }
            }
          } catch (e) {
            console.error('Auto-biometric login failed:', e)
          }
        }, 500)
      }
    }
    
    triggerAutoBiometrics()
  }, [loading, autoPrompted])

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
