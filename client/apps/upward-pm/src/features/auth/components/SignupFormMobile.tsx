'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Lock,
  ChevronLeft,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Loader2,
  AlertCircle,
  Phone as PhoneIcon,
  MapPin,
  Users,
  Building,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useSignup } from '../hooks/useSignup'
import { useRequestOTP, useVerifyOTP, useOtpLogin } from '../hooks/useOtp'
import { checkEmail } from '../services/authService'
import { Capacitor } from '@capacitor/core'
import '@/styles/auth.css'
import '@/styles/mobile-auth.css'

type RequestOtpResult = { context: 'SIGNUP' | 'LOGIN' }
type OtpLoginResult = { user?: { pmType?: string } }
type VerifyOtpResult = { success: boolean }

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export const SignupFormMobile = () => {
  const router = useRouter()
  const [step, setStep] = useState(1) // Steps 1 to 4, Step 5 is OTP, Step 6 is Success
  const [stage, setStage] = useState<'info' | 'otp' | 'success'>('info')
  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP')

  const [formData, setFormData] = useState({
    companyName: '',
    country: 'Nigeria',
    email: '',
    phone: '',
    tenantsNumber: '',
    pmType: '',
    password: '',
    confirmPassword: '',
  })

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [stepError, setStepError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const signupMutation = useSignup()
  const requestOtpMutation = useRequestOTP()
  const verifyOtpMutation = useVerifyOTP()
  const otpLoginMutation = useOtpLogin()

  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setEmailExists(false)
    if (formData.email && formData.email.includes('@') && formData.email.length > 5) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(formData.email)
          setEmailExists(res.exists && !res.isInvited)
          setIsInvited(res.isInvited || false)

          if (res.isInvited && res.inviteToken) {
            setTimeout(() => {
              router.push(`/invite/${res.inviteToken}`)
            }, 1500)
          }
        } catch (err) {
          console.error('Email check failed', err)
        } finally {
          setIsCheckingEmail(false)
        }
      }, 800)
    }
    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    }
  }, [formData.email, router])

  const loading =
    signupMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    otpLoginMutation.isPending

  const handleNextStep = async () => {
    setStepError('')

    if (step === 1) {
      if (!formData.companyName.trim()) {
        setStepError('Please enter company name')
        return
      }
      if (!formData.country) {
        setStepError('Please select country')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setStepError('Please enter a valid company email')
        return
      }
      if (emailExists) {
        setStepError('This email is already registered.')
        return
      }
      if (!formData.phone.trim()) {
        setStepError('Please enter phone number')
        return
      }
      setStep(3)
    } else if (step === 3) {
      if (!formData.pmType) {
        setStepError('Please select account type')
        return
      }
      if (!formData.tenantsNumber) {
        setStepError('Please select number of tenants')
        return
      }
      setStep(4)
    } else if (step === 4) {
      if (formData.password.length < 8) {
        setStepError('Password must be at least 8 characters')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setStepError('Passwords do not match')
        return
      }

      requestOtpMutation.mutate(
        {
          email: formData.email,
          context: 'SIGNUP',
        },
        {
          onSuccess: (data: RequestOtpResult) => {
            setEffectiveContext(data.context)
            setStage('otp')
            setStep(5)
          },
          onError: (err) => {
            setStepError(getErrorMessage(err, 'Failed to request verification code.'))
          }
        },
      )
    }
  }

  const handlePrevStep = () => {
    setStepError('')
    if (step > 1) {
      setStep(step - 1)
      if (step === 5) {
        setStage('info')
        setStep(4)
      }
    } else {
      router.push('/welcome')
    }
  }

  const triggerVerification = (otpArray: string[]) => {
    const otpCode = otpArray.join('')
    if (otpCode.length !== 6) return

    if (effectiveContext === 'LOGIN') {
      otpLoginMutation.mutate(
        { email: formData.email, otp: otpCode },
        {
          onSuccess: (res: OtpLoginResult) => {
            if (res.user?.pmType === 'INDIVIDUAL_LANDLORD') {
              window.location.href = '/portal'
            } else {
              window.location.href = '/dashboard'
            }
          },
        },
      )
    } else {
      verifyOtpMutation.mutate(
        {
          email: formData.email,
          otp: otpCode,
          context: 'SIGNUP',
        },
        {
          onSuccess: (res: VerifyOtpResult) => {
            if (res.success) {
              const nameParts = formData.companyName.trim().split(/\s+/)
              const firstName = nameParts[0] || 'Company'
              const lastName = nameParts.slice(1).join(' ') || 'Manager'

              let formattedPhone = formData.phone.replace(/[^\d+]/g, '').trim()
              const dialCode = formData.country === 'Kenya' ? '+254' : '+234'
              if (!formattedPhone.startsWith('+')) {
                if (formattedPhone.startsWith('0')) {
                  formattedPhone = formattedPhone.substring(1)
                }
                formattedPhone = dialCode + formattedPhone
              }

              const signupPayload = {
                email: formData.email,
                password: formData.password,
                firstName,
                lastName,
                businessName: formData.companyName,
                pmType: formData.pmType,
                phone: formattedPhone,
                country: formData.country,
              }

              signupMutation.mutate(signupPayload, {
                onSuccess: () => {
                  setStage('success')
                  setStep(6)
                },
              })
            }
          },
        },
      )
    }
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerVerification(otp)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (verifyOtpMutation.isError) verifyOtpMutation.reset()
    if (otpLoginMutation.isError) otpLoginMutation.reset()

    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }

    if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  if (step === 6 || stage === 'success') {
    return (
      <div className="mobile-auth">
        <div className="mobile-auth__container" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <CheckCircle2 size={64} color="var(--forest)" style={{ margin: '0 auto 24px' }} />
          <h2 className="mobile-auth__title" style={{ marginBottom: 12 }}>
            Account Created!
          </h2>
          <p className="mobile-auth__subtitle" style={{ marginBottom: 32 }}>
            Your property manager account has been successfully created.
          </p>
          <button
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            className="auth-btn auth-btn--primary"
          >
            Go to Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  const getStepProgress = () => {
    if (step <= 4) return (step / 4) * 100
    if (step === 5) return 100
    return 0
  }

  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  return (
    <div className="mobile-auth">
      <div className="mobile-auth__container">
        
        {/* Header Block */}
        <div className="mobile-auth__header">
          <div className="mobile-auth__logo-row">
            {(step > 1 || isNative) ? (
              <button type="button" className="mobile-auth__back-btn" onClick={handlePrevStep}>
                <ChevronLeft size={20} /> Back
              </button>
            ) : (
              <div />
            )}
            
            {isNative ? (
              <UpwardLogo size={32} color="var(--forest)" />
            ) : (
              <a href={process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}>
                <UpwardLogo size={32} color="var(--forest)" />
              </a>
            )}
          </div>

          {step <= 5 && (
            <div className="mobile-auth__progress-container">
              <div className="mobile-auth__progress-track">
                <div 
                  className="mobile-auth__progress-bar" 
                  style={{ width: `${getStepProgress()}%` }} 
                />
              </div>
              <span className="mobile-auth__progress-text">
                {step <= 4 ? `Step ${step} of 4` : 'Verification'}
              </span>
            </div>
          )}

          {step === 1 && (
            <>
              <h1 className="mobile-auth__title">Company Profile</h1>
              <p className="mobile-auth__subtitle">Let&apos;s start with your company name and location.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="mobile-auth__title">Contact Details</h1>
              <p className="mobile-auth__subtitle">How can we reach you and verify your identity?</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="mobile-auth__title">Management Info</h1>
              <p className="mobile-auth__subtitle">Specify your management style and portfolio size.</p>
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="mobile-auth__title">Security Setup</h1>
              <p className="mobile-auth__subtitle">Create a password to keep your dashboard secure.</p>
            </>
          )}
          {step === 5 && (
            <>
              <h1 className="mobile-auth__title">Verify your email</h1>
              <p className="mobile-auth__subtitle">
                We sent a code to <strong>{formData.email}</strong>.
              </p>
            </>
          )}
        </div>

        {/* Form Body */}
        {step <= 4 ? (
          <div className="mobile-auth__form">
            {step === 1 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <div className="input-wrapper">
                    <Building size={18} className="input-icon" />
                    <input
                      type="text"
                      className="form-input form-input--with-icon"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Country</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName="form-input--with-icon"
                      value={formData.country}
                      onChange={(val) =>
                        setFormData({ ...formData, country: val })
                      }
                      options={[
                        { label: 'Nigeria', value: 'Nigeria' },
                        { label: 'Kenya', value: 'Kenya' }
                      ]}
                      placeholder="Select country"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Company Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      className={`form-input form-input--with-icon ${emailExists ? 'form-input--error' : ''}`}
                      placeholder="example@company.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                    {isCheckingEmail && (
                      <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    )}
                  </div>
                  {emailExists && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#ef4444', fontSize: '13px' }}>
                      <AlertCircle size={14} />
                      <span>Email already registered. <Link href="/login" style={{ textDecoration: 'underline', fontWeight: 700, color: 'var(--forest)' }}>Log in</Link></span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Company Phone Number</label>
                  <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                    <div
                      className="form-input"
                      style={{
                        width: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '0 8px',
                        flexShrink: 0,
                      }}
                    >
                      <PhoneIcon size={16} className="text-muted" />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {formData.country === 'Kenya' ? '+254' : '+234'}
                      </span>
                    </div>
                    <input
                      type="tel"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder={formData.country === 'Kenya' ? '712 345 678' : '908 155 2162'}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <div className="input-wrapper">
                    <Briefcase size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName="form-input--with-icon"
                      value={formData.pmType}
                      onChange={(val) =>
                        setFormData({ ...formData, pmType: val })
                      }
                      options={[
                        { label: 'Caretaker', value: 'Caretaker' },
                        { label: 'Lawyer', value: 'Lawyer' },
                        { label: 'Estate Agent', value: 'Estate Agent' },
                        { label: 'Property Manager', value: 'Property Manager' },
                        { label: 'Property Management Company', value: 'Company' }
                      ]}
                      placeholder="Select account type"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of tenants under management</label>
                  <div className="input-wrapper">
                    <Users size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName="form-input--with-icon"
                      value={formData.tenantsNumber}
                      onChange={(val) =>
                        setFormData({ ...formData, tenantsNumber: val })
                      }
                      options={[
                        { label: 'Less than 50', value: 'Less than 50' },
                        { label: '51-100', value: '51-100' },
                        { label: '101-250', value: '101-250' },
                        { label: '251-500', value: '251-500' },
                        { label: 'Greater than 500', value: 'Greater than 500' }
                      ]}
                      placeholder="Select an option"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Create Password</label>
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input form-input--with-icon"
                      placeholder="•••••••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
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
                        color: 'var(--forest)',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Show {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                      placeholder="•••••••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
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
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Show {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stepError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13.5px', marginTop: '4px', fontWeight: 500 }}>
                <AlertCircle size={16} />
                <span>{stepError}</span>
              </div>
            )}

            <button
              type="button"
              className="auth-btn auth-btn--primary auth-btn--large"
              onClick={handleNextStep}
              disabled={loading || (step === 2 && emailExists) || isCheckingEmail}
              style={{ marginTop: 'auto' }}
            >
              <span>{loading ? 'Please wait...' : 'Continue'}</span>
              <ArrowRight size={18} />
            </button>

            {step === 1 && (
              <>
                <div className="auth-separator"><span>OR</span></div>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button type="button" className="auth-btn auth-btn--outline" style={{ width: '100%' }}>
                    <span>Have an account? <strong>Log in</strong></span>
                  </button>
                </Link>
              </>
            )}
          </div>
        ) : (
          /* OTP Form */
          <form onSubmit={handleOtpSubmit} className="mobile-auth__form">
            <div className={`otp-group ${(verifyOtpMutation.isError || otpLoginMutation.isError) ? 'otp-group--error' : ''}`}>
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

            {(verifyOtpMutation.isError || otpLoginMutation.isError) && (
              <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginTop: '-12px', fontWeight: 500 }}>
                {getErrorMessage(verifyOtpMutation.error, '') ||
                  getErrorMessage(otpLoginMutation.error, 'Invalid verification code')}
              </p>
            )}

            <button 
              type="submit" 
              className="auth-btn auth-btn--primary" 
              disabled={loading}
              style={{ marginTop: 'auto' }}
            >
              {loading ? 'Verifying...' : 'Verify & Complete'} <ArrowRight size={18} />
            </button>

            <div className="auth-footer" style={{ marginTop: '16px' }}>
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={() =>
                  requestOtpMutation.mutate({
                    email: formData.email,
                    context: 'SIGNUP',
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
          </form>
        )}

      </div>
    </div>
  )
}
