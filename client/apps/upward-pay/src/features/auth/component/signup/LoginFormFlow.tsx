'use client'

import { useState, useEffect, useRef } from 'react'
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
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { useToast } from '@/components/common/Toast'
import { requestOTP, loginWithOTP, checkEmail } from '@/features/auth/services/authService'
import { OTPInput } from '@/components/common/OTPInput'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'

interface LoginFormFlowProps {
  onBackToWelcome: () => void
}

export function LoginFormFlow({ onBackToWelcome }: LoginFormFlowProps) {
  const router = useRouter()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const redirect = searchParams?.get('redirect') || '/dashboard'
  const { 
    login: doLogin, 
    otpLogin, 
    loading: loginLoading, 
    error: loginError 
  } = useLogin(redirect)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'otp' | 'profile'>('login')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [showInvitedModal, setShowInvitedModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

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

  // Debounced email existence check
  useEffect(() => {
    setEmailExists(true) // Default to true while checking or if empty
    setIsInvited(false)
    setIsWaitlist(false)
    
    if (loginEmail && loginEmail.includes('@') && loginEmail.length > 5) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(loginEmail)
          setEmailExists(res.exists)
          setIsInvited(res.isInvited ?? false)
          setIsWaitlist(res.isWaitlist ?? false)
        } catch (err) {
          console.error('Email check failed', err)
        } finally {
          setIsCheckingEmail(false)
        }
      }, 800)
    }
    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    }
  }, [loginEmail])

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

  const handleRequestOTP = async () => {
    if (!loginEmail) {
      toastError('Please enter your email address first.')
      return
    }

    setIsRequestingOTP(true)
    try {
      // For login we use 'LOGIN' context
      await requestOTP(loginEmail, 'LOGIN')
      setStep('otp')
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleVerifyOTP = async (otp: string) => {
    otpLogin(loginEmail, otp)
  }

  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--login">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={() => setStep('login')} disabled={loginLoading}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <a href="https://upward.goodtenants.io" className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </a>
        <div className="auth-stage">
          <OTPInput
            email={loginEmail}
            onVerify={handleVerifyOTP}
            onResend={() => handleRequestOTP()}
            onChangeEmail={() => setStep('login')}
            isLoading={loginLoading}
            error={loginError?.message}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell auth-shell--login">
      <div className="auth-shell__top">
        <button className="auth-shell__back" onClick={onBackToWelcome}>
          <ChevronLeft size={20} />
        </button>
      </div>

      <a href="https://upward.goodtenants.io" className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </a>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Welcome back</h1>
          <p className="auth-stage__subtitle">Enter your credentials to access your account.</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {loginError && (
            <div className="auth-form__error">
              Invalid credentials
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
              {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
            </div>

            {!isCheckingEmail && loginEmail && loginEmail.includes('@') && !emailExists && (
              <div className="field-hint field-hint--error">
                <AlertCircle size={12} /> Account not found.{' '}
                <button type="button" className="field-hint__link" onClick={() => (window.location.href = `/signup?email=${encodeURIComponent(loginEmail)}`)}>
                  Sign up instead?
                </button>
              </div>
            )}

            {emailExists && isInvited && (
              <div className="field-hint field-hint--invited">
                <AlertCircle size={12} /> Your manager already invited you —{' '}
                <button type="button" className="field-hint__link" onClick={() => setShowInvitedModal(true)}>
                  Verify to set your password
                </button>
              </div>
            )}

            {emailExists && isWaitlist && (
              <div className="field-hint field-hint--waitlist">
                <Sparkles size={12} /> You have priority access!{' '}
                <button type="button" className="field-hint__link" onClick={() => setShowWaitlistModal(true)}>
                  Claim your account
                </button>
              </div>
            )}
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
            disabled={
              loginLoading || 
              biometricLoading || 
              isRequestingOTP || 
              isCheckingEmail ||
              !loginEmail || 
              !loginPassword || 
              !emailExists || 
              isInvited || 
              isWaitlist
            }
          >
            {loginLoading ? 'Signing in…' : 'Sign In'} <ArrowRight size={17} />
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--full verif-code-btn"
            onClick={() => handleRequestOTP()}
            disabled={
              loginLoading || 
              isRequestingOTP || 
              isCheckingEmail ||
              !loginEmail || 
              !emailExists || 
              isInvited || 
              isWaitlist
            }
          >
            {isRequestingOTP ? <Loader2 size={18} className="animate-spin" /> : 'Log in with verification code'}
          </button>

          {biometricAvailable && (
            <button
              type="button"
              className="btn btn--outline btn--full mt-3 biometric-btn"
              onClick={handleBiometricLogin}
              disabled={
                loginLoading || 
                biometricLoading || 
                isCheckingEmail ||
                !emailExists || 
                isInvited || 
                isWaitlist
              }
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
            disabled={isCheckingEmail || !loginEmail || !emailExists || isInvited || isWaitlist}
          >
            Forgot your password?
          </button>
        </form>

        {showInvitedModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-pop">
              <div className="modal-icon">
                <Mail size={40} color="var(--clay)" />
              </div>
              <h3>Verify Your Email</h3>
              <p>
                Your manager has already invited you to Upward. Please verify that <strong>{loginEmail}</strong> belongs to you to continue.
              </p>
              <div className="modal-actions">
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => (window.location.href = `/signup?email=${encodeURIComponent(loginEmail)}`)}
                >
                  Yes, verify my email
                </button>
                <button className="btn btn--ghost btn--full mt-4" onClick={() => setShowInvitedModal(false)}>
                  No, use a different email
                </button>
              </div>
            </div>
          </div>
        )}

        {showWaitlistModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-pop">
              <div className="modal-icon">
                <ShieldCheck size={40} color="var(--clay)" />
              </div>
              <h3>Priority Access</h3>
              <p>
                You've been granted priority access to Upward. Please verify <strong>{loginEmail}</strong> to activate your account.
              </p>
              <div className="modal-actions">
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => (window.location.href = `/signup?email=${encodeURIComponent(loginEmail)}`)}
                >
                  Claim my account
                </button>
                <button className="btn btn--ghost btn--full mt-4" onClick={() => setShowWaitlistModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .mt-1 {
          margin-top: 12px;
        }
        .mt-3 {
          margin-top: 16px;
        }
        .mt-6 {
          margin-top: 32px;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .auth-divider span {
          margin: 0 12px;
        }
        .verif-code-btn {
          color: var(--clay);
          font-weight: 600;
          font-size: 13px;
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
        .input-spinner {
          position: absolute;
          right: 32px;
          color: var(--text-muted);
        }
        .field-hint {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .field-hint--error { color: var(--error); }
        .field-hint--invited, .field-hint--waitlist {
          color: var(--clay);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .field-hint__link {
          background: none;
          border: none;
          padding: 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--clay);
          cursor: pointer;
          text-decoration: underline;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-content {
          background: var(--bg);
          padding: 32px;
          border-radius: 20px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: var(--shadow-lg);
        }
        .modal-icon { margin-bottom: 20px; display: flex; justify-content: center; }
        .modal-content h3 { font-weight: 800; font-size: 20px; margin-bottom: 12px; }
        .modal-content p { color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5; }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes pop {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
