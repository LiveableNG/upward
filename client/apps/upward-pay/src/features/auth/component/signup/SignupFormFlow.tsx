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
  ShieldCheck,
  Loader2,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { OTPInput } from '@/components/common/OTPInput'
import { checkEmail, requestOTP, verifyOTP, loginWithOTP } from '@/features/auth/services/authService'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { ConnectPmStep } from './ConnectPmStep'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { DatePicker } from './DatePicker'

interface SignupFormFlowProps {
  onBackToWelcome: () => void
  onSignupSuccess: (email: string, password: string) => void
  initialEmail?: string
}

export function SignupFormFlow({ onBackToWelcome, onSignupSuccess, initialEmail = '' }: SignupFormFlowProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN' | 'INVITE' | 'WAITLIST'>('SIGNUP')

  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [showExistsModal, setShowExistsModal] = useState(false)
  const [step, setStep] = useState<'form' | 'otp' | 'connect-pm'>('form')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const { signup, loading: signupLoading, error: signupError } = useSignup('', () => {
    setStep('connect-pm')
  })

  // Debounced email existence check
  useEffect(() => {
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    if (email && email.includes('@') && email.length > 5) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(email)
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
  }, [email])

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

    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(email, 'SIGNUP')
      setEffectiveContext(res.context || 'SIGNUP')
      setStep('otp')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleInviteProceed = async () => {
    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(email, 'INVITE')
      setEffectiveContext('INVITE')
      setStep('otp')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code')
    } finally {
      setIsRequestingOTP(false)
    }
  }



  const handleWaitlistProceed = async () => {
    setIsRequestingOTP(true)
    try {
      const res: any = await requestOTP(email, 'WAITLIST')
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
    try {
      if (effectiveContext === 'LOGIN') {
        // Seamless switch: existing account
        const result = await loginWithOTP(email, otp)
        if (result.accessToken) {
          setAccessToken(result.accessToken)
          setCookie('pay_access_token', result.accessToken)
        }
        onSignupSuccess(email, password)
      } else {
        const verification = await verifyOTP(email, otp, effectiveContext)
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
          signup({ email, password, firstName, lastName, dateOfBirth })
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed')
    }
  }

  const handleResendOTP = async () => {
    await requestOTP(email, effectiveContext)
  }

  if (step === 'connect-pm') {
    return (
      <div className="auth-shell auth-shell--signup">
        <ConnectPmStep 
          onComplete={() => onSignupSuccess(email, password)}
          onSkip={() => onSignupSuccess(email, password)}
        />
      </div>
    )
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
            email={email}
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
          <p className="auth-stage__subtitle">Tell us about yourself to get started.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(signupError || localError) && (
            <div className="auth-form__error">{signupError || localError}</div>
          )}

          <div className="auth-form__field">
            <label htmlFor="signup-email">Email Address</label>
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
                required
              />
              {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
            </div>
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
            <label htmlFor="signup-dob">
              <Calendar size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: 'var(--auth-muted)' }} />
              Date of Birth
            </label>
            <DatePicker
              id="signup-dob"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              required
            />
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
              !email ||
              signupLoading ||
              isRequestingOTP ||
              isCheckingEmail ||
              emailExists ||
              !firstName ||
              !lastName ||
              !dateOfBirth ||
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
