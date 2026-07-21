'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Mail, 
  Lock, 
  ChevronRight,
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  User,
  ShieldCheck
} from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { useRequestOTP, useOtpLogin } from '../hooks/useOtp'
import { useToast } from '@/components/common/Toast'

export const LoginForm = () => {
  const { error: toastError } = useToast()
  const [stage, setStage] = useState<'credentials' | 'otp'>('credentials')
  const [useOtp, setUseOtp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const loginMutation = useLogin()
  const requestOtpMutation = useRequestOTP()
  const otpLoginMutation = useOtpLogin()

  const loading = loginMutation.isPending || requestOtpMutation.isPending || otpLoginMutation.isPending

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toastError("Please enter your email address");
      return;
    }

    if (!useOtp && !password) {
      toastError("Please enter your password");
      return;
    }

    if (useOtp) {
      requestOtpMutation.mutate(
        { email, context: 'LOGIN' },
        {
          onSuccess: () => {
            setStage('otp')
          }
        }
      )
    } else {
      loginMutation.mutate({ email, password })
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (otpLoginMutation.isError) otpLoginMutation.reset()

    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }

    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const triggerVerification = (otpArray: string[]) => {
    const otpCode = otpArray.join('')
    if (otpCode.length !== 6) return

    otpLoginMutation.mutate(
      { email, otp: otpCode },
      {
        onSuccess: (res: any) => {
          if (res.user?.pmType === 'INDIVIDUAL_LANDLORD') {
            window.location.href = '/portal'
          } else {
            window.location.href = '/dashboard'
          }
        }
      }
    )
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toastError("Please enter a complete 6-digit verification code");
      return;
    }
    
    triggerVerification(otp)
  }

  return (
    <div className="animate-fade-in">
      <div className="auth-role-toggle">
        <button 
          type="button"
          className="auth-role-toggle__btn auth-role-toggle__btn--active"
        >
          <Building size={16} />
          <span>Property Manager</span>
        </button>
        <Link 
          href="/portal/login"
          className="auth-role-toggle__btn"
        >
          <User size={16} />
          <span>Landlord</span>
        </Link>
      </div>

      <div className="auth-header">
        <h2 className="auth-card__title">
          {stage === 'credentials' ? 'Welcome back' : 'Verify your email'}
        </h2>
        <p className="auth-card__subtitle" style={{ fontSize: '15px', padding: '0 20px' }}>
          {stage === 'otp' ? (
            <>
              We've sent a 6-digit code to <strong>{email}</strong>.
              Enter it below to continue. <br />
              <span style={{ fontSize: '13px', opacity: 0.8 }}>(Check your <strong>spam folder</strong> if you don't see it)</span>
            </>
          ) : useOtp ? (
            "Enter your email to receive a secure login code."
          ) : (
            "Sign in to access and manage your property portfolio with ease."
          )}
        </p>
      </div>

      {stage === 'credentials' ? (
        <form onSubmit={handleLogin}>
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
              />
            </div>
          </div>

          {!useOtp && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/pm-forgot-password" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600 }}>
                  Forgot?
                </Link>
              </div>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input form-input--with-icon" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="auth-btn auth-btn--primary auth-btn--large" disabled={loading} style={{ marginTop: '16px' }}>
            <span>{loading ? "Please wait..." : (useOtp ? "Send Code" : "Sign in")}</span>
            <ArrowRight size={18} />
          </button>

          <div className="auth-separator"><span>OR CONTINUE WITH</span></div>

          <button 
            type="button" 
            className="auth-btn auth-btn--outline"
            onClick={() => setUseOtp(!useOtp)}
          >
            {useOtp ? (
              <>
                <Lock size={18} />
                <span>Login with password</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Login with verification code</span>
              </>
            )}
          </button>

          <div className="auth-footer" style={{ marginTop: '32px' }}>
            Don't have an account? <Link href="/pm-signup">Create one for free</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit}>
          <div className={`otp-group ${otpLoginMutation.isError ? 'otp-group--error' : ''}`}>
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
              />
            ))}
          </div>

          {otpLoginMutation.isError && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '14px',
                textAlign: 'center',
                marginTop: '-24px',
                marginBottom: '24px',
                fontWeight: 500,
              }}
            >
              {(otpLoginMutation.error as any)?.message || 'Invalid verification code'}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify & Complete'} <ArrowRight size={18} />
          </button>

          <div className="auth-footer">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={() =>
                requestOtpMutation.mutate({
                  email,
                  context: 'LOGIN',
                })
              }
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

          <div className="auth-footer" style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => {
                setStage('credentials')
                setOtp(['', '', '', '', '', ''])
              }}
              style={{
                color: 'var(--text-muted)',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Go Back
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

