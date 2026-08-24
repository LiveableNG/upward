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
  User,
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useToast } from '@/components/common/Toast'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useSignup } from '../hooks/useSignup'
import { useRequestOTP, useVerifyOTP, useOtpLogin } from '../hooks/useOtp'
import { checkEmail } from '../services/authService'
import { Capacitor } from '@capacitor/core'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js'
import '@/styles/auth.css'
import '@/styles/mobile-auth.css'

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const ALL_COUNTRIES = getCountries().map(country => {
  const code = getCountryCallingCode(country)
  const name = regionNames.of(country) || country
  return {
    label: `${name} (+${code})`,
    shortLabel: `+${code}`,
    value: name,
    code: country
  }
}).sort((a, b) => a.label.localeCompare(b.label))

type RequestOtpResult = { context: 'SIGNUP' | 'LOGIN' }
type OtpLoginResult = { user?: { pmType?: string } }
type VerifyOtpResult = { success: boolean }

const PM_TYPE_OPTIONS = [
  { label: 'Landlord', value: 'INDIVIDUAL_LANDLORD' },
  { label: 'Independent Property Manager', value: 'Property Manager' },
  { label: 'Property Management Company', value: 'Company' },
  { label: 'Estate Agent', value: 'Estate Agent' },
  { label: 'Caretaker', value: 'Caretaker' },
  { label: 'Lawyer', value: 'Lawyer' },
]

function resolvePmTypePrefill(raw: string | null): string {
  if (!raw) return ''
  const value = raw.trim().toLowerCase()
  if (value === 'landlord' || value === 'individual_landlord' || value === 'individual-landlord') {
    return 'INDIVIDUAL_LANDLORD'
  }
  return ''
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export const SignupFormMobile = () => {
  const router = useRouter()
  const { error: toastError } = useToast()
  const [step, setStep] = useState(1) // Steps 1 to 3, Step 4 is OTP, Step 5 is Success
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
    fullName: '',
  })

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [stepError, setStepError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState('Nigeria')

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
              router.push(`/invite/view?uuid=${res.inviteToken}`)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefillPmType = resolvePmTypePrefill(new URLSearchParams(window.location.search).get('pmType'))
    if (!prefillPmType) return

    setFormData((current) => {
      if (current.pmType) return current
      return {
        ...current,
        pmType: prefillPmType,
      }
    })
  }, [])

  const loading =
    signupMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    otpLoginMutation.isPending

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleNextStep = async () => {
    setStepError('')

    const nextErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.companyName.trim()) nextErrors.companyName = 'This field is required'
      if (!formData.country) nextErrors.country = 'This field is required'
      if (!formData.pmType) nextErrors.pmType = 'This field is required'
      if (!formData.tenantsNumber) nextErrors.tenantsNumber = 'This field is required'
    } else if (step === 2) {
      if (!formData.fullName.trim()) {
        nextErrors.fullName = 'This field is required'
      }
      if (!formData.email.trim()) {
        nextErrors.email = 'This field is required'
      } else if (!formData.email.includes('@')) {
        nextErrors.email = 'Please enter a valid company email'
      } else if (emailExists) {
        nextErrors.email = 'This email is already registered.'
      }
      if (!formData.phone.trim()) nextErrors.phone = 'This field is required'
    } else if (step === 3) {
      if (!formData.password.trim()) {
        nextErrors.password = 'This field is required'
      } else if (formData.password.length < 8) {
        nextErrors.password = 'Password must be at least 8 characters'
      }
      if (!formData.confirmPassword.trim()) {
        nextErrors.confirmPassword = 'This field is required'
      } else if (formData.password !== formData.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match'
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toastError('Please fill in the highlighted fields before continuing.', 'Missing required fields')
      return
    }

    setFieldErrors({})

    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      requestOtpMutation.mutate(
        {
          email: formData.email,
          context: 'SIGNUP',
        },
        {
          onSuccess: (data: RequestOtpResult) => {
            setEffectiveContext(data.context)
            setStage('otp')
            setStep(4)
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
      if (step === 4) {
        setStage('info')
        setStep(3)
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
              let formattedPhone = formData.phone.replace(/[^\d+]/g, '').trim()
              const dialCodeOption = ALL_COUNTRIES.find(c => c.value === phoneCountryCode)
              const dialCode = dialCodeOption ? `+${getCountryCallingCode(dialCodeOption.code)}` : '+234'
              if (!formattedPhone.startsWith('+')) {
                if (formattedPhone.startsWith('0')) {
                  formattedPhone = formattedPhone.substring(1)
                }
                formattedPhone = dialCode + formattedPhone
              }

              const nameParts = formData.fullName.trim().split(/\s+/)
              const firstName = nameParts[0]
              const lastName = nameParts.slice(1).join(' ') || ' '

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
                  setStep(5)
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
      if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
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

    if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault()
    if (verifyOtpMutation.isError) verifyOtpMutation.reset()
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

    if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  if (step === 5 || stage === 'success') {
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
    if (step <= 3) return (step / 3) * 100
    if (step === 4) return 100
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
              <a href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}/for-pm`}>
                <UpwardLogo size={32} color="var(--forest)" />
              </a>
            )}
          </div>

          {step <= 4 && (
            <div className="mobile-auth__progress-container">
              <div className="mobile-auth__progress-track">
                <div 
                  className="mobile-auth__progress-bar" 
                  style={{ width: `${getStepProgress()}%` }} 
                />
              </div>
              <span className="mobile-auth__progress-text">
                {step <= 3 ? `Step ${step} of 3` : 'Verification'}
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
              <h1 className="mobile-auth__title">Individual Profile</h1>
              <p className="mobile-auth__subtitle">Specify contact details of the user registering the company.</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="mobile-auth__title">Security Setup</h1>
              <p className="mobile-auth__subtitle">Create a password to keep your dashboard secure.</p>
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="mobile-auth__title">Verify your email</h1>
              <p className="mobile-auth__subtitle">
                We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>. If you don&apos;t see it after a few minutes, check your Spam or Promotions folder or request a new code.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStage('info')
                    setStep(2)
                    setOtp(['', '', '', '', '', ''])
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--forest)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 'inherit'
                  }}
                >
                  Change email?
                </button>
              </p>
            </>
          )}
        </div>

        {/* Form Body */}
        {step <= 3 ? (
          <div className="mobile-auth__form">
            {step === 1 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <div className="input-wrapper">
                    <Building size={18} className="input-icon" />
                    <input
                      type="text"
                      className={`form-input form-input--with-icon ${fieldErrors.companyName ? 'form-input--error' : ''}`}
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) => {
                        clearFieldError('companyName')
                        setFormData({ ...formData, companyName: e.target.value })
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.companyName && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.companyName}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Country</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName={`form-input--with-icon ${fieldErrors.country ? 'form-input--error' : ''}`}
                      triggerStyle={{ borderColor: fieldErrors.country ? 'var(--error)' : undefined, boxShadow: fieldErrors.country ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined }}
                      value={formData.country}
                      onChange={(val) => {
                        clearFieldError('country')
                        setFormData({ ...formData, country: val })
                      }}
                      options={[
                        { label: 'Nigeria', value: 'Nigeria' },
                        { label: 'Kenya', value: 'Kenya' }
                      ]}
                      placeholder="Select country"
                    />
                  </div>
                  {fieldErrors.country && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.country}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Business or role type</label>
                  <div className="input-wrapper">
                    <Briefcase size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName={`form-input--with-icon ${fieldErrors.pmType ? 'form-input--error' : ''}`}
                      triggerStyle={{ borderColor: fieldErrors.pmType ? 'var(--error)' : undefined, boxShadow: fieldErrors.pmType ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined }}
                      value={formData.pmType}
                      onChange={(val) => {
                        clearFieldError('pmType')
                        setFormData({ ...formData, pmType: val })
                      }}
                      options={PM_TYPE_OPTIONS}
                      placeholder="Select the option that best fits"
                    />
                  </div>
                  {fieldErrors.pmType && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.pmType}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Number of tenants under management</label>
                  <div className="input-wrapper">
                    <Users size={18} className="input-icon" />
                    <FormSelect
                      triggerClassName={`form-input--with-icon ${fieldErrors.tenantsNumber ? 'form-input--error' : ''}`}
                      triggerStyle={{ borderColor: fieldErrors.tenantsNumber ? 'var(--error)' : undefined, boxShadow: fieldErrors.tenantsNumber ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined }}
                      value={formData.tenantsNumber}
                      onChange={(val) => {
                        clearFieldError('tenantsNumber')
                        setFormData({ ...formData, tenantsNumber: val })
                      }}
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
                  {fieldErrors.tenantsNumber && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.tenantsNumber}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      className={`form-input form-input--with-icon ${fieldErrors.fullName ? 'form-input--error' : ''}`}
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) => {
                        clearFieldError('fullName')
                        setFormData({ ...formData, fullName: e.target.value })
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.fullName && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.fullName}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      className={`form-input form-input--with-icon ${fieldErrors.email || emailExists ? 'form-input--error' : ''}`}
                      placeholder="example@company.com"
                      value={formData.email}
                      onChange={(e) => {
                        clearFieldError('email')
                        setFormData({ ...formData, email: e.target.value })
                      }}
                      required
                    />
                    {isCheckingEmail && (
                      <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    )}
                  </div>
                  {fieldErrors.email && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.email}</p>}
                  {emailExists && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#ef4444', fontSize: '13px' }}>
                      <AlertCircle size={14} />
                      <span>Email already registered. <Link href={isNative ? "/login" : "/pm-login"} style={{ textDecoration: 'underline', fontWeight: 700, color: 'var(--forest)' }}>Log in</Link></span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                    <FormSelect
                      width="95px"
                      searchable={true}
                      triggerStyle={{ height: '48px', padding: '0 8px', background: 'var(--bg)', fontSize: '13.5px', borderColor: fieldErrors.phone ? 'var(--error)' : undefined, boxShadow: fieldErrors.phone ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined }}
                      value={phoneCountryCode}
                      onChange={setPhoneCountryCode}
                      options={ALL_COUNTRIES}
                      placeholder="+234"
                    />
                    <input
                      type="tel"
                      className={`form-input ${fieldErrors.phone ? 'form-input--error' : ''}`}
                      style={{ flex: 1, height: '48px', paddingLeft: '14px' }}
                      placeholder={phoneCountryCode === 'Kenya' ? '712 345 678' : '908 155 2162'}
                      value={formData.phone}
                      onChange={(e) => {
                        clearFieldError('phone')
                        setFormData({ ...formData, phone: e.target.value })
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.phone && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.phone}</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mobile-auth__form-step">
                <div className="form-group">
                  <label className="form-label">Create Password</label>
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input form-input--with-icon ${fieldErrors.password ? 'form-input--error' : ''}`}
                      placeholder="•••••••••••••"
                      value={formData.password}
                      onChange={(e) => {
                        clearFieldError('password')
                        setFormData({ ...formData, password: e.target.value })
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
                  {fieldErrors.password && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-input form-input--with-icon ${fieldErrors.confirmPassword ? 'form-input--error' : ''}`}
                      placeholder="•••••••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        clearFieldError('confirmPassword')
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }}
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
                  {fieldErrors.confirmPassword && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.confirmPassword}</p>}
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      required
                      style={{ accentColor: 'var(--forest)', marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>
                      I agree to the{' '}
                      <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)', fontWeight: 700 }}>
                        Terms of Use
                      </a>{' '}
                      and{' '}
                      <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)', fontWeight: 700 }}>
                        Privacy Policy
                      </a>
                    </span>
                  </label>
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
              disabled={loading || (step === 2 && emailExists) || isCheckingEmail || (step === 3 && !termsAgreed)}
              style={{ marginTop: 'auto' }}
            >
              <span>{loading ? 'Please wait...' : 'Continue'}</span>
              <ArrowRight size={18} />
            </button>

            {step === 1 && (
              <div className="mobile-auth__footer" style={{ marginTop: '24px', textAlign: 'center' }}>
                <p className="auth-footer">
                  Already have an account? <Link href={isNative ? "/login" : "/pm-login"}>Log in</Link>
                </p>
              </div>
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
