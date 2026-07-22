'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Mail, 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useMutation } from '@tanstack/react-query'
import { forgotPassword, resetPassword } from '../services/authService'
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

  const forgotMutation = useMutation({
    mutationFn: (emailAddress: string) => forgotPassword(emailAddress),
    onSuccess: () => {
      success('Verification code sent successfully!')
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

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    forgotMutation.mutate(email)
  }

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length === 6) {
      setStep('PASSWORD')
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
    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const loading = forgotMutation.isPending || resetMutation.isPending

  return (
    <div className="animate-fade-in">
      {step !== 'SUCCESS' && (
        <button 
          className="btn-back" 
          onClick={() => {
            if (step === 'EMAIL') {
              window.location.href = Capacitor.isNativePlatform() ? '/login' : '/pm-login'
            } else if (step === 'OTP') {
              setStep('EMAIL')
            } else {
              setStep('OTP')
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24,
            padding: 0
          }}
        >
          <ArrowLeft size={18} /> {step === 'EMAIL' ? 'Back to Login' : 'Back'}
        </button>
      )}

      {step === 'EMAIL' && (
        <div>
          <div className="auth-header">
            <h2 className="auth-card__title">Forgot Password?</h2>
            <p className="auth-card__subtitle">
              Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input form-input--with-icon"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? 'Sending code...' : 'Send Reset Code'}
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}

      {step === 'OTP' && (
        <div>
          <div className="auth-header">
            <h2 className="auth-card__title">Verify your email</h2>
            <p className="auth-card__subtitle">
              We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. 
              Be sure to check your <strong>spam folder</strong> if you don&apos;t see it.
            </p>
          </div>

          <form onSubmit={handleVerifyOTP}>
            <div className="otp-group">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus()
                    }
                  }}
                  required
                />
              ))}
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" style={{ marginTop: 24 }}>
              Verify Code
              <ArrowRight size={18} />
            </button>

            <div className="auth-footer" style={{ marginTop: 24 }}>
              Didn&apos;t receive the code?{' '}
              <button 
                type="button" 
                onClick={() => forgotMutation.mutate(email)}
                style={{
                  color: 'var(--forest)',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                Resend
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'PASSWORD' && (
        <div>
          <div className="auth-header">
            <h2 className="auth-card__title">Set New Password</h2>
            <p className="auth-card__subtitle">
              Create a strong password of at least 8 characters to secure your account.
            </p>
          </div>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input--with-icon"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest)',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input form-input--with-icon"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest)',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <CheckCircle2 size={64} color="var(--forest)" />
          </div>
          <h2 className="auth-card__title" style={{ marginBottom: 12 }}>Password Reset Successful!</h2>
          <p className="auth-card__subtitle" style={{ marginBottom: 32 }}>
            Your password has been successfully updated. You can now log in using your new password.
          </p>
          <button 
            onClick={() => window.location.href = Capacitor.isNativePlatform() ? '/login' : '/pm-login'} 
            className="auth-btn auth-btn--primary"
          >
            Back to Sign In
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
