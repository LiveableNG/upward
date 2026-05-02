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
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { OTPInput } from '@/components/common/OTPInput'
import { checkEmail, requestOTP, verifyOTP, loginWithOTP } from '@/features/auth/services/authService'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'

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
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const { signup, loading: signupLoading, error: signupError } = useSignup('', () => {
    onSignupSuccess(email, password)
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
          signup({ email, password, firstName, lastName })
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed')
    }
  }

  const handleResendOTP = async () => {
    await requestOTP(email, effectiveContext)
  }


  if (step === 'otp') {
    return (
      <div className="auth-shell auth-shell--signup">
        <div className="auth-shell__top">
          <button className="auth-shell__back" onClick={() => setStep('form')} disabled={signupLoading}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <a href="https://upward.goodtenants.io" className="auth-shell__brand">
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

      <a href="https://upward.goodtenants.io" className="auth-shell__brand">
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
            <div className="input-with-icon">
              <Mail size={17} />
              <input
                id="signup-email"
                type="email"
                placeholder="sarah@email.com"
                className={emailExists && !isInvited && !isWaitlist ? 'input--error' : ''}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {isCheckingEmail && <Loader2 className="input-spinner animate-spin" size={16} />}
            </div>
            {emailExists && !isInvited && !isWaitlist && (
              <div className="field-hint field-hint--error">
                <AlertCircle size={12} /> This email is already registered.{' '}
                <button type="button" className="field-hint__link" onClick={() => setShowExistsModal(true)}>
                  Log in instead?
                </button>
              </div>
            )}

            {emailExists && isInvited && (
              <div className="field-hint field-hint--invited">
                <AlertCircle size={12} /> Your manager already invited you —{' '}
                <button type="button" className="field-hint__link" onClick={handleInviteProceed}>
                  Verify to set your password
                </button>
              </div>
            )}

            {emailExists && isWaitlist && (
              <div className="field-hint field-hint--waitlist">
                <Sparkles size={12} /> You have priority access!{' '}
                <button type="button" className="field-hint__link" onClick={handleWaitlistProceed}>
                  Claim your account
                </button>
              </div>
            )}
          </div>

          <div className="auth-form__row mt-1">
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

          <div className="auth-form__row mt-1">
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
              </div>
            </div>
            <div className="auth-form__field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
          </div>

          <button
            id="signup-submit"
            className="btn btn--primary btn--full btn--pay mt-8"
            type="submit"
            disabled={
              !email ||
              signupLoading ||
              isRequestingOTP ||
              isCheckingEmail ||
              emailExists ||
              !firstName ||
              !lastName ||
              !password ||
              !confirmPassword
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
            <div className="modal-content animate-pop">
              <div className="modal-icon">
                <AlertCircle size={40} color="var(--clay)" />
              </div>
              <h3>Account Found</h3>
              <p>
                An account with <strong>{email}</strong> already exists. Would you like to log in instead?
              </p>
              <div className="modal-actions">
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => router.push(`/signup?mode=login&email=${encodeURIComponent(email)}`)}
                >
                  Log in to my account
                </button>
                <button className="btn btn--ghost btn--full mt-4" onClick={() => setShowExistsModal(false)}>
                  Use a different email
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .auth-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .mt-1 { margin-top: 12px; }
        .mt-4 { margin-top: 20px; }
        .mt-8 { margin-top: 32px; }
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
        .input--error { border-color: var(--error) !important; }
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
        @media (max-width: 480px) {
          .auth-form__row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
