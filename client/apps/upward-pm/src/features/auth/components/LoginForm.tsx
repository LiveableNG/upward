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
  Building2,

} from 'lucide-react'
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
  const { error: toastError, success: toastSuccess } = useToast()
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
  const [resendCooldown, setResendCooldown] = useState(0)

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

  const isResending = requestOtpMutation.isPending || employeeRequestOtpMutation.isPending
  const isVerifying = otpLoginMutation.isPending || employeeVerifyOtpMutation.isPending || employeeOtpLoginMutation.isPending
  const isLoggingIn = accountType === 'staff' ? employeeLoginMutation.isPending : loginMutation.isPending
  const loading = isLoggingIn || isResending || isVerifying

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

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
    const emailParam = params.get('email')
    if (emailParam) {
      setEmail(emailParam)
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
          setResendCooldown(30)
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
            setResendCooldown(30)
          }
        }
      )
    } else {
      requestOtpMutation.mutate(
        { email, context: 'LOGIN' },
        {
          onSuccess: () => {
            setOtpStage('verify')
            setResendCooldown(30)
          }
        }
      )
    }
  }

  const handleResendOtp = () => {
    if (resendCooldown > 0 || isResending) return
    if (accountType === 'staff') {
      employeeRequestOtpMutation.mutate(
        { email, context: otpContext },
        {
          onSuccess: () => {
            setResendCooldown(30)
            toastSuccess?.('Verification code resent successfully!')
          }
        }
      )
    } else {
      requestOtpMutation.mutate(
        { email, context: 'LOGIN' },
        {
          onSuccess: () => {
            setResendCooldown(30)
            toastSuccess?.('Verification code resent successfully!')
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
      toastError('Please enter a complete 6-digit verification code')
      return
    }
    triggerVerification(otp)
  }

  return (
    <div className="animate-fade-in">
      {/* ── Role Switcher Tabs ── */}
      <div className="role-switch">
        <button
          type="button"
          className={`role-tab ${accountType === 'manager' ? 'active' : ''}`}
          onClick={() => {
            setAccountType('manager')
            setLoginMethod('password')
          }}
        >
          <Building2 size={16} />
          <span>Manager / Owner</span>
        </button>
        <button
          type="button"
          className={`role-tab ${accountType === 'staff' ? 'active' : ''}`}
          onClick={() => {
            setAccountType('staff')
            setLoginMethod('password')
          }}
        >
          <Users size={16} />
          <span>Staff / Employee</span>
        </button>
      </div>

      {/* ── Heading ── */}
      <div className="card-head">
        <h2>
          {otpStage === 'verify'
            ? 'Verify your email'
            : (accountType === 'staff' ? 'Staff Portal Sign In' : 'Welcome back')}
        </h2>
        <p>
          {otpStage === 'verify' ? (
            <>
              Enter the 6-digit verification code sent to <strong>{email}</strong>.
            </>
          ) : accountType === 'staff' ? (
            'Sign in to access your assigned properties and organization workflow.'
          ) : (
            'Sign in to access your properties, tenants and collections.'
          )}
        </p>
      </div>

      {/* ── OTP Verification View ── */}
      {otpStage === 'verify' ? (
        <form onSubmit={handleOtpSubmit} noValidate autoComplete="off">
          <div className={`otp-row ${isCurrentOtpError ? 'otp-row--error' : ''}`}>
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
              />
            ))}
          </div>

          {isCurrentOtpError && (
            <p className="field-error-text" style={{ textAlign: 'center', marginBottom: 12 }}>
              {currentOtpErrorMessage || 'Invalid verification code'}
            </p>
          )}

          <div className="otp-meta">
            <span>
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => {
                  setOtpStage('request')
                  setLoginMethod('password')
                  setOtp(['', '', '', '', '', ''])
                  resetOtpErrors()
                }}
              >
                Change it
              </button>
            </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isResending || isVerifying}
              style={{
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                opacity: resendCooldown > 0 ? 0.6 : 1,
              }}
            >
              {isResending ? 'Sending code...' : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code')}
            </button>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={isVerifying || isResending}
          >
            <span>{isVerifying ? 'Verifying code...' : (otpContext === 'INVITE' ? 'Verify & Continue' : 'Verify & Sign In')}</span>
            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
        </form>
      ) : (
        <>
          {/* ── Method Switcher (Manager Role Only) ── */}
          {accountType === 'manager' && (
            <div className="method-switch">
              <button
                type="button"
                className={`method-btn ${loginMethod === 'password' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('password')
                  setOtpStage('request')
                }}
              >
                <Lock size={14} />
                <span>Password</span>
              </button>
              <button
                type="button"
                className={`method-btn ${loginMethod === 'code' ? 'active' : ''}`}
                onClick={() => setLoginMethod('code')}
              >
                <Mail size={14} />
                <span>Email code</span>
              </button>
            </div>
          )}

          {loginMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin} noValidate autoComplete="off">
              <div className="field">
                <label htmlFor="login-email">Email address</label>
                <div className={`input-shell ${fieldErrors.email ? 'input-shell--error' : ''}`}>
                  <Mail size={17} />
                  <input 
                    id="login-email"
                    type="email" 
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      clearFieldError('email')
                      setEmail(e.target.value)
                    }}
                    required
                    autoComplete="off"
                  />
                  {accountType === 'staff' && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isCheckingEmail ? (
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                      ) : staffCheckResult.checked && staffCheckResult.exists ? (
                        <CheckCircle2 size={16} color="var(--forest-500)" />
                      ) : null}
                    </div>
                  )}
                </div>
                {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}

                {/* Staff Verified Active Status */}
                {accountType === 'staff' && staffCheckResult.checked && staffCheckResult.exists && staffCheckResult.hasPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--forest-700)', fontWeight: 600, marginTop: '8px' }}>
                    <CheckCircle2 size={14} />
                    <span>Verified staff member at {staffCheckResult.employerName}</span>
                  </div>
                )}

                {/* Staff Not Found Callout */}
                {accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists && !isCheckingEmail && (
                  <div
                    style={{
                      background: 'rgba(179, 64, 47, 0.06)',
                      border: '1px solid rgba(179, 64, 47, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <AlertCircle size={16} color="var(--error)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '12.5px', color: 'var(--error)', lineHeight: 1.45 }}>
                      <strong style={{ display: 'block', marginBottom: '2px' }}>No staff invitation found</strong>
                      <span style={{ color: 'var(--ink-soft)' }}>
                        No staff record matches <strong>{email}</strong>. Please ask your Property Manager to invite you.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff: Pending Invitation Card */}
              {accountType === 'staff' && staffCheckResult.checked && staffCheckResult.exists && staffCheckResult.isInvited && staffCheckResult.inviteToken ? (
                <div className="invite-card" role="region" aria-label="Staff invitation details">
                  <div className="invite-card__header">
                    <div className="invite-card__avatar">
                      <Building2 size={18} />
                    </div>
                    <div className="invite-card__org">
                      <span className="invite-card__label">Team Invitation</span>
                      <h3 className="invite-card__title">{staffCheckResult.employerName || 'Your Organization'}</h3>
                    </div>
                    <span className="invite-card__badge">
                      <span className="invite-card__dot" />
                      Pending
                    </span>
                  </div>

                  <div className="invite-card__details">
                    <div className="invite-card__detail-item">
                      <span className="invite-card__detail-label">Assigned Role</span>
                      <span className="invite-card__detail-value">{staffCheckResult.jobTitle || 'Property Officer'}</span>
                    </div>
                    <div className="invite-card__detail-item">
                      <span className="invite-card__detail-label">Workspace Access</span>
                      <span className="invite-card__detail-value">Staff Portal</span>
                    </div>
                  </div>

                  <p className="invite-card__hint">
                    Authenticate your email with a 6-digit verification code to set your password and join your workspace.
                  </p>

                  <button
                    type="button"
                    onClick={handleStaffInviteVerify}
                    disabled={loading}
                    className="primary-btn invite-card__btn"
                  >
                    <span>{employeeRequestOtpMutation.isPending ? 'Sending verification code...' : 'Accept & Set Password'}</span>
                    {employeeRequestOtpMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  </button>
                </div>
              ) : (
                <>
                  <div className="field">
                    <div className="field-row">
                      <label htmlFor="login-pass">Password</label>
                      <Link href={Capacitor.isNativePlatform() ? '/forgot-password' : '/pm-forgot-password'}>
                        Forgot password?
                      </Link>
                    </div>
                    <div className={`input-shell ${fieldErrors.password ? 'input-shell--error' : ''}`}>
                      <Lock size={17} />
                      <input 
                        id="login-pass"
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Enter your password"
                        value={password}
                        disabled={accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists}
                        onChange={(e) => {
                          clearFieldError('password')
                          setPassword(e.target.value)
                        }}
                        required
                        autoComplete="off"
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
                    {fieldErrors.password && <p className="field-error-text">{fieldErrors.password}</p>}
                  </div>

                  <button 
                    type="submit" 
                    className="primary-btn" 
                    disabled={loading || (accountType === 'staff' && staffCheckResult.checked && !staffCheckResult.exists)}
                  >
                    <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} noValidate autoComplete="off">
              <div className="field">
                <label htmlFor="login-otp-email">Email address</label>
                <div className={`input-shell ${fieldErrors.email ? 'input-shell--error' : ''}`}>
                  <Mail size={17} />
                  <input 
                    id="login-otp-email"
                    type="email" 
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      clearFieldError('email')
                      setEmail(e.target.value)
                    }}
                    required
                    autoComplete="off"
                  />
                </div>
                {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px', lineHeight: 1.45 }}>
                  We&apos;ll send a 6-digit verification code to your email address.
                </p>
              </div>

              <button 
                type="submit" 
                className="primary-btn" 
                disabled={loading}
              >
                <span>{loading ? 'Sending code...' : 'Send verification code'}</span>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </>
      )}

      {/* ── Footer ── */}
      <div className="foot-note">
        {accountType === 'staff' ? (
          <>
            Invited by your organization?{' '}
            <span style={{ color: 'var(--forest-700)', fontWeight: 600 }}>Check your inbox for your activation link</span>
          </>
        ) : (
          <>
            Don&apos;t have an account? <Link href={signupHref}>Create one for free</Link>
          </>
        )}
      </div>
    </div>
  )
}
