'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Mail, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { UpwardLogo } from '@/components/PoweredByUpward'

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS'

export default function ForgotPasswordFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('EMAIL')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    if (step === 'EMAIL') {
      router.push('/signup?mode=login')
    } else if (step === 'OTP') {
      setStep('EMAIL')
    } else {
      setStep('OTP')
    }
  }

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.forgotPassword(email)
      setStep('OTP')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset code'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      setLoading(true)
      setError(null)
      try {
        await api.verifyResetOtp(email, otp)
        setStep('PASSWORD')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid verification code'
        setError(message)
      } finally {
        setLoading(false)
      }
    } else {
      setError('Please enter a 6-digit code')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.resetPassword(email, otp, newPassword)
      setStep('SUCCESS')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell auth-shell--login">
      {step !== 'SUCCESS' && (
        <div className="auth-shell__top">
          <button type="button" className="auth-shell__back" onClick={handleBack} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
        </div>
      )}

      {step === 'EMAIL' && (
        <>
          <div className="auth-page__hero">
            <div className="auth-page__hero-icon" aria-hidden>🔑</div>
            <h1 className="auth-page__title">Forgot password?</h1>
            <p className="auth-page__subtitle">
              No worries. Enter the email linked to your account and we&apos;ll send a code to reset it.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSendOTP}>
            {error && <div className="auth-form__error">{error}</div>}
            <div className="auth-form__field">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  id="email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button className="btn btn--primary btn--full btn--pay auth-form__mt-6" type="submit" disabled={loading}>
              {loading ? 'Sending code…' : 'Send reset code'} <ArrowRight size={17} />
            </button>
            <p className="auth-page__footer-link">
              Remembered it?{' '}
              <button type="button" onClick={() => router.push('/signup?mode=login')}>
                Log in
              </button>
            </p>
          </form>
        </>
      )}

      {step === 'OTP' && (
        <>
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>
          <div className="auth-stage__header">
            <h1 className="auth-stage__title">Enter the code</h1>
            <p className="auth-stage__subtitle">
              We sent a 6-digit code to <strong>{email}</strong>. Check your spam folder if you don&apos;t see it.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleVerifyOTP}>
            {error && <div className="auth-form__error">{error}</div>}
            <div className="auth-form__field">
              <label htmlFor="otp">6-Digit Code</label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="000000"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '23px',
                  letterSpacing: '0.35em',
                  fontWeight: 800,
                  padding: '14px 16px',
                  background: 'var(--auth-input-bg, #F6F7F9)',
                  border: '1px solid var(--auth-input-border, #EAEBEE)',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-auth)',
                  color: 'var(--auth-text)',
                }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <button className="btn btn--primary btn--full btn--pay" type="submit">
              Verify <ArrowRight size={17} />
            </button>
            <p className="auth-page__footer-link">
              Didn&apos;t get it?{' '}
              <button type="button" onClick={() => handleSendOTP()} disabled={loading}>
                Resend code
              </button>
            </p>
          </form>
        </>
      )}

      {step === 'PASSWORD' && (
        <>
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>
          <div className="auth-stage__header">
            <h1 className="auth-stage__title">Set new password</h1>
            <p className="auth-stage__subtitle">Create a strong password to secure your account.</p>
          </div>

          <form className="auth-form" onSubmit={handleResetPassword}>
            {error && <div className="auth-form__error">{error}</div>}
            <div className="auth-form__field">
              <label htmlFor="new-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
            <button className="btn btn--primary btn--full btn--pay auth-form__mt-6" type="submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset password'} <ArrowRight size={17} />
            </button>
          </form>
        </>
      )}

      {step === 'SUCCESS' && (
        <div className="auth-page__hero">
          <div className="auth-page__hero-icon" aria-hidden>✓</div>
          <h1 className="auth-page__title">Password reset!</h1>
          <p className="auth-page__subtitle">
            Your password has been updated. You can now log in with your new password.
          </p>
          <button
            className="btn btn--primary btn--full btn--pay auth-form__mt-8"
            type="button"
            onClick={() => router.push('/signup?mode=login')}
          >
            Back to log in <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
