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
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { OTPInput } from '@/components/common/OTPInput'
import { checkEmail, requestOTP, verifyOTP, loginWithOTP } from '@/features/auth/services/authService'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

interface SignupFormFlowProps {
  onBackToWelcome: () => void
  onSignupSuccess: (email: string, password: string) => void
  initialEmail?: string
}

export function SignupFormFlow({ onBackToWelcome, onSignupSuccess, initialEmail = '' }: SignupFormFlowProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email')
  const [phoneChannel, setPhoneChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

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

  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN' | 'INVITE' | 'WAITLIST'>('SIGNUP')

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [showExistsModal, setShowExistsModal] = useState(false)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const { signup, loading: signupLoading, error: signupError } = useSignup('', () => {
    onSignupSuccess(email, password)
  })

  // Debounced email/phone existence check
  useEffect(() => {
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email

    if (identifier && (identifierType === 'phone' ? identifier.length >= 10 : (identifier.includes('@') && identifier.length > 5))) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(identifier, identifierType)
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
  }, [email, phone, identifierType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (emailExists && !isInvited && !isWaitlist) {
      setShowExistsModal(true)
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

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email

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
    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email
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
    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email
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
    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email

    try {
      if (effectiveContext === 'LOGIN') {
        // Seamless switch: existing account
        const result = await loginWithOTP(identifier, otp, identifierType)
        if (result.accessToken) {
          setAccessToken(result.accessToken)
          setCookie('pay_access_token', result.accessToken)
        }
        onSignupSuccess(identifier, password)
      } else {
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
        } else if (isInvited) {
          setOtpError('Invite verification failed. Please try again.')
        } else {
          if (identifierType === 'phone') {
            const generatedEmail = `${identifier.replace('+', '')}@upward.com`
            signup({ email: generatedEmail, password, firstName, lastName, phone: identifier })
          } else {
            signup({ email, password, firstName, lastName })
          }
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed')
    }
  }

  const handleResendOTP = async () => {
    const identifier = identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email
    await requestOTP(identifier, effectiveContext, identifierType)
  }

  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--signup">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={() => setStep('form')} disabled={signupLoading}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </a>
        <div className="auth-stage">
          <OTPInput
            email={identifierType === 'phone' ? (phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`) : email}
            onVerify={handleVerifyOTP}
            onResend={handleResendOTP}
            onChangeEmail={() => setStep('form')}
            isLoading={signupLoading}
            error={otpError || signupError}
          />
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

      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </a>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Create your account</h1>
          <p className="auth-stage__subtitle">Name, email, and password — takes under a minute.</p>
        </div>

        <GoogleSignInButton />

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(signupError || localError) && (
            <div className="auth-form__error">{signupError || localError}</div>
          )}

          <div className="auth-form__field">
            <div className="auth-form__label-row">
              <label htmlFor="signup-identifier">{identifierType === 'email' ? 'Email Address' : 'Phone Number'}</label>
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
                  required={identifierType === 'email'}
                />
                {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  className="input-wrapper" 
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', border: emailExists && !isInvited && !isWaitlist ? '1px solid #ff4b4b' : '1px solid #e2e2e2', borderRadius: '14px', padding: '0 16px', background: '#fff', transition: 'border-color 0.2s', height: '46px' }}
                >
                  <span className="country-code" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '13.5px', color: '#7a7268', borderRight: '1px solid #eee', paddingRight: '8px', marginRight: '8px' }}>+234</span>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    placeholder="800 000 0000" 
                    style={{ border: 'none', outline: 'none', height: '100%', width: '100%', fontFamily: 'Plus Jakarta Sans', fontSize: '13.5px', background: 'transparent' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={identifierType === 'phone'}
                  />
                  {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} style={{ position: 'absolute', right: '16px' }} />}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingLeft: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                    <input type="radio" name="phoneChannelSignup" checked={phoneChannel === 'SMS'} onChange={() => setPhoneChannel('SMS')} style={{ accentColor: 'var(--clay)' }} /> SMS
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                    <input type="radio" name="phoneChannelSignup" checked={phoneChannel === 'WHATSAPP'} onChange={() => setPhoneChannel('WHATSAPP')} style={{ accentColor: 'var(--clay)' }} /> WhatsApp
                  </label>
                </div>
              </div>
            )}
            {emailExists && !isInvited && !isWaitlist && (
              <div className="auth-field-hint auth-field-hint--error">
                <AlertCircle size={12} /> This email is already registered.{' '}
                <button type="button" className="auth-field-hint__link" onClick={() => setShowExistsModal(true)}>
                  Log in instead?
                </button>
              </div>
            )}

            {emailExists && isInvited && (
              <div className="auth-field-hint auth-field-hint--accent">
                <AlertCircle size={12} /> Your manager already invited you —{' '}
                <button type="button" className="auth-field-hint__link" onClick={handleInviteProceed}>
                  Verify to set your password
                </button>
              </div>
            )}

            {emailExists && isWaitlist && (
              <div className="auth-field-hint auth-field-hint--accent">
                <Sparkles size={12} /> You have priority access!{' '}
                <button type="button" className="auth-field-hint__link" onClick={handleWaitlistProceed}>
                  Claim your account
                </button>
              </div>
            )}
          </div>

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
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <PasswordStrengthMeter password={password} />
            )}
          </div>

          <div className="auth-form__field">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div
              className={`input-with-icon${
                confirmPassword.length > 0
                  ? confirmPassword === password
                    ? ' input-with-icon--match'
                    : ' input-with-icon--error'
                  : ''
              }`}
            >
              <Lock size={17} />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword.length > 0 && confirmPassword === password && (
                <CheckCircle2 size={17} className="match-icon" />
              )}
            </div>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <div className="auth-field-hint auth-field-hint--error">
                <AlertCircle size={12} /> Passwords don't match
              </div>
            )}
          </div>

          <button
            id="signup-submit"
            className="btn btn--primary btn--full btn--pay auth-form__mt-8"
            type="submit"
            disabled={
              (identifierType === 'email' ? !email : !phone) ||
              signupLoading ||
              isRequestingOTP ||
              isCheckingEmail ||
              emailExists ||
              !firstName ||
              !lastName ||
              !password ||
              !(/.{8,}/.test(password) && /[A-Z]/.test(password) && /[0-9!@#$%^&*(),.?":{}|<> ]/.test(password)) ||
              !confirmPassword ||
              password !== confirmPassword
            }

          >

            {isRequestingOTP
              ? 'Sending Code…'
              : 'Create account'}{' '}

            <ArrowRight size={17} />
          </button>
        </form>

        {showExistsModal && (
          <div className="modal-overlay">
            <div className="modal-content modal-content--auth animate-pop">
              <div className="auth-stage__icon auth-stage__icon--center">
                <AlertCircle size={32} />
              </div>
              <h3 className="modal-title">Account Found</h3>
              <p>
                An account with <strong>{email}</strong> already exists. Would you like to log in instead?
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--full btn--pay"
                  onClick={() => router.push(`/signup?mode=login&email=${encodeURIComponent(email)}`)}
                >
                  Log in to my account
                </button>
                <button type="button" className="auth-btn-ghost-link btn--full" onClick={() => setShowExistsModal(false)}>
                  Use a different email
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
