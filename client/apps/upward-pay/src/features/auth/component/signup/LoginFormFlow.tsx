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
  Phone,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { useToast } from '@/components/common/Toast'
import { requestOTP, loginWithOTP, checkEmail, verifyOTP } from '@/features/auth/services/authService'
import { OTPInput } from '@/components/common/OTPInput'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

type LoginMethod = 'password' | 'code' | null

interface LoginFormFlowProps {
  onBackToWelcome: () => void
  onRedirectToSignup?: (email: string) => void
  initialEmail?: string
}

function getLoginErrorMessage(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) {
    if (error.message && error.message !== '[object Object]') return error.message
    const data = (error as { data?: { message?: string | { message?: string } } }).data
    const nested = data?.message
    if (typeof nested === 'string') return nested
    if (nested && typeof nested === 'object' && nested.message) return nested.message
  }
  return 'Invalid credentials'
}

export function LoginFormFlow({ onBackToWelcome, onRedirectToSignup, initialEmail = '' }: LoginFormFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const {
    login: doLogin,
    otpLogin,
    loading: loginLoading,
    error: loginError,
  } = useLogin(redirect)

  const [loginEmail, setLoginEmail] = useState(initialEmail)
  const [loginPhone, setLoginPhone] = useState('')
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email')
  const [phoneChannel, setPhoneChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [effectiveContext, setEffectiveContext] = useState<'LOGIN' | 'WAITLIST' | 'INVITE'>('LOGIN')
  const [otpError, setOtpError] = useState<string | null>(null)

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [authProvider, setAuthProvider] = useState('email')
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const { error: toastError } = useToast()

  const isGoogleOnly = authProvider === 'google' && emailExists
  const isSpecialAccount = isInvited || isWaitlist
  const isBusy = loginLoading || biometricLoading || isRequestingOTP || isCheckingEmail

  useEffect(() => {
    if (initialEmail) {
      setLoginEmail(initialEmail)
    }
  }, [initialEmail])

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

  useEffect(() => {
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    setAuthProvider('email')

    if (identifierType === 'email' && loginEmail && loginEmail.includes('@') && loginEmail.length > 5) {
      setIsCheckingEmail(true)
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        try {
          const res = await checkEmail(loginEmail, 'email')
          setEmailExists(res.exists)
          setIsInvited(res.isInvited ?? false)
          setIsWaitlist(res.isWaitlist ?? false)
          setAuthProvider(res.authProvider ?? 'email')
        } catch (err) {
          console.error('Email check failed', err)
        } finally {
          setIsCheckingEmail(false)
        }
      }, 800)
    } else if (identifierType === 'phone' && loginPhone && loginPhone.length >= 10) {
      setIsCheckingEmail(true)
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        try {
          // ensure +234 or country code
          const fullPhone = loginPhone.startsWith('+') ? loginPhone : `+234${loginPhone.replace(/^0/, '')}`
          const res = await checkEmail(fullPhone, 'phone')
          setEmailExists(res.exists)
          setIsInvited(res.isInvited ?? false)
          setIsWaitlist(res.isWaitlist ?? false)
          setAuthProvider(res.authProvider ?? 'email')
        } catch (err) {
          console.error('Phone check failed', err)
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
  }, [loginEmail, loginPhone, identifierType])

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Biometric authentication failed'
      toastError(message)
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleRequestOTP = async (customContext?: 'WAITLIST' | 'INVITE') => {
    if (identifierType === 'email' && !loginEmail) {
      toastError('Please enter your email address first.')
      return
    }
    if (identifierType === 'phone' && !loginPhone) {
      toastError('Please enter your phone number first.')
      return
    }

    setIsRequestingOTP(true)
    const context = customContext || 'LOGIN'
    setEffectiveContext(context)

    const identifier = identifierType === 'phone' ? (loginPhone.startsWith('+') ? loginPhone : `+234${loginPhone.replace(/^0/, '')}`) : loginEmail

    try {
      await requestOTP(identifier, context, identifierType, phoneChannel)
      setStep('otp')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send verification code'
      toastError(message)
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()

    const identifier = identifierType === 'phone' ? (loginPhone.startsWith('+') ? loginPhone : `+234${loginPhone.replace(/^0/, '')}`) : loginEmail

    if (loginMethod === 'password') {
      doLogin(identifier, loginPassword, identifierType)
      return
    }

    if (loginMethod !== 'code') return

    await handleRequestOTP()
  }

  const handleVerifyOTP = async (otp: string) => {
    setOtpError(null)
    const identifier = identifierType === 'phone' ? (loginPhone.startsWith('+') ? loginPhone : `+234${loginPhone.replace(/^0/, '')}`) : loginEmail
    
    if (effectiveContext === 'LOGIN') {
      try {
        await loginWithOTP(identifier, otp, identifierType)
        router.push(redirect)
      } catch (err: unknown) {
        setOtpError(getLoginErrorMessage(err))
      }
    } else {
      try {
        const verification = await verifyOTP(identifier, otp, effectiveContext, identifierType)
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Verification failed'
        setOtpError(message)
      }
    }
  }

  const goToSignup = () => {
    const identifier = identifierType === 'phone' ? loginPhone : loginEmail
    if (onRedirectToSignup) {
      onRedirectToSignup(identifier)
    } else {
      router.push(`/signup?mode=signup&email=${encodeURIComponent(identifier)}`)
    }
  }

  const canContinuePassword =
    ((identifierType === 'email' && !!loginEmail) || (identifierType === 'phone' && !!loginPhone)) &&
    !!loginPassword &&
    emailExists &&
    !isSpecialAccount &&
    !isGoogleOnly

  const canContinueCode =
    ((identifierType === 'email' && !!loginEmail) || (identifierType === 'phone' && !!loginPhone)) &&
    emailExists &&
    !isSpecialAccount

  const canContinue = loginMethod === 'password' ? canContinuePassword : loginMethod === 'code' ? canContinueCode : false

  const loginErrorMessage = getLoginErrorMessage(loginError)

  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--login">
        <div className="auth-shell__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="auth-shell__back" onClick={() => setStep('login')} disabled={loginLoading}>
            <ChevronLeft size={20} />
          </button>
          <a 
            href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Back to Website
          </a>
        </div>
        <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </a>
        <div className="auth-stage">
          <OTPInput
            email={identifierType === 'phone' ? loginPhone : loginEmail}
            onVerify={handleVerifyOTP}
            onResend={() => handleRequestOTP(effectiveContext === 'LOGIN' ? undefined : effectiveContext)}
            onChangeEmail={() => setStep('login')}
            isLoading={loginLoading || isRequestingOTP}
            error={otpError || loginErrorMessage}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell auth-shell--login">
      <div className="auth-shell__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="auth-shell__back" onClick={onBackToWelcome}>
          <ChevronLeft size={20} />
        </button>
        <a 
          href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Back to Website
        </a>
      </div>

      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </a>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Welcome back</h1>
          <p className="auth-stage__subtitle">Sign in with Google, password, or a verification code.</p>
        </div>

        <GoogleSignInButton />

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-form" onSubmit={handleContinue}>
          {loginError && loginMethod === 'password' && (
            <div className="auth-form__error">{loginErrorMessage}</div>
          )}

          <div className="auth-form__field">
            <div className="auth-form__label-row">
              <label htmlFor="login-identifier">{identifierType === 'email' ? 'Email Address' : 'Phone Number'}</label>
              <button
                type="button"
                className="auth-form__link auth-form__link--quiet"
                onClick={() => {
                  setIdentifierType(identifierType === 'email' ? 'phone' : 'email')
                  setEmailExists(false)
                }}
              >
                Continue with {identifierType === 'email' ? 'Phone Number' : 'Email'}
              </button>
            </div>
            
            {identifierType === 'email' ? (
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  id="login-email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  required={identifierType === 'email'}
                />
                {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid #e2e2e2', borderRadius: '14px', padding: '0 16px', background: '#fff', transition: 'border-color 0.2s', height: '46px' }}>
                  <span className="country-code" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '13.5px', color: '#7a7268', borderRight: '1px solid #eee', paddingRight: '8px', marginRight: '8px' }}>+234</span>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    placeholder="800 000 0000" 
                    style={{ border: 'none', outline: 'none', height: '100%', width: '100%', fontFamily: 'Plus Jakarta Sans', fontSize: '13.5px', background: 'transparent' }}
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required={identifierType === 'phone'}
                  />
                  {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} style={{ position: 'absolute', right: '16px' }} />}
                </div>
                {loginMethod === 'code' && (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingLeft: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                      <input type="radio" name="phoneChannelLogin" checked={phoneChannel === 'SMS'} onChange={() => setPhoneChannel('SMS')} style={{ accentColor: 'var(--clay)' }} /> SMS
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                      <input type="radio" name="phoneChannelLogin" checked={phoneChannel === 'WHATSAPP'} onChange={() => setPhoneChannel('WHATSAPP')} style={{ accentColor: 'var(--clay)' }} /> WhatsApp
                    </label>
                  </div>
                )}
              </div>
            )}

            {!isCheckingEmail && identifierType === 'email' && loginEmail && loginEmail.includes('@') && !emailExists && (
              <div className="auth-field-hint auth-field-hint--error">
                <AlertCircle size={12} /> Account not found.{' '}
                <button type="button" className="auth-field-hint__link" onClick={goToSignup}>
                  Sign up instead?
                </button>
              </div>
            )}

            {!isCheckingEmail && identifierType === 'phone' && loginPhone && loginPhone.length >= 10 && !emailExists && (
              <div className="auth-field-hint auth-field-hint--error">
                <AlertCircle size={12} /> Account not found.{' '}
                <button type="button" className="auth-field-hint__link" onClick={goToSignup}>
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

          {!isSpecialAccount && (
            <>
              <div className="auth-method-toggle" role="radiogroup" aria-label="Sign-in method">
                <button
                  type="button"
                  role="radio"
                  aria-checked={loginMethod === 'password'}
                  className={`auth-method-toggle__option${loginMethod === 'password' ? ' is-active' : ''}`}
                  onClick={() => setLoginMethod('password')}
                >
                  Password
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={loginMethod === 'code'}
                  className={`auth-method-toggle__option${loginMethod === 'code' ? ' is-active' : ''}`}
                  onClick={() => setLoginMethod('code')}
                >
                  Verification code
                </button>
              </div>

              {isGoogleOnly && loginMethod === 'password' && (
                <div className="auth-field-hint auth-field-hint--accent">
                  <AlertCircle size={12} /> This account uses Google sign-in. Use the button above.
                </div>
              )}

              {loginMethod === 'password' ? (
                <div className="auth-form__field auth-form__field--password">
                  <div className="auth-form__label-row">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="auth-form__link auth-form__link--quiet"
                      onClick={() => router.push('/forgot-password')}
                      disabled={isBusy || !loginEmail || !emailExists}
                    >
                      Forgot password?
                    </button>
                  </div>
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
              ) : loginMethod === 'code' ? (
                <p className="auth-form-note">
                  We&apos;ll email you a 6-digit code to sign in — no password needed.
                </p>
              ) : (
                <p className="auth-form-note">
                  Choose a sign-in method to continue.
                </p>
              )}

              <button
                id="login-submit"
                className="btn btn--primary btn--full btn--pay auth-form__mt-6"
                type="submit"
                disabled={isBusy || !canContinue}
              >
                {loginLoading || isRequestingOTP ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    {loginMethod === 'code' ? 'Sending code…' : 'Logging in…'}
                  </>
                ) : (
                  <>
                    {loginMethod === 'code' ? 'Send verification code' : 'Continue'}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              {loginMethod === 'password' && biometricAvailable && (
                <button
                  type="button"
                  className="auth-form__link auth-form__link--biometric"
                  onClick={handleBiometricLogin}
                  disabled={isBusy || !emailExists || isSpecialAccount}
                >
                  {biometricLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Fingerprint size={16} /> Use biometrics
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </form>

        <p className="auth-signup-footer">
          Don&apos;t have an account?{' '}
          <button type="button" className="auth-signup-footer__link" onClick={goToSignup}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
