'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { 
  Mail, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  User,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { useRequestOTP, useOtpLogin } from '../hooks/useOtp'
import { useToast } from '@/components/common/Toast'

export const LoginForm = () => {
  const { error: toastError } = useToast()
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password')
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const loginMutation = useLogin()
  const requestOtpMutation = useRequestOTP()
  const otpLoginMutation = useOtpLogin()

  const loading = loginMutation.isPending || requestOtpMutation.isPending || otpLoginMutation.isPending

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toastError("Please enter your email address")
      return
    }
    if (!password) {
      toastError("Please enter your password")
      return
    }
    loginMutation.mutate({ email, password })
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toastError("Please enter your email address")
      return
    }
    requestOtpMutation.mutate(
      { email, context: 'LOGIN' },
      {
        onSuccess: () => {
          setOtpStage('verify')
        }
      }
    )
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
        onSuccess: () => {
          window.location.href = '/dashboard'
        }
      }
    )
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toastError("Please enter a complete 6-digit verification code")
      return
    }
    triggerVerification(otp)
  }

  return (
    <div className="animate-fade-in">
      {/* Role Switcher Tabs - Hidden for now
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
          <span>Landlord Portal</span>
        </Link>
      </div>
      */}

      {/* Header */}
      <div className="auth-header">
        <h2 className="auth-card__title">
          {otpStage === 'verify' && loginMethod === 'code' ? 'Enter Verification Code' : 'Welcome Back'}
        </h2>
        <p className="auth-card__subtitle">
          {loginMethod === 'code' && otpStage === 'verify' ? (
            <>
              Code sent to <strong>{email}</strong>. Check your inbox & spam.
            </>
          ) : (
            'Sign in to access your properties, tenants, and collections.'
          )}
        </p>
      </div>

      {/* Sign-In Method Switcher Tabs */}
      <div className="auth-method-toggle">
        <button
          type="button"
          className={`auth-method-toggle__option ${loginMethod === 'password' ? 'is-active' : ''}`}
          onClick={() => {
            setLoginMethod('password')
            setOtpStage('request')
          }}
        >
          <Lock size={15} />
          <span>Password</span>
        </button>
        <button
          type="button"
          className={`auth-method-toggle__option ${loginMethod === 'code' ? 'is-active' : ''}`}
          onClick={() => setLoginMethod('code')}
        >
          <ShieldCheck size={15} />
          <span>Verification Code</span>
        </button>
      </div>

      {/* Forms */}
      {loginMethod === 'password' ? (
        <form onSubmit={handlePasswordLogin}>
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

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href={Capacitor.isNativePlatform() ? '/forgot-password' : '/pm-forgot-password'} style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600 }}>
                Forgot Password?
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
                required
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
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn auth-btn--primary auth-btn--large" 
            disabled={loading}
            style={{ marginTop: '24px' }}
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </form>
      ) : otpStage === 'request' ? (
        <form onSubmit={handleRequestOtp}>
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
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
              We'll send a 6-digit verification code to your email address — no password needed.
            </p>
          </div>

          <button 
            type="submit" 
            className="auth-btn auth-btn--primary auth-btn--large" 
            disabled={loading}
            style={{ marginTop: '24px' }}
          >
            <span>{loading ? "Sending Code..." : "Send Verification Code"}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
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
            <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginTop: '-12px', marginBottom: '16px', fontWeight: 500 }}>
              {(otpLoginMutation.error as any)?.message || 'Invalid verification code'}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary auth-btn--large"
            disabled={loading}
          >
            <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '13px' }}>
            <button
              type="button"
              onClick={() => {
                setOtpStage('request')
                setOtp(['', '', '', '', '', ''])
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={() => requestOtpMutation.mutate({ email, context: 'LOGIN' })}
              disabled={requestOtpMutation.isPending}
              style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 700 }}
            >
              Resend Code
            </button>
          </div>
        </form>
      )}

      {/* Footer */}
      <div className="auth-footer" style={{ marginTop: '28px' }}>
        Don't have an account? <Link href={Capacitor.isNativePlatform() ? '/signup' : '/pm-signup'}>Create one for free</Link>
      </div>
    </div>
  )
}


