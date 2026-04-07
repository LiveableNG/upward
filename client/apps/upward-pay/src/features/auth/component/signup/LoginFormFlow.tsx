'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Mail,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useLogin } from '@/features/auth/hooks/useLogin'

interface LoginFormFlowProps {
  onBackToWelcome: () => void
}

export function LoginFormFlow({ onBackToWelcome }: LoginFormFlowProps) {
  const router = useRouter()
  const { login: doLogin, loading: loginLoading, error: loginError } = useLogin('/dashboard')

  const [lStep, setLStep] = useState<1 | 2>(1)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doLogin(loginEmail, loginPassword)
  }

  return (
    <div className="auth-shell auth-shell--login">
      <div className="auth-shell__top">
        <button
          className="auth-shell__back"
          onClick={() => {
            if (lStep === 1) {
              onBackToWelcome()
            } else {
              setLStep(1)
            }
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="step-progress">
          <div className={`step-progress__pip ${lStep >= 1 ? 'is-active' : ''}`} />
          <div className={`step-progress__pip ${lStep >= 2 ? 'is-active' : ''}`} />
        </div>
      </div>

      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      {lStep === 1 && (
        <div className="auth-stage" key="login-1">
          <div className="auth-stage__header">
            <h1 className="auth-stage__title">Welcome back</h1>
            <p className="auth-stage__subtitle">Enter the email tied to your Upward account.</p>
          </div>
          <div className="auth-form">
            <div className="auth-form__field">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  id="login-email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <button
              id="login-next"
              className="btn btn--primary btn--full btn--pay"
              disabled={!loginEmail}
              onClick={() => setLStep(2)}
            >
              Continue <ArrowRight size={17} />
            </button>
            
            <button 
              type="button" 
              className="auth-form__link"
              onClick={() => router.push('/forgot-password')}
            >
              Forgot your password?
            </button>
          </div>
        </div>
      )}

      {lStep === 2 && (
        <div className="auth-stage" key="login-2">
          <div className="auth-stage__header">
            <button className="auth-stage__back-sm" onClick={() => setLStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="auth-stage__title">Enter your password</h2>
            <p className="auth-stage__subtitle">{loginEmail}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {loginError && <div className="auth-form__error">{loginError}</div>}
            <div className="auth-form__field">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
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
            <button
              id="login-submit"
              className="btn btn--primary btn--full btn--pay"
              type="submit"
              disabled={loginLoading || !loginPassword}
            >
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
            
            <button 
              type="button" 
              className="auth-form__link"
              onClick={() => router.push('/forgot-password')}
            >
              Forgot your password?
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
