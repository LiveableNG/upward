'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { 
  Mail, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { UpwardLogo } from '../../../components/common/UpwardLogo'
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
  const [signupHref, setSignupHref] = useState(Capacitor.isNativePlatform() ? '/signup' : '/pm-signup')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loginMutation = useLogin()
  const requestOtpMutation = useRequestOTP()
  const otpLoginMutation = useOtpLogin()

  const loading = loginMutation.isPending || requestOtpMutation.isPending || otpLoginMutation.isPending

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  useEffect(() => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') return
    const pmType = new URLSearchParams(window.location.search).get('pmType')
    if (!pmType) return
    setSignupHref(`/pm-signup?pmType=${encodeURIComponent(pmType)}`)
  }, [])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!email) {
      nextErrors.email = 'This field is required'
    } else if (!email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      nextErrors.password = 'This field is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    loginMutation.mutate({ email, password })
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!email) {
      nextErrors.email = 'This field is required'
    } else if (!email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
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
      if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
        triggerVerification(newOtp)
      }
      return
    }

    const newOtp = [...otp]
    newOtp[index] = digitsOnly
    setOtp(newOtp)

    if (digitsOnly && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }

    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault()
    if (otpLoginMutation.isError) otpLoginMutation.reset()
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
        <UpwardLogo color="var(--forest)" size={48} />
        <h2 className="auth-card__title" style={{ fontSize: '24px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: 'var(--dark)' }}>
          {otpStage === 'verify' && loginMethod === 'code' ? 'Enter Verification Code' : 'Welcome Back'}
        </h2>
        <p className="auth-card__subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {loginMethod === 'code' && otpStage === 'verify' ? (
            <>
              We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. If you don&apos;t see it after a few minutes, check your Spam or Promotions folder or request a new code.
            </>
          ) : (
            'Sign in to access your properties, tenants, and collections.'
          )}
        </p>
      </div>

      <div className="auth-method-toggle" style={{ marginBottom: '24px' }}>
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
          <span>Email Code</span>
        </button>
      </div>

      {loginMethod === 'password' ? (
        <form onSubmit={handlePasswordLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                className={`form-input form-input--with-icon ${fieldErrors.email ? 'form-input--error' : ''}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  clearFieldError('email')
                  setEmail(e.target.value)
                }}
                required
              />
            </div>
            {fieldErrors.email && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.email}</p>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
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
                className={`form-input form-input--with-icon ${fieldErrors.password ? 'form-input--error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  clearFieldError('password')
                  setPassword(e.target.value)
                }}
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
            {fieldErrors.password && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.password}</p>}
          </div>

          <button 
            type="submit" 
            className="auth-btn auth-btn--primary auth-btn--large" 
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </form>
      ) : otpStage === 'request' ? (
        <form onSubmit={handleRequestOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                className={`form-input form-input--with-icon ${fieldErrors.email ? 'form-input--error' : ''}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  clearFieldError('email')
                  setEmail(e.target.value)
                }}
                required
              />
            </div>
            {fieldErrors.email && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.email}</p>}
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
              We&apos;ll send a 6-digit verification code to your email address.
            </p>
          </div>

          <button 
            type="submit" 
            className="auth-btn auth-btn--primary auth-btn--large" 
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? "Sending Code..." : "Send Verification Code"}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={`otp-group ${otpLoginMutation.isError ? 'otp-group--error' : ''}`} style={{ marginBottom: 0 }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="one-time-code"
                className="otp-input"
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onPaste={(e) => handleOtpPaste(e, i)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digit && i > 0) {
                    document.getElementById(`otp-${i - 1}`)?.focus()
                  }
                }}
              />
            ))}
          </div>

          {otpLoginMutation.isError && (
            <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', margin: 0, fontWeight: 500 }}>
              {(otpLoginMutation.error as any)?.message || 'Invalid verification code'}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary auth-btn--large"
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '13px' }}>
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

      <div className="auth-footer" style={{ marginTop: '28px', textAlign: 'center' }}>
        Don&apos;t have an account? <Link href={signupHref}>Create one for free</Link>
      </div>
    </div>
  )
}
