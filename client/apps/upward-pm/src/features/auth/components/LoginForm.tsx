'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { 
  Mail, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Users,
  Building2
} from 'lucide-react'
import { UpwardLogo } from '../../../components/common/UpwardLogo'
import { useLogin, useEmployeeLogin } from '../hooks/useLogin'
import { 
  useRequestOTP, 
  useOtpLogin, 
  useEmployeeRequestOTP, 
  useEmployeeVerifyOTP, 
  useEmployeeOtpLogin 
} from '../hooks/useOtp'
import { useToast } from '@/components/common/Toast'
import { checkEmployeeEmail } from '../services/authService'

export const LoginForm = () => {
  const { error: toastError } = useToast()
  const [accountType, setAccountType] = useState<'manager' | 'staff'>('manager')
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password')
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request')
  const [otpContext, setOtpContext] = useState<'LOGIN' | 'INVITE'>('LOGIN')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [signupHref, setSignupHref] = useState(Capacitor.isNativePlatform() ? '/signup' : '/pm-signup')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Silent search state for employee login
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [staffCheckResult, setStaffCheckResult] = useState<{
    checked: boolean;
    exists: boolean;
    isInvited?: boolean;
    hasPassword?: boolean;
    inviteToken?: string;
    employerName?: string;
    jobTitle?: string;
  }>({ checked: false, exists: false })
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const loginMutation = useLogin()
  const employeeLoginMutation = useEmployeeLogin()
  const requestOtpMutation = useRequestOTP()
  const otpLoginMutation = useOtpLogin()
  const employeeRequestOtpMutation = useEmployeeRequestOTP()
  const employeeVerifyOtpMutation = useEmployeeVerifyOTP()
  const employeeOtpLoginMutation = useEmployeeOtpLogin()

  const isCurrentOtpError = accountType === 'staff'
    ? (otpContext === 'INVITE' ? employeeVerifyOtpMutation.isError : employeeOtpLoginMutation.isError)
    : otpLoginMutation.isError

  const currentOtpErrorMessage = accountType === 'staff'
    ? (otpContext === 'INVITE' ? (employeeVerifyOtpMutation.error as any)?.message : (employeeOtpLoginMutation.error as any)?.message)
    : (otpLoginMutation.error as any)?.message

  const loading =
    (accountType === 'staff' ? employeeLoginMutation.isPending : loginMutation.isPending) ||
    requestOtpMutation.isPending ||
    otpLoginMutation.isPending ||
    employeeRequestOtpMutation.isPending ||
    employeeVerifyOtpMutation.isPending ||
    employeeOtpLoginMutation.isPending

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
    const params = new URLSearchParams(window.location.search)
    const roleParam = params.get('role')
    if (roleParam === 'staff' || roleParam === 'employee') {
      setAccountType('staff')
    }
    const pmType = params.get('pmType')
    if (!pmType) return
    setSignupHref(`/pm-signup?pmType=${encodeURIComponent(pmType)}`)
  }, [])

  // Silent email checking for staff logins
  useEffect(() => {
    setStaffCheckResult({ checked: false, exists: false })
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)

    if (accountType === 'staff' && email && email.includes('@') && email.length > 5) {
      setIsCheckingEmail(true)
      emailCheckTimeout.current = setTimeout(async () => {
        try {
          const res = await checkEmployeeEmail(email.trim())
          setStaffCheckResult({
            checked: true,
            exists: res.exists,
            isInvited: res.isInvited,
            hasPassword: res.hasPassword,
            inviteToken: res.inviteToken,
            employerName: res.employerName,
            jobTitle: res.jobTitle,
          })
        } catch (err) {
          console.error('Staff email check failed', err)
        } finally {
          setIsCheckingEmail(false)
        }
      }, 500)
    } else {
      setIsCheckingEmail(false)
    }

    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    }
  }, [email, accountType])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!email) {
      nextErrors.email = 'This field is required'
    } else if (!email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists) {
      nextErrors.email = 'No staff invitation found for this email address'
    }

    if (!password && (!staffCheckResult.isInvited || accountType !== 'staff')) {
      nextErrors.password = 'This field is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    if (accountType === 'staff') {
      employeeLoginMutation.mutate({ email, password })
    } else {
      loginMutation.mutate({ email, password })
    }
  }

  const handleStaffInviteVerify = () => {
    setOtpContext('INVITE')
    employeeRequestOtpMutation.mutate(
      { email, context: 'INVITE' },
      {
        onSuccess: () => {
          setOtpStage('verify')
          setOtp(['', '', '', '', '', ''])
        }
      }
    )
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
    setOtpContext('LOGIN')

    if (accountType === 'staff') {
      employeeRequestOtpMutation.mutate(
        { email, context: 'LOGIN' },
        {
          onSuccess: () => {
            setOtpStage('verify')
          }
        }
      )
    } else {
      requestOtpMutation.mutate(
        { email, context: 'LOGIN' },
        {
          onSuccess: () => {
            setOtpStage('verify')
          }
        }
      )
    }
  }

  const resetOtpErrors = () => {
    if (otpLoginMutation.isError) otpLoginMutation.reset()
    if (employeeVerifyOtpMutation.isError) employeeVerifyOtpMutation.reset()
    if (employeeOtpLoginMutation.isError) employeeOtpLoginMutation.reset()
  }

  const handleOtpChange = (index: number, value: string) => {
    resetOtpErrors()
    
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
    resetOtpErrors()
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

    if (accountType === 'staff') {
      if (otpContext === 'INVITE') {
        employeeVerifyOtpMutation.mutate(
          { email, otp: otpCode, context: 'INVITE' },
          {
            onSuccess: (res) => {
              const token = res?.inviteToken || staffCheckResult.inviteToken
              if (token) {
                window.location.href = `/invite/${token}`
              } else {
                window.location.href = '/dashboard'
              }
            }
          }
        )
      } else {
        employeeOtpLoginMutation.mutate(
          { email, otp: otpCode },
          {
            onSuccess: () => {
              window.location.href = '/dashboard'
            }
          }
        )
      }
    } else {
      otpLoginMutation.mutate(
        { email, otp: otpCode },
        {
          onSuccess: () => {
            window.location.href = '/dashboard'
          }
        }
      )
    }
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
      {/* Account Role Selector (Manager vs Staff) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          background: 'var(--bg-elevated, #F4F4F6)', 
          padding: '4px', 
          borderRadius: '14px', 
          marginBottom: '20px' 
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAccountType('manager')
            setLoginMethod('password')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: accountType === 'manager' ? '#FFFFFF' : 'transparent',
            color: accountType === 'manager' ? 'var(--dark)' : 'var(--text-secondary)',
            boxShadow: accountType === 'manager' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Building2 size={15} />
          <span>Manager / Owner</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAccountType('staff')
            setLoginMethod('password')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: accountType === 'staff' ? '#FFFFFF' : 'transparent',
            color: accountType === 'staff' ? 'var(--dark)' : 'var(--text-secondary)',
            boxShadow: accountType === 'staff' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Users size={15} />
          <span>Staff / Employee</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
        <UpwardLogo color="var(--forest)" size={48} />
        <h2 className="auth-card__title" style={{ fontSize: '24px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: 'var(--dark)' }}>
          {otpStage === 'verify'
            ? 'Enter Verification Code'
            : (accountType === 'staff' ? 'Staff Portal Login' : 'Welcome Back')}
        </h2>
        <p className="auth-card__subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {otpStage === 'verify' ? (
            <>
              We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. {otpContext === 'INVITE' ? 'Enter the code to verify your invitation and set up your password.' : 'Enter the code to access your portal.'}
            </>
          ) : accountType === 'staff' ? (
            'Sign in to access your assigned properties and organization workflow.'
          ) : (
            'Sign in to access your properties, tenants, and collections.'
          )}
        </p>
      </div>

      {accountType === 'manager' && (
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
      )}

      {otpStage === 'verify' ? (
        <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={`otp-group ${isCurrentOtpError ? 'otp-group--error' : ''}`} style={{ marginBottom: 0 }}>
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

          {isCurrentOtpError && (
            <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', margin: 0, fontWeight: 500 }}>
              {currentOtpErrorMessage || 'Invalid verification code'}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary auth-btn--large"
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? 'Verifying...' : (otpContext === 'INVITE' ? 'Verify & Continue' : 'Verify & Sign In')}</span>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '13px' }}>
            <button
              type="button"
              onClick={() => {
                setOtpStage('request')
                setLoginMethod('password')
                setOtp(['', '', '', '', '', ''])
                resetOtpErrors()
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
            >
              Back to Login
            </button>
            <button
              type="button"
              onClick={() => {
                if (accountType === 'staff') {
                  employeeRequestOtpMutation.mutate({ email, context: otpContext })
                } else {
                  requestOtpMutation.mutate({ email, context: 'LOGIN' })
                }
              }}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 700 }}
            >
              Resend Code
            </button>
          </div>
        </form>
      ) : loginMethod === 'password' ? (
        <form onSubmit={handlePasswordLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
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
              {accountType === 'staff' && (
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                  {isCheckingEmail ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  ) : staffCheckResult.checked && staffCheckResult.exists ? (
                    <CheckCircle2 size={16} color="var(--forest)" />
                  ) : null}
                </div>
              )}
            </div>
            {fieldErrors.email && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.email}</p>}

            {/* Staff: Validated Account Status Notice */}
            {accountType === 'staff' && staffCheckResult.checked && staffCheckResult.exists && staffCheckResult.hasPassword && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--forest)', fontWeight: 600, marginTop: '8px' }}>
                <CheckCircle2 size={14} />
                <span>Verified staff member at {staffCheckResult.employerName}</span>
              </div>
            )}

            {/* Staff: Not Found Warning Callout */}
            {accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists && !isCheckingEmail && (
              <div
                className="animate-fade-in"
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <AlertCircle size={16} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#b91c1c', lineHeight: 1.45 }}>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>No staff invitation found</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    No staff record matches <strong>{email}</strong>. Please ask your Property Manager to invite you.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Staff: Pending Invitation Card */}
          {accountType === 'staff' && staffCheckResult.checked && staffCheckResult.exists && staffCheckResult.isInvited && staffCheckResult.inviteToken ? (
            <div
              className="animate-fade-in"
              style={{
                background: 'rgba(22, 101, 52, 0.05)',
                border: '1.5px solid rgba(22, 101, 52, 0.22)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 4px 16px rgba(22, 101, 52, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
                <Sparkles size={18} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Pending Invitation Found
                </span>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--dark)' }}>
                  Welcome to {staffCheckResult.employerName}!
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  You have been invited as <strong>{staffCheckResult.jobTitle || 'Property Officer'}</strong>. Please complete your verification and choose your password to activate your account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStaffInviteVerify}
                disabled={loading}
                className="auth-btn auth-btn--primary auth-btn--large"
                style={{
                  textDecoration: 'none',
                  justifyContent: 'center',
                  gap: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>{employeeRequestOtpMutation.isPending ? "Sending Code..." : "Verify & Set Password"}</span>
                {employeeRequestOtpMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
          ) : (
            <>
              {/* Password input & submit button (Only shown when not pending activation) */}
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
                    disabled={accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists}
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
                disabled={loading || (accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists)}
                style={{ marginTop: '10px' }}
              >
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </>
          )}
        </form>
      ) : (
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
      )}

      <div className="auth-footer" style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {accountType === 'staff' ? (
          <>
            Invited by your organization?{' '}
            <span style={{ color: 'var(--forest)', fontWeight: 600 }}>Check your inbox for your activation link</span>
          </>
        ) : (
          <>
            Don&apos;t have an account? <Link href={signupHref} style={{ color: 'var(--forest)', fontWeight: 700 }}>Create one for free</Link>
          </>
        )}
      </div>
    </div>
  )
}
