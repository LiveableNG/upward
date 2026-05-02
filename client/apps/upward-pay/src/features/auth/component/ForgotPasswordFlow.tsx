'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.forgotPassword(email)
      setStep('OTP')
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      setStep('PASSWORD')
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
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page__content">
      {step !== 'SUCCESS' && (
        <button className="signup-step__back" onClick={() => step === 'EMAIL' ? router.push('/login') : setStep(step === 'OTP' ? 'EMAIL' : 'OTP')}>
          <ArrowLeft size={18} /> {step === 'EMAIL' ? 'Back to Login' : 'Back'}
        </button>
      )}

      {step === 'EMAIL' && (
        <div className="forgot-password-step">
          <div className="auth-page__hero">
            <h1 className="auth-page__title">Forgot Password?</h1>
            <p className="auth-page__subtitle">
              Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSendOTP}>
            {error && <div className="auth-form__error">{error}</div>}
            <div className="auth-form__field">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button className="btn btn--primary btn--full btn--pay" type="submit" disabled={loading}>
              {loading ? 'Sending code…' : 'Send Reset Code'}
            </button>
          </form>
        </div>
      )}

      {step === 'OTP' && (
        <div className="forgot-password-step">
          <div className="auth-page__hero text-center">
            <div className="flex-center mb-4">
              <div className="icon-circle icon-circle--success">
                <ShieldCheck size={32} color="#22c55e" />
              </div>
            </div>
            <h1 className="auth-page__title">Check your email</h1>
            <p className="auth-page__subtitle">
              We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. 
              Be sure to check your <strong>spam/junk</strong> folder if you don&apos;t see it.
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
                className="otp-input"
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '0.5em', fontWeight: 'bold' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <button className="btn btn--primary btn--full btn--pay" type="submit">
              Verify Code
            </button>
            <p className="mt-6 text-center text-sm text-gray-400">
              Didn&apos;t receive the code?{' '}
              <button type="button" className="text-secondary font-semibold" onClick={handleSendOTP}>
                Resend
              </button>
            </p>
          </form>
        </div>
      )}

      {step === 'PASSWORD' && (
        <div className="forgot-password-step">
          <div className="auth-page__hero">
            <h1 className="auth-page__title">Set New Password</h1>
            <p className="auth-page__subtitle">
              Create a strong password to secure your account.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleResetPassword}>
            {error && <div className="auth-form__error">{error}</div>}
            <div className="auth-form__field">
              <label htmlFor="new-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
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
            <button className="btn btn--primary btn--full btn--pay" type="submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="forgot-password-step text-center">
          <div className="flex-center mb-6">
            <div className="icon-circle icon-circle--success" style={{ width: '80px', height: '80px' }}>
              <CheckCircle2 size={48} color="#22c55e" />
            </div>
          </div>
          <h1 className="auth-page__title">Password Reset!</h1>
          <p className="auth-page__subtitle mb-8">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <button className="btn btn--primary btn--full btn--pay" onClick={() => router.push('/login')}>
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  )
}
