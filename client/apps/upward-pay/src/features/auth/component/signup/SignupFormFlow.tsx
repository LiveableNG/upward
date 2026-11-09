'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  User,
  Mail,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Compass,
  ChevronDown,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { OTPInput } from '@/components/common/OTPInput'
import { useAuth } from '@/features/auth/AuthContext'
import { haptics } from '@/lib/haptics'
import { useQueryClient } from '@tanstack/react-query'
import {
  checkEmail,
  requestOTP,
  verifyOTP,
  loginWithOTP,
} from '@/features/auth/services/authService'
import { setAccessToken, setRefreshToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton'
import { isValidEmail } from '@/lib/utils'

interface SignupFormFlowProps {
  onBackToWelcome: () => void
  onSignupSuccess: (email: string, password: string) => void
  initialEmail?: string
}

export function SignupFormFlow({
  onBackToWelcome,
  onSignupSuccess,
  initialEmail = '',
}: SignupFormFlowProps) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email')
  const [phoneChannel, setPhoneChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [hearAboutUs, setHearAboutUs] = useState('')
  const [hearAboutUsOther, setHearAboutUsOther] = useState('')
  const [localError, setLocalError] = useState('')

  const HEAR_ABOUT_US_OPTIONS = [
    { id: 'social_media', label: 'Social Media (X, Instagram, TikTok, LinkedIn)' },
    { id: 'friend_colleague', label: 'Friend or Colleague' },
    { id: 'google_search', label: 'Search Engine (Google, Bing)' },
    { id: 'campus_event', label: 'Campus / University Event' },
    { id: 'article_blog', label: 'Article, Blog, or Podcast' },
    { id: 'online_ad', label: 'Online Advertisement' },
    { id: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (initialEmail) {
      if (initialEmail.startsWith('+') || /^\d+$/.test(initialEmail)) {
        setIdentifierType('phone')
        setPhone(initialEmail)
      } else {
        setIdentifierType('email')
        setEmail(initialEmail)
      }
    }
  }, [initialEmail])

  const [effectiveContext, setEffectiveContext] = useState<
    'SIGNUP' | 'LOGIN' | 'INVITE' | 'WAITLIST'
  >('SIGNUP')

  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
  }, [])

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [authProvider, setAuthProvider] = useState('email')
  const [step, setStep] = useState<'auth' | 'identity' | 'otp'>('auth')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const {
    signup,
    loading: signupLoading,
    error: signupError,
  } = useSignup('', () => {
    onSignupSuccess(email, password)
  })

  const goToLogin = () => {
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email
    router.push(`/signup?mode=login&email=${encodeURIComponent(identifier)}`)
  }

  // Debounced email/phone existence check
  useEffect(() => {
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    setAuthProvider('email')
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email

    if (
      identifier &&
      (identifierType === 'phone' ? identifier.length >= 10 : isValidEmail(identifier))
    ) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(identifier, identifierType)
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
    }
    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    }
  }, [email, phone, identifierType])

  const isPasswordValid =
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9!@#$%^&*(),.?":{}|<> ]/.test(password)

  // Guard against invited, waitlist, or already registered users proceeding to stage 2
  useEffect(() => {
    if (step === 'identity') {
      if (isInvited || isWaitlist || emailExists || !isPasswordValid) {
        setStep('auth')
      }
    }
  }, [step, isInvited, isWaitlist, emailExists, isPasswordValid])

  const handleAuthContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (identifierType === 'email') {
      if (!isValidEmail(email)) {
        setLocalError(
          'Please enter a valid email address with a valid domain (e.g. name@example.com)',
        )
        return
      }
    } else {
      if (phone.trim().length < 8) {
        setLocalError('Please enter a valid phone number')
        return
      }
    }

    if (emailExists && !isInvited && !isWaitlist) {
      goToLogin()
      return
    }

    if (emailExists && isInvited) {
      handleInviteProceed()
      return
    }

    if (emailExists && isWaitlist) {
      handleWaitlistProceed()
      return
    }

    if (!isPasswordValid) {
      setLocalError(
        'Password must be at least 8 characters and include uppercase, number or symbol.',
      )
      return
    }

    haptics.light()
    setStep('identity')
  }

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (isInvited || isWaitlist || emailExists || !isPasswordValid) {
      setStep('auth')
      return
    }

    if (!firstName.trim()) {
      setLocalError('Please enter your first name')
      return
    }
    if (!lastName.trim()) {
      setLocalError('Please enter your last name')
      return
    }

    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email

    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(identifier, 'SIGNUP', identifierType, phoneChannel)
      setEffectiveContext(res.context || 'SIGNUP')
      setStep('otp')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleInviteProceed = async () => {
    if (identifierType === 'email' && !isValidEmail(email)) {
      setLocalError(
        'Please enter a valid email address with a valid domain (e.g. name@example.com)',
      )
      return
    }
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email
    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(identifier, 'INVITE', identifierType, phoneChannel)
      setEffectiveContext('INVITE')
      setStep('otp')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleWaitlistProceed = async () => {
    if (identifierType === 'email' && !isValidEmail(email)) {
      setLocalError(
        'Please enter a valid email address with a valid domain (e.g. name@example.com)',
      )
      return
    }
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email
    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(identifier, 'WAITLIST', identifierType, phoneChannel)
      setEffectiveContext('WAITLIST')
      setStep('otp')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleVerifyOTP = async (otp: string) => {
    setOtpError(null)
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email

    try {
      if (effectiveContext === 'LOGIN') {
        // Seamless switch: existing account
        const result = await loginWithOTP(identifier, otp, identifierType)
        if (result.accessToken) {
          setAccessToken(result.accessToken)
          setCookie('pay_access_token', result.accessToken)
        }
        if (result.refreshToken) {
          setRefreshToken(result.refreshToken)
        }
        queryClient.clear()
        await setAuthUser(result.user, { isNewUser: true, provider: 'email' })
        queryClient.setQueryData(['user'], result.user)
        haptics.success()
        onSignupSuccess(identifier, password)
      } else {
        const verification = await verifyOTP(identifier, otp, effectiveContext, identifierType)
        if (!verification.success) {
          haptics.error()
          setOtpError(verification.message || 'Invalid verification code')
          return
        }

        haptics.success()
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
        } else if (isInvited) {
          haptics.error()
          setOtpError('Invite verification failed. Please try again.')
        } else {
          const hearAboutUsValue =
            hearAboutUs === 'other'
              ? hearAboutUsOther.trim()
                ? `Other: ${hearAboutUsOther.trim()}`
                : 'Other'
              : HEAR_ABOUT_US_OPTIONS.find((o) => o.id === hearAboutUs)?.label || hearAboutUs

          if (identifierType === 'phone') {
            const generatedEmail = `${identifier.replace('+', '')}@upward.com`
            signup({
              email: generatedEmail,
              password,
              firstName,
              lastName,
              phone: identifier,
              hearAboutUs: hearAboutUsValue || undefined,
            })
          } else {
            signup({
              email,
              password,
              firstName,
              lastName,
              hearAboutUs: hearAboutUsValue || undefined,
            })
          }
        }
      }
    } catch (err: any) {
      haptics.error()
      setOtpError(err.message || 'Verification failed')
    }
  }

  const handleResendOTP = async (channel?: 'SMS' | 'WHATSAPP') => {
    haptics.light()
    const identifier =
      identifierType === 'phone'
        ? phone.startsWith('+')
          ? phone
          : `+234${phone.replace(/^0/, '')}`
        : email
    await requestOTP(identifier, effectiveContext, identifierType, channel || phoneChannel)
  }

  const handleOtpBack = () => {
    if (
      effectiveContext === 'INVITE' ||
      effectiveContext === 'WAITLIST' ||
      isInvited ||
      isWaitlist
    ) {
      setStep('auth')
    } else {
      setStep('identity')
    }
  }

  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--signup">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={handleOtpBack} disabled={signupLoading}>
            <ChevronLeft size={20} />
          </button>
        </div>
        {isNative ? (
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>
        ) : (
          <a
            href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}
            className="auth-shell__brand"
          >
            <UpwardLogo size={28} color="var(--clay)" />
          </a>
        )}
        <div className="auth-stage">
          <OTPInput
            email={
              identifierType === 'phone'
                ? phone.startsWith('+')
                  ? phone
                  : `+234${phone.replace(/^0/, '')}`
                : email
            }
            onVerify={handleVerifyOTP}
            onResend={handleResendOTP}
            onChangeEmail={() => setStep('auth')}
            isLoading={signupLoading}
            error={otpError || signupError}
          />
        </div>
      </div>
    )
  }

  if (step === 'identity') {
    if (isInvited || isWaitlist || emailExists || !isPasswordValid) {
      return null
    }

    return (
      <div className="auth-shell auth-shell--signup">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={() => setStep('auth')}>
            <ChevronLeft size={20} />
          </button>
        </div>

        {isNative ? (
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>
        ) : (
          <a
            href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}
            className="auth-shell__brand"
          >
            <UpwardLogo size={28} color="var(--clay)" />
          </a>
        )}

        <div className="auth-stage animate-pop">
          <div className="auth-stage__header">
            <span className="auth-form__step-badge">Step 2 of 2</span>
            <h1 className="auth-stage__title">What&apos;s your name?</h1>
            <p className="auth-stage__subtitle">
              Enter your name as it appears on your official ID.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleIdentitySubmit}>
            {(signupError || localError) && (
              <div className="auth-form__error">{signupError || localError}</div>
            )}

            <div className="auth-form__row">
              <div className="auth-form__field">
                <label htmlFor="signup-firstname">First Name</label>
                <div className="input-with-icon">
                  <User size={17} />
                  <input
                    id="signup-firstname"
                    type="text"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="auth-form__field">
                <label htmlFor="signup-lastname">Last Name</label>
                <div className="input-with-icon">
                  <User size={17} />
                  <input
                    id="signup-lastname"
                    type="text"
                    placeholder="Johnson"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-form__field" style={{ marginTop: '8px' }}>
              <div className="auth-form__label-row">
                <label>Where did you hear about us?</label>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    fontStyle: 'italic',
                  }}
                >
                  Optional
                </span>
              </div>
              <div className="auth-chips">
                {HEAR_ABOUT_US_OPTIONS.map((opt) => {
                  const shortLabel =
                    opt.id === 'social_media'
                      ? 'Social Media'
                      : opt.id === 'google_search'
                        ? 'Google Search'
                        : opt.label.split(' (')[0]
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`auth-chip ${hearAboutUs === opt.id ? 'auth-chip--selected' : ''}`}
                      onClick={() => setHearAboutUs(hearAboutUs === opt.id ? '' : opt.id)}
                    >
                      {shortLabel}
                    </button>
                  )
                })}
              </div>
              {hearAboutUs === 'other' && (
                <div className="input-with-icon" style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Please specify how you found us"
                    value={hearAboutUsOther}
                    onChange={(e) => setHearAboutUsOther(e.target.value)}
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              )}
            </div>

            <button
              id="signup-submit"
              className="btn btn--primary btn--full btn--pay auth-form__mt-8"
              type="submit"
              disabled={!firstName.trim() || !lastName.trim() || isRequestingOTP}
            >
              {isRequestingOTP ? 'Sending Code…' : 'Create account'} <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__top">
        <button className="auth-shell__back" onClick={onBackToWelcome}>
          <ChevronLeft size={20} />
        </button>
      </div>

      {isNative ? (
        <div className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </div>
      ) : (
        <a
          href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}
          className="auth-shell__brand"
        >
          <UpwardLogo size={28} color="var(--clay)" />
        </a>
      )}

      <div className="auth-stage animate-pop">
        <div className="auth-stage__header">
          <span className="auth-form__step-badge">Step 1 of 2</span>
          <h1 className="auth-stage__title">Create your account</h1>
          <p className="auth-stage__subtitle">Sign up in seconds to start managing your rent.</p>
        </div>

        <div className="auth-social-stack">
          <AppleSignInButton />
          <GoogleSignInButton />
        </div>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-form" onSubmit={handleAuthContinue}>
          {(signupError || localError) && (
            <div className="auth-form__error">{signupError || localError}</div>
          )}

          <div className="auth-form__field">
            <div className="auth-form__label-row">
              <label htmlFor="signup-identifier">
                {identifierType === 'email' ? 'Email Address' : 'Phone Number'}
              </label>
              <button
                type="button"
                className="auth-form__link auth-form__link--quiet"
                onClick={() => {
                  setIdentifierType(identifierType === 'email' ? 'phone' : 'email')
                  setEmailExists(false)
                }}
              >
                Sign up with {identifierType === 'email' ? 'Phone Number' : 'Email'}
              </button>
            </div>

            {identifierType === 'email' ? (
              <div
                className={
                  emailExists && !isInvited && !isWaitlist
                    ? 'input-with-icon input-with-icon--error'
                    : 'input-with-icon'
                }
              >
                <Mail size={17} />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                  title="Please enter a valid email address with a domain (e.g. name@example.com)"
                  required={identifierType === 'email'}
                />
                {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className="input-wrapper"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    border:
                      emailExists && !isInvited && !isWaitlist
                        ? '1px solid #ff4b4b'
                        : '1px solid #e2e2e2',
                    borderRadius: '14px',
                    padding: '0 16px',
                    background: '#fff',
                    transition: 'border-color 0.2s',
                    height: '46px',
                  }}
                >
                  <span
                    className="country-code"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '13.5px',
                      color: '#7a7268',
                      borderRight: '1px solid #eee',
                      paddingRight: '8px',
                      marginRight: '8px',
                    }}
                  >
                    +234
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="800 000 0000"
                    style={{
                      border: 'none',
                      outline: 'none',
                      height: '100%',
                      width: '100%',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '13.5px',
                      background: 'transparent',
                    }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={identifierType === 'phone'}
                  />
                  {isCheckingEmail && (
                    <Loader2
                      className="input-spinner animate-spin"
                      size={16}
                      style={{ position: 'absolute', right: '16px' }}
                    />
                  )}
                </div>
                <div
                  style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingLeft: '4px' }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                  >
                    <input
                      type="radio"
                      name="phoneChannelSignup"
                      checked={phoneChannel === 'SMS'}
                      onChange={() => setPhoneChannel('SMS')}
                      style={{ accentColor: 'var(--clay)' }}
                    />{' '}
                    SMS
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                  >
                    <input
                      type="radio"
                      name="phoneChannelSignup"
                      checked={phoneChannel === 'WHATSAPP'}
                      onChange={() => setPhoneChannel('WHATSAPP')}
                      style={{ accentColor: 'var(--clay)' }}
                    />{' '}
                    WhatsApp
                  </label>
                </div>
              </div>
            )}

            {emailExists &&
              !isInvited &&
              !isWaitlist &&
              (authProvider === 'google' || authProvider === 'apple') && (
                <div className="auth-field-hint auth-field-hint--accent">
                  <AlertCircle size={12} /> This account is registered with{' '}
                  {authProvider === 'apple' ? 'Apple' : 'Google'}.{' '}
                  <button type="button" className="auth-field-hint__link" onClick={goToLogin}>
                    Log in instead?
                  </button>
                </div>
              )}

            {emailExists &&
              !isInvited &&
              !isWaitlist &&
              authProvider !== 'google' &&
              authProvider !== 'apple' && (
                <div className="auth-field-hint auth-field-hint--error">
                  <AlertCircle size={12} />{' '}
                  {identifierType === 'email'
                    ? 'This email is already registered.'
                    : 'This phone number is already registered.'}{' '}
                  <button type="button" className="auth-field-hint__link" onClick={goToLogin}>
                    Log in instead?
                  </button>
                </div>
              )}

            {emailExists && isInvited && (
              <div className="auth-field-hint auth-field-hint--accent">
                <AlertCircle size={12} /> Your manager already invited you —{' '}
                <button
                  type="button"
                  className="auth-field-hint__link"
                  onClick={handleInviteProceed}
                >
                  Complete setup to claim your property
                </button>
              </div>
            )}

            {emailExists && isWaitlist && (
              <div className="auth-field-hint auth-field-hint--accent">
                <Sparkles size={12} /> You have priority access!{' '}
                <button
                  type="button"
                  className="auth-field-hint__link"
                  onClick={handleWaitlistProceed}
                >
                  Claim your account
                </button>
              </div>
            )}
          </div>

          <div className="auth-form__field">
            <label htmlFor="signup-password">Create Password</label>
            <div className="input-with-icon">
              <Lock size={17} />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && <PasswordStrengthMeter password={password} />}
          </div>

          <p className="auth-stage__disclaimer">
            By continuing, you agree to our{' '}
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Use
            </a>{' '}
            and{' '}
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>

          <button
            id="signup-auth-continue"
            className="btn btn--primary btn--full btn--pay auth-form__mt-8"
            type="submit"
            disabled={
              (identifierType === 'email' ? !isValidEmail(email) : phone.trim().length < 8) ||
              !isPasswordValid ||
              isCheckingEmail ||
              (emailExists && !isInvited && !isWaitlist)
            }
          >
            Continue <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
