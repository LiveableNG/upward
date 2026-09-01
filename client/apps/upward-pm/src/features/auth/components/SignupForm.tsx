'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Loader2,
  AlertCircle,
  MapPin,
  Users,
  Building,
  Eye,
  EyeOff,
  User,
} from 'lucide-react'
import { UpwardLogo } from '../../../components/common/UpwardLogo'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { Switch } from '@/components/ui/Switch/Switch'
import { useToast } from '@/components/common/Toast'
import { useSignup } from '../hooks/useSignup'
import { useRequestOTP, useVerifyOTP, useOtpLogin } from '../hooks/useOtp'
import { checkEmail } from '../services/authService'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

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

export const SignupForm = () => {
  const router = useRouter()
  const { error: toastError } = useToast()
  const [stage, setStage] = useState<'info' | 'otp' | 'success'>('info')
  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP')
  const [showAdditionalContact, setShowAdditionalContact] = useState(false)

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
    personalEmail: '',
    personalPhone: '',
  })

  const [phoneCountryCode, setPhoneCountryCode] = useState('Nigeria')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)

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

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!formData.companyName.trim()) nextErrors.companyName = 'This field is required'
    if (!formData.country) nextErrors.country = 'This field is required'
    if (!formData.pmType) nextErrors.pmType = 'This field is required'
    if (!formData.tenantsNumber) nextErrors.tenantsNumber = 'This field is required'
    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'This field is required'
    }

     if (!formData.email.trim()) {
      nextErrors.email = 'This field is required'
    } else if (!formData.email.includes('@')) {
      nextErrors.email = 'Please enter a valid work email'
    } else if (emailExists) {
      nextErrors.email = 'This email is already registered'
    }

    if (!formData.phone.trim()) nextErrors.phone = 'This field is required'

    if (!formData.personalEmail.trim()) {
      nextErrors.personalEmail = 'This field is required'
    } else if (!formData.personalEmail.includes('@')) {
      nextErrors.personalEmail = 'Please enter a valid personal email'
    }

    if (!formData.personalPhone.trim()) {
      nextErrors.personalPhone = 'This field is required'
    }

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

    if (!termsAgreed) {
      nextErrors.termsAgreed = 'You must accept the Terms of Use & Privacy Policy to continue'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toastError('Please fill in the highlighted fields and accept the terms before continuing.', 'Missing required fields')
      return
    }

    setFieldErrors({})

    requestOtpMutation.mutate(
      {
        email: formData.email,
        context: 'SIGNUP',
      },
      {
        onSuccess: (data: RequestOtpResult) => {
          setEffectiveContext(data.context)
          setStage('otp')
        },
      },
    )
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
              const dialCode = formData.country === 'Kenya' ? '+254' : '+234'
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
                personalEmail: formData.personalEmail.trim() || undefined,
                personalPhone: formData.personalPhone.trim() || undefined,
              }

              signupMutation.mutate(signupPayload, {
                onSuccess: () => setStage('success'),
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

  return (
    <div className="animate-fade-in">
      {stage === 'success' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={64} color="var(--forest)" style={{ margin: '0 auto 24px' }} />
          <h2 className="auth-card__title" style={{ marginBottom: 12 }}>
            Account Created!
          </h2>
          <p className="auth-card__subtitle" style={{ marginBottom: 32 }}>
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
      ) : stage === 'otp' ? (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
            <UpwardLogo color="var(--forest)" size={48} />
            <h2 className="auth-card__title" style={{ fontSize: '22px', fontWeight: 800, marginTop: '16px', marginBottom: '8px' }}>
              Verify your email
            </h2>
            <p className="auth-card__subtitle" style={{ fontSize: '14.5px' }}>
              We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>. If you don&apos;t see it after a few minutes, check your Spam or Promotions folder or request a new code.{' '}
              <button
                type="button"
                onClick={() => {
                  setStage('info')
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
          </div>

          <form onSubmit={handleOtpSubmit}>
            <div className={`otp-group ${verifyOtpMutation.isError || otpLoginMutation.isError ? 'otp-group--error' : ''}`}>
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
              <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '24px', fontWeight: 500 }}>
                {getErrorMessage(verifyOtpMutation.error, '') ||
                  getErrorMessage(otpLoginMutation.error, 'Invalid verification code')}
              </p>
            )}

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Complete'} <ArrowRight size={18} />
            </button>

            <div className="auth-footer" style={{ marginTop: '24px' }}>
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
        </div>
      ) : (
        <form onSubmit={handleInfoSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '16px' }}>
            <UpwardLogo color="var(--forest)" size={48} />
            <h2 className="auth-card__title" style={{ fontSize: '24px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: 'var(--dark)' }}>
              Create your account
            </h2>
            <p className="auth-card__subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Manage your properties with confidence.
            </p>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Country</label>
              <div className="input-wrapper">
                <FormSelect
                  width="100%"
                  icon={<MapPin size={16} style={{ color: 'var(--forest)' }} />}
                  triggerStyle={{
                    height: '48px',
                    borderColor: fieldErrors.country ? 'var(--error)' : undefined,
                    boxShadow: fieldErrors.country ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined,
                  }}
                  value={formData.country}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      country: val,
                    })
                  }
                  options={[
                    { label: 'Nigeria', value: 'Nigeria' },
                    { label: 'Kenya', value: 'Kenya' }
                  ]}
                  placeholder="Select country"
                />
              </div>
              {fieldErrors.country && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.country}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Business Name</label>
              <div className="input-wrapper">
                <Building size={18} className="input-icon" />
                <input
                  type="text"
                  className={`form-input form-input--with-icon ${fieldErrors.companyName ? 'form-input--error' : ''}`}
                  placeholder="Enter business name"
                  value={formData.companyName}
                  onChange={(e) =>
                    {
                      clearFieldError('companyName')
                      setFormData({
                        ...formData,
                        companyName: e.target.value,
                      })
                    }
                  }
                  required
                />
              </div>
              {fieldErrors.companyName && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.companyName}</p>}
            </div>
          </div>


          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Business or role type</label>
              <div className="input-wrapper">
                <Briefcase size={18} className="input-icon" />
                <FormSelect
                  width="100%"
                  triggerStyle={{ height: '48px', paddingLeft: '42px' }}
                  value={formData.pmType}
                  onChange={(val) => {
                    clearFieldError('pmType')
                    setFormData({
                      ...formData,
                      pmType: val,
                    })
                  }}
                  options={PM_TYPE_OPTIONS}
                  placeholder="Select the option that best fits"
                />
              </div>
              {fieldErrors.pmType && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.pmType}</p>}
            </div>

             <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tenants under management</label>
              <div className="input-wrapper">
                <Users size={18} className="input-icon" />
                <FormSelect
                  width="100%"
                  triggerStyle={{
                    height: '48px',
                    paddingLeft: '42px',
                    borderColor: fieldErrors.tenantsNumber ? 'var(--error)' : undefined,
                    boxShadow: fieldErrors.tenantsNumber ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : undefined,
                  }}
                  value={formData.tenantsNumber}
                  onChange={(val) => {
                    clearFieldError('tenantsNumber')
                    setFormData({
                      ...formData,
                      tenantsNumber: val,
                    })
                  }}
                  options={[
                    { label: 'Less than 50', value: 'Less than 50' },
                    { label: '51-100', value: '51-100' },
                    { label: '101-250', value: '101-250' },
                    { label: '251-500', value: '251-500' },
                    { label: 'Greater than 500', value: 'Greater than 500' }
                  ]}
                  placeholder="Select range"
                />
              </div>
              {fieldErrors.tenantsNumber && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.tenantsNumber}</p>}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className={`form-input form-input--with-icon ${requestOtpMutation.isError || emailExists ? 'form-input--error' : ''}`}
                  placeholder="example@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    if (requestOtpMutation.isError) requestOtpMutation.reset()
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }}
                  required
                />
                {isCheckingEmail && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>

              {isInvited && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--forest)', fontSize: '13px', fontWeight: 500 }}>
                  <CheckCircle2 size={14} />
                  <span>You have a pending invitation! Redirecting...</span>
                </div>
              )}

              {(requestOtpMutation.isError || emailExists) && !isInvited && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#ef4444', fontSize: '13px', fontWeight: 500 }}>
                  <AlertCircle size={14} />
                  <span>
                    {emailExists ? 'This email is already registered.' : getErrorMessage(requestOtpMutation.error, 'Email error')}
                    {' '}
                    <Link href="/pm-login" style={{ textDecoration: 'underline', fontWeight: 700, color: 'var(--forest)' }}>Log in?</Link>
                  </span>
                </div>
              )}
            </div>

             <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                <FormSelect
                  width="95px"
                  searchable={true}
                  triggerStyle={{ height: '48px', padding: '0 8px', background: 'var(--bg)', fontSize: '13.5px' }}
                  value={phoneCountryCode}
                  onChange={setPhoneCountryCode}
                  options={ALL_COUNTRIES}
                  placeholder="+234"
                  menuStyle={{ width: '280px', minWidth: '280px' }}
                />
                <div style={{ flex: 1, display: 'flex' }}>
                  <input
                    type="tel"
                    className={`form-input ${fieldErrors.phone ? 'form-input--error' : ''}`}
                    style={{ height: '48px', width: '100%', paddingLeft: '14px' }}
                    placeholder={phoneCountryCode === 'Kenya' ? '712 345 678' : '908 155 2162'}
                    value={formData.phone}
                    onChange={(e) => {
                      clearFieldError('phone')
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }}
                    required
                  />
                </div>
              </div>
              {fieldErrors.phone && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.phone}</p>}
            </div>
          </div>

          <div className="signup-contact-section">
            <div className="signup-contact-section__panel">
              <div className="signup-contact-section__panel-header">
                <div className="signup-contact-section__panel-icon">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="signup-contact-section__panel-title">Personal contact details</h3>
                  <p className="signup-contact-section__panel-copy">
                    These details are required for account verification and communication.
                  </p>
                </div>
              </div>

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
                      setFormData({
                        ...formData,
                        fullName: e.target.value,
                      })
                    }}
                    required
                  />
                </div>
                {fieldErrors.fullName && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.fullName}</p>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Personal Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      className={`form-input form-input--with-icon ${fieldErrors.personalEmail ? 'form-input--error' : ''}`}
                      placeholder="personal@email.com"
                      value={formData.personalEmail}
                      onChange={(e) => {
                        clearFieldError('personalEmail')
                        setFormData({
                          ...formData,
                          personalEmail: e.target.value,
                        })
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.personalEmail && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.personalEmail}</p>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Personal Phone</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      type="tel"
                      className={`form-input form-input--with-icon ${fieldErrors.personalPhone ? 'form-input--error' : ''}`}
                      placeholder="e.g. +234 801 234 5678"
                      value={formData.personalPhone}
                      onChange={(e) => {
                        clearFieldError('personalPhone')
                        setFormData({
                          ...formData,
                          personalPhone: e.target.value,
                        })
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.personalPhone && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.personalPhone}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input form-input--with-icon ${fieldErrors.password ? 'form-input--error' : ''}`}
                  style={{ paddingRight: '50px' }}
                  placeholder="•••••••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    clearFieldError('password')
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.password}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input form-input--with-icon ${fieldErrors.confirmPassword ? 'form-input--error' : ''}`}
                  style={{ paddingRight: '50px' }}
                  placeholder="•••••••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    clearFieldError('confirmPassword')
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.confirmPassword}</p>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: fieldErrors.termsAgreed ? 'var(--error)' : 'var(--text-secondary)',
                lineHeight: '1.4',
                padding: fieldErrors.termsAgreed ? '8px 12px' : '0',
                borderRadius: fieldErrors.termsAgreed ? '8px' : '0',
                border: fieldErrors.termsAgreed ? '1px solid var(--error)' : '1px solid transparent',
                background: fieldErrors.termsAgreed ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => {
                  clearFieldError('termsAgreed')
                  setTermsAgreed(e.target.checked)
                }}
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
            {fieldErrors.termsAgreed && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{fieldErrors.termsAgreed}</p>}
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn--primary auth-btn--large"
            disabled={loading || emailExists || isCheckingEmail || isInvited}
            style={{ marginTop: '10px' }}
          >
            <span>{loading ? 'Please wait...' : 'Create account'}</span>
            <ArrowRight size={18} />
          </button>

          <div className="auth-footer" style={{ marginTop: '10px', textAlign: 'center' }}>
            Already have an account? <Link href="/pm-login">Log in</Link>
          </div>
        </form>
      )}

      <style jsx>{`
        .signup-contact-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .signup-contact-section__panel {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(22, 101, 52, 0.14);
          background: linear-gradient(180deg, rgba(243, 248, 243, 0.95), rgba(250, 252, 249, 0.98));
          box-shadow: 0 10px 24px rgba(22, 101, 52, 0.04);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .signup-contact-section__panel-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .signup-contact-section__panel-icon {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(22, 101, 52, 0.12);
          color: var(--forest);
          flex-shrink: 0;
        }

        .signup-contact-section__panel-title {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: var(--dark);
          letter-spacing: -0.01em;
        }

        .signup-contact-section__panel-copy {
          margin: 4px 0 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        @media (max-width: 640px) {
          .signup-contact-section__panel {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  )
}

