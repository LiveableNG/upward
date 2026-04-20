'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Mail,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { useToast } from '@/components/common/Toast'

interface LoginFormFlowProps {
  onBackToWelcome: () => void
}

export function LoginFormFlow({ onBackToWelcome }: LoginFormFlowProps) {
  const router = useRouter()
  const { login: doLogin, loading: loginLoading, error: loginError } = useLogin('/dashboard')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  const { error: toastError } = useToast()

  useEffect(() => {
    async function checkBiometrics() {
      const available = await BiometricsService.isAvailable()
      if (available) {
        const enabled = await BiometricsService.isEnabled()
        setBiometricAvailable(enabled)
      }
    }
    checkBiometrics()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doLogin(loginEmail, loginPassword)
  }

  const handleBiometricLogin = async () => {
    setBiometricLoading(true)
    try {
      const authenticated = await BiometricsService.authenticate('Log in with your biometrics')
      if (authenticated) {
        const creds = await BiometricsService.getCredentials()
        if (creds) {
          doLogin(creds.email, creds.password)
        } else {
          toastError('No stored credentials found. Please log in manually once.')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
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
            disabled={loginLoading || biometricLoading || !loginEmail || !loginPassword}
          >
            {loginLoading ? 'Signing in…' : 'Sign In'} <ArrowRight size={17} />
          </button>

          {biometricAvailable && (
            <button
              type="button"
              className="btn btn--outline btn--full mt-3 biometric-btn"
              onClick={handleBiometricLogin}
              disabled={loginLoading || biometricLoading}
            >
              {biometricLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Fingerprint size={18} /> Sign in with Biometrics
                </>
              )}
            </button>
          )}
          
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
        .mt-3 {
          margin-top: 16px;
        }
        .biometric-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-color: var(--clay);
          color: var(--clay);
        }
        .biometric-btn:hover {
          background: rgba(var(--clay-rgb), 0.05);
        }
      `}</style>
    </div>
  )
}
