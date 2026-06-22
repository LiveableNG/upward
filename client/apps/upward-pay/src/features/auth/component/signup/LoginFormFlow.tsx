'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { useToast } from '@/components/common/Toast'
import { requestOTP, loginWithOTP, checkEmail, verifyOTP } from '@/features/auth/services/authService'
import { OTPInput } from '@/components/common/OTPInput'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'

interface LoginFormFlowProps {
  onBackToWelcome: () => void
  onRedirectToSignup?: (email: string) => void
  initialEmail?: string
}

export function LoginFormFlow({ onBackToWelcome, onRedirectToSignup, initialEmail = '' }: LoginFormFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const { 
    login: doLogin, 
    otpLogin, 
    loading: loginLoading, 
    error: loginError 
  } = useLogin(redirect)

  const [loginEmail, setLoginEmail] = useState(initialEmail)

  useEffect(() => {
    if (initialEmail) {
      setLoginEmail(initialEmail)
    }
  }, [initialEmail])
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'otp' | 'profile'>('login')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [effectiveContext, setEffectiveContext] = useState<'LOGIN' | 'WAITLIST' | 'INVITE'>('LOGIN')
  const [otpError, setOtpError] = useState<string | null>(null)

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
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
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    
    if (loginEmail && loginEmail.includes('@') && loginEmail.length > 5) {
      setIsCheckingEmail(true)
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
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
    } else {
      setIsCheckingEmail(false)
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

  const handleRequestOTP = async (customContext?: 'WAITLIST' | 'INVITE') => {
    if (!loginEmail) {
      toastError('Please enter your email address first.')
      return
    }

    setIsRequestingOTP(true)
    const context = customContext || 'LOGIN'
    setEffectiveContext(context)
    
    try {
      await requestOTP(loginEmail, context)
      setStep('otp')
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleVerifyOTP = async (otp: string) => {
    setOtpError(null)
    if (effectiveContext === 'LOGIN') {
      otpLogin(loginEmail, otp)
    } else {
      try {
        const verification = await verifyOTP(loginEmail, otp, effectiveContext)
        if (!verification.success) {
          setOtpError(verification.message || 'Invalid verification code')
          return
        }

        if (effectiveContext === 'WAITLIST' && verification.inviteToken) {
          const path = `/waitlist/${verification.inviteToken}`
          if (Capacitor.isNativePlatform()) {
            router.push(`/signup?mode=waitlist&uuid=${verification.inviteToken}`)
          } else {
            router.push(path)
          }
        } else if (effectiveContext === 'INVITE' && verification.inviteToken) {
          const path = `/invite/${verification.inviteToken}`
          if (Capacitor.isNativePlatform()) {
            router.push(`/signup?mode=invite&token=${verification.inviteToken}`)
          } else {
            router.push(path)
          }
        }
      } catch (err: any) {
        setOtpError(err.message || 'Verification failed')
      }
    }
  }

  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--login">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={() => setStep('login')} disabled={loginLoading}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </a>
        <div className="auth-stage">
          <OTPInput
            email={loginEmail}
            onVerify={handleVerifyOTP}
            onResend={() => handleRequestOTP()}
            onChangeEmail={() => setStep('login')}
            isLoading={loginLoading}
            error={otpError || loginError?.message}
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

      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
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
              <div className="auth-field-hint auth-field-hint--error">
                <AlertCircle size={12} /> Account not found.{' '}
                <button
                  type="button"
                  className="auth-field-hint__link"
                  onClick={() => {
                    if (onRedirectToSignup) {
                      onRedirectToSignup(loginEmail)
                    } else {
                      router.push(`/signup?mode=signup&email=${encodeURIComponent(loginEmail)}`)
                    }
                  }}
                >
                  Sign up instead?
                </button>
              </div>
            )}

            {emailExists && isInvited && (
              <div className="auth-field-hint auth-field-hint--accent">
                <AlertCircle size={12} /> Your manager already invited you —{' '}
                <button type="button" className="auth-field-hint__link" onClick={() => handleRequestOTP('INVITE')}>
                  Verify to set your password
                </button>
              </div>
            )}

            {emailExists && isWaitlist && (
              <div className="auth-field-hint auth-field-hint--accent">
                <Sparkles size={12} /> You have priority access!{' '}
                <button type="button" className="auth-field-hint__link" onClick={() => handleRequestOTP('WAITLIST')}>
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
            className="btn btn--primary btn--full btn--pay auth-form__mt-6"
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
            {loginLoading ? 'Logging in…' : 'Log In'} <ArrowRight size={17} />
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--full auth-btn-otp"
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
              className="btn btn--outline btn--full auth-btn-biometric"
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
                  <Fingerprint size={18} /> Log in with Biometrics
                </>
              )}
            </button>
          )}
          
          <button
            type="button"
            className="auth-form__link"
            onClick={() => router.push('/forgot-password')}
            disabled={isCheckingEmail || !loginEmail || !emailExists || isInvited || isWaitlist}
          >
            Forgot your password?
          </button>
        </form>

      </div>
    </div>
  )
}
