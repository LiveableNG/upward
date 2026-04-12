'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Mail,
  ArrowRight,
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
        <button className="auth-shell__back" onClick={onBackToWelcome}>
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Welcome back</h1>
          <p className="auth-stage__subtitle">Enter your credentials to access your account.</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {loginError && (
            <div className={`auth-form__error ${loginError.code === 'INVITE_PENDING' ? 'is-warning' : ''}`}>
              {loginError.code === 'INVITE_PENDING' ? (
                <div className="invite-pending-notice">
                  <p>{loginError.message}</p>
                  <button 
                    type="button" 
                    className="btn btn--clay btn--small mt-2" 
                    onClick={() => router.push(`/invite/${loginError.data.userId}`)}
                  >
                    Complete Profile
                  </button>
                </div>
              ) : (
                loginError.message
              )}
            </div>
          )}
          
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
                required
              />
            </div>
          </div>

          <div className="auth-form__field mt-1">
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
                required
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
            className="btn btn--primary btn--full btn--pay mt-6"
            type="submit"
            disabled={loginLoading || !loginEmail || !loginPassword}
          >
            {loginLoading ? 'Signing in…' : 'Sign In'} <ArrowRight size={17} />
          </button>
          
          <button 
            type="button" 
            className="auth-form__link mt-4"
            onClick={() => router.push('/forgot-password')}
          >
            Forgot your password?
          </button>
        </form>
      </div>

      <style jsx>{`
        .mt-1 {
          margin-top: 12px;
        }
      `}</style>
    </div>
  )
}
