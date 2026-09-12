'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Mail, 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useMutation } from '@tanstack/react-query'
import { forgotPassword, resetPassword, verifyResetOtp } from '../services/authService'
import { useToast } from '@/components/common/Toast'

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS'

export default function ForgotPasswordFlow() {
  const router = useRouter()
  const { success, error } = useToast()
  
  const [step, setStep] = useState<Step>('EMAIL')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const forgotMutation = useMutation({
    mutationFn: (emailAddress: string) => forgotPassword(emailAddress),
    onSuccess: () => {
      success('Verification code sent successfully!')
      setResendCooldown(30)
      setStep('OTP')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to send reset code')
    }
  })

  const resetMutation = useMutation({
    mutationFn: (data: { email: string; otp: string; newPass: string }) => 
      resetPassword(data.email, data.otp, data.newPass),
    onSuccess: () => {
      success('Password reset successfully!')
      setStep('SUCCESS')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to reset password')
    }
  })

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { email: string; otp: string }) => verifyResetOtp(data.email, data.otp),
    onSuccess: () => {
      setStep('PASSWORD')
    },
    onError: (err: any) => {
      error(err.message || 'Invalid verification code')
    }
  })

  const isResending = forgotMutation.isPending
  const isVerifying = verifyOtpMutation.isPending
  const isResetting = resetMutation.isPending
  const loading = isResending || isVerifying || isResetting

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    forgotMutation.mutate(email)
  }

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length === 6) {
      verifyOtpMutation.mutate({ email, otp: otpCode })
    } else {
      error('Please enter the complete 6-digit code')
    }
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      error('Password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      error('Passwords do not match')
      return
    }
    resetMutation.mutate({
      email,
      otp: otp.join(''),
      newPass: newPassword
    })
  }

  const handleOtpChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '')

    if (digitsOnly.length > 1) {
      const newOtp = [...otp]
      digitsOnly.split('').forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digitsOnly.length, 5)
      document.getElementById(`otp-${nextIndex}`)?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = digitsOnly
    setOtp(newOtp)

    if (digitsOnly && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6)
    if (!digitsOnly) return

    const newOtp = [...otp]
    digitsOnly.split('').forEach((d, i) => {
      if (index + i < 6) {
        newOtp[index + i] = d
      }
    })
    setOtp(newOtp)

    const nextIndex = Math.min(index + digitsOnly.length, 5)
    document.getElementById(`otp-${nextIndex}`)?.focus()
  }

  return (
    <div className="animate-fade-in">
      {step !== 'SUCCESS' && (
        <button 
          type="button"
          onClick={() => {
            if (step === 'EMAIL') {
              window.location.href = Capacitor.isNativePlatform() ? '/login' : '/pm-login'
            } else if (step === 'OTP') {
              setStep('EMAIL')
            } else {
              setStep('OTP')
            }
          }}
          className="back-link"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '24px',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          <span>{step === 'EMAIL' ? 'Back to sign in' : 'Back'}</span>
        </button>
      )}

      {step === 'EMAIL' && (
        <div>
          <div className="card-head">
            <h2>Forgot password?</h2>
            <p>
              Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSendOTP} noValidate>
            <div className="field">
              <label htmlFor="reset-email">Email address</label>
              <div className="input-shell">
                <Mail size={17} />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="primary-btn" disabled={loading}>
              <span>{loading ? 'Sending code...' : 'Send reset code'}</span>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      )}

      {step === 'OTP' && (
        <div>
          <div className="card-head">
            <h2>Verify your email</h2>
            <p>
              We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. Enter the code below to proceed.
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} noValidate>
            <div className="otp-row">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  className="otp-box"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onPaste={(e) => handleOtpPaste(e, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus()
                    }
                  }}
                  required
                />
              ))}
            </div>

            <div className="otp-meta">
              <span>
                Wrong email?{' '}
                <button 
                  type="button" 
                  onClick={() => setStep('EMAIL')}
                >
                  Change it
                </button>
              </span>
              <button 
                type="button" 
                onClick={() => {
                  if (resendCooldown > 0 || isResending) return
                  forgotMutation.mutate(email, {
                    onSuccess: () => {
                      setResendCooldown(30)
                    }
                  })
                }}
                disabled={resendCooldown > 0 || isResending || isVerifying}
                style={{
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  opacity: resendCooldown > 0 ? 0.6 : 1,
                }}
              >
                {isResending ? 'Sending code...' : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code')}
              </button>
            </div>

            <button type="submit" className="primary-btn" disabled={isVerifying || isResending}>
              <span>{isVerifying ? 'Verifying code...' : 'Verify code'}</span>
              {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      )}

      {step === 'PASSWORD' && (
        <div>
          <div className="card-head">
            <h2>Set new password</h2>
            <p>
              Create a strong password of at least 8 characters to secure your account.
            </p>
          </div>

          <form onSubmit={handleResetPassword} noValidate>
            <div className="field">
              <label htmlFor="reset-new-pass">New password</label>
              <div className="input-shell">
                <Lock size={17} />
                <input
                  id="reset-new-pass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="reset-confirm-pass">Confirm password</label>
              <div className="input-shell">
                <Lock size={17} />
                <input
                  id="reset-confirm-pass"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="icon-btn"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              <span>{loading ? 'Resetting...' : 'Reset password'}</span>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <CheckCircle2 size={56} color="var(--forest-700)" />
          </div>
          <div className="card-head">
            <h2>Password reset successful!</h2>
            <p>
              Your password has been successfully updated. You can now sign in using your new password.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => window.location.href = Capacitor.isNativePlatform() ? '/login' : '/pm-login'} 
            className="primary-btn"
            style={{ marginTop: 24 }}
          >
            <span>Back to sign in</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
