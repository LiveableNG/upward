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

  const loginMutation = useLogin()
  const requestOtpMutation = useRequestOTP()
  const otpLoginMutation = useOtpLogin()

  const loading = loginMutation.isPending || requestOtpMutation.isPending || otpLoginMutation.isPending

  useEffect(() => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') return
    const pmType = new URLSearchParams(window.location.search).get('pmType')
    if (!pmType) return
    setSignupHref(`/pm-signup?pmType=${encodeURIComponent(pmType)}`)
  }, [])

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
        <UpwardLogo color="var(--forest)" size={48} />
        <h2 className="auth-card__title" style={{ fontSize: '24px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: 'var(--dark)' }}>
          {otpStage === 'verify' && loginMethod === 'code' ? 'Enter Verification Code' : 'Welcome Back'}
        </h2>
        <p className="auth-card__subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {loginMethod === 'code' && otpStage === 'verify' ? (
            <>
              Code sent to <strong>{email}</strong>. Check your inbox & spam.
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
          <span>Verification Code</span>
        </button>
      </div>

      {loginMethod === 'password' ? (
        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
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
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </form>
      ) : otpStage === 'request' ? (
        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
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
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
              We&apos;ll send a 6-digit verification code to your email address — no password needed.
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
