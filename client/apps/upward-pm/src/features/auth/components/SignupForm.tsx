'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
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
  Phone,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { FormSelect } from '@/components/ui/Select/FormSelect'
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

const COUNTRY_OPTIONS = [
  { label: 'Nigeria', value: 'Nigeria' },
  { label: 'Kenya', value: 'Kenya' },
  { label: 'Ghana', value: 'Ghana' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'United States', value: 'United States' },
  { label: 'Canada', value: 'Canada' },
  { label: 'South Africa', value: 'South Africa' },
]

const PM_TYPE_OPTIONS = [
  { label: 'Landlord', value: 'INDIVIDUAL_LANDLORD' },
  { label: 'Independent Property Manager', value: 'Property Manager' },
  { label: 'Property Management Company', value: 'Company' },
  { label: 'Estate Agent', value: 'Estate Agent' },
  { label: 'Caretaker', value: 'Caretaker' },
  { label: 'Lawyer', value: 'Lawyer' },
]

const TENANT_OPTIONS = [
  { label: 'Less than 50 tenants', value: 'Less than 50' },
  { label: '51–100 tenants', value: '51-100' },
  { label: '101–250 tenants', value: '101-250' },
  { label: '251–500 tenants', value: '251-500' },
  { label: '500+ tenants', value: 'Greater than 500' },
]

type RequestOtpResult = { context: 'SIGNUP' | 'LOGIN' }
type OtpLoginResult = { user?: { pmType?: string } }

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

export const SignupForm = ({ onStepChange }: { onStepChange?: (step: number) => void }) => {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  
  // 1: Business details, 2: About you (Personal contact), 3: Security, 'otp', 'success'
  const [step, setStep] = useState<1 | 2 | 3 | 'otp' | 'success'>(1)
  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP')

  const [formData, setFormData] = useState({
    companyName: '',
    country: 'Nigeria',
    email: '', // Business work email
    phone: '', // Business work phone
    tenantsNumber: '',
    pmType: 'Property Manager',
    password: '',
    confirmPassword: '',
    fullName: '', // Personal full name
    personalEmail: '', // Personal contact email
    personalPhone: '', // Personal mobile phone
  })

  const [businessPhoneCountry, setBusinessPhoneCountry] = useState('Nigeria')
  const [personalPhoneCountry, setPersonalPhoneCountry] = useState('Nigeria')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [resendCooldown, setResendCooldown] = useState(0)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)

  const signupMutation = useSignup()
  const requestOtpMutation = useRequestOTP()
  const verifyOtpMutation = useVerifyOTP()
  const otpLoginMutation = useOtpLogin()

  const isResending = requestOtpMutation.isPending
  const isVerifying = verifyOtpMutation.isPending || otpLoginMutation.isPending || signupMutation.isPending
  const loading = isResending || isVerifying

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof step === 'number') {
      onStepChange?.(step)
    } else if (step === 'otp' || step === 'success') {
      onStepChange?.(4)
    }
  }, [step, onStepChange])

  // Live silent email check for business work email
  useEffect(() => {
    setEmailExists(false)
    if (formData.email && formData.email.includes('@') && formData.email.length > 5) {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
      emailCheckTimeout.current = setTimeout(async () => {
        setIsCheckingEmail(true)
        try {
          const res = await checkEmail(formData.email.trim())
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
      }, 700)
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
      if (current.pmType && current.pmType !== 'Property Manager') return current
      return {
        ...current,
        pmType: prefillPmType,
      }
    })
  }, [])

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  // Step 1 Validation (Business Details)
  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.country) nextErrors.country = 'Please select a country'
    if (!formData.companyName.trim()) nextErrors.companyName = 'Business or organization name is required'
    if (!formData.pmType) nextErrors.pmType = 'Please select your role type'
    if (!formData.tenantsNumber) nextErrors.tenantsNumber = 'Please select tenants managed'

    if (!formData.email.trim()) {
      nextErrors.email = 'Business email address is required'
    } else if (!formData.email.includes('@')) {
      nextErrors.email = 'Please enter a valid business email'
    } else if (emailExists) {
      nextErrors.email = 'This email is already registered'
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Business phone number is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})
    return true
  }

  // Step 2 Validation (About You / Personal Contact)
  const validateStep2 = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required'

    if (!formData.personalEmail.trim()) {
      nextErrors.personalEmail = 'Personal contact email is required'
    } else if (!formData.personalEmail.includes('@')) {
      nextErrors.personalEmail = 'Please enter a valid personal email'
    }

    if (!formData.personalPhone.trim()) {
      nextErrors.personalPhone = 'Personal phone number is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})
    return true
  }

  // Step 3 Submit (Security & Trigger OTP)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirmation password is required'
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    if (!termsAgreed) {
      nextErrors.termsAgreed = 'Please accept the Terms of Use and Privacy Policy'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})

    requestOtpMutation.mutate(
      {
        email: formData.email.trim(),
        context: 'SIGNUP',
      },
      {
        onSuccess: (data: RequestOtpResult) => {
          setEffectiveContext(data.context)
          setResendCooldown(30)
          setStep('otp')
        },
        onError: (err: any) => {
          toastError(err?.message || 'Failed to send verification code')
        }
      },
    )
  }

  const handleResendOtp = () => {
    if (resendCooldown > 0 || isResending) return
    requestOtpMutation.mutate(
      {
        email: formData.email.trim(),
        context: 'SIGNUP',
      },
      {
        onSuccess: () => {
          setResendCooldown(30)
          toastSuccess?.('Verification code resent successfully!')
        },
        onError: (err: any) => {
          toastError(err?.message || 'Failed to resend verification code')
        }
      }
    )
  }

  const triggerVerification = (otpArray: string[]) => {
    const otpCode = otpArray.join('')
    if (otpCode.length !== 6) return

    if (effectiveContext === 'LOGIN') {
      otpLoginMutation.mutate(
        { email: formData.email.trim(), otp: otpCode },
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
      return
    }

    // Format phone numbers
    const getDialCode = (cName: string) => {
      const match = ALL_COUNTRIES.find(c => c.value === cName)
      return match ? match.shortLabel : '+234'
    }

    let bPhone = formData.phone.trim()
    const bDial = getDialCode(businessPhoneCountry)
    if (!bPhone.startsWith('+')) {
      if (bPhone.startsWith('0')) bPhone = bPhone.substring(1)
      bPhone = `${bDial} ${bPhone}`
    }

    let pPhone = formData.personalPhone.trim()
    const pDial = getDialCode(personalPhoneCountry)
    if (!pPhone.startsWith('+')) {
      if (pPhone.startsWith('0')) pPhone = pPhone.substring(1)
      pPhone = `${pDial} ${pPhone}`
    }

    const nameParts = formData.fullName.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ' '

    signupMutation.mutate(
      {
        companyName: formData.companyName.trim(),
        country: formData.country,
        email: formData.email.trim(),
        phone: bPhone,
        tenantsNumber: formData.tenantsNumber,
        pmType: formData.pmType,
        password: formData.password,
        fullName: formData.fullName.trim(),
        personalEmail: formData.personalEmail.trim() || formData.email.trim(),
        personalPhone: pPhone || bPhone,
        otp: otpCode,
      },
      {
        onSuccess: () => {
          setStep('success')
        },
        onError: (err: any) => {
          toastError(err?.message || 'Registration failed')
        }
      },
    )
  }

  const handleOtpChange = (index: number, value: string) => {
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
      document.getElementById(`signup-otp-${nextIndex}`)?.focus()

      if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
        triggerVerification(newOtp)
      }
      return
    }

    const newOtp = [...otp]
    newOtp[index] = digitsOnly
    setOtp(newOtp)

    if (digitsOnly && index < 5) {
      document.getElementById(`signup-otp-${index + 1}`)?.focus()
    }

    if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault()
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
    document.getElementById(`signup-otp-${nextIndex}`)?.focus()

    if (newOtp.every((digit) => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const selectTriggerStyle = {
    height: '46px',
    borderRadius: 'var(--radius-sm, 8px)',
    border: '1.5px solid var(--line, #e4ddc9)',
    background: 'var(--card, #ffffff)',
    fontSize: '14.5px',
    padding: '0 14px',
    boxShadow: 'none',
  }

  return (
    <div className="animate-fade-in">
      {/* ── Top Progress Segments (Shown in steps 1, 2, 3) ── */}
      {typeof step === 'number' && (
        <div className="progress-track" aria-label={`Step ${step} of 3`}>
          <div className={`progress-seg ${step >= 1 ? 'filled' : ''}`}><span /></div>
          <div className={`progress-seg ${step >= 2 ? 'filled' : ''}`}><span /></div>
          <div className={`progress-seg ${step >= 3 ? 'filled' : ''}`}><span /></div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 1: Business Details
         ═══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div>
          <p className="step-label">STEP 1 OF 3</p>
          <div className="card-head" style={{ marginBottom: 20 }}>
            <h2>Tell us about your business</h2>
            <p>This helps us tailor Upward to how your portfolio and team run.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (validateStep1()) setStep(2) }} noValidate>
            <div className="field-grid-2">
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Country</label>
                <FormSelect
                  value={formData.country}
                  options={COUNTRY_OPTIONS}
                  onChange={(val) => {
                    clearFieldError('country')
                    setFormData({ ...formData, country: val })
                  }}
                  icon={<MapPin size={15} color="var(--forest-700)" />}
                  triggerStyle={{
                    ...selectTriggerStyle,
                    borderColor: fieldErrors.country ? 'var(--error, #b3402f)' : undefined,
                  }}
                  placeholder="Select country"
                />
                {fieldErrors.country && <p className="field-error-text">{fieldErrors.country}</p>}
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="business-name">Business / portfolio name</label>
                <div className={`input-shell ${fieldErrors.companyName ? 'input-shell--error' : ''}`}>
                  <Building size={15} />
                  <input
                    id="business-name"
                    type="text"
                    placeholder="e.g. Apex Real Estate"
                    value={formData.companyName}
                    onChange={(e) => {
                      clearFieldError('companyName')
                      setFormData({ ...formData, companyName: e.target.value })
                    }}
                    required
                  />
                </div>
                {fieldErrors.companyName && <p className="field-error-text">{fieldErrors.companyName}</p>}
              </div>
            </div>

            <div className="field-grid-2">
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Role type</label>
                <FormSelect
                  value={formData.pmType}
                  options={PM_TYPE_OPTIONS}
                  onChange={(val) => {
                    clearFieldError('pmType')
                    setFormData({ ...formData, pmType: val })
                  }}
                  icon={<Briefcase size={15} color="var(--forest-700)" />}
                  triggerStyle={{
                    ...selectTriggerStyle,
                    borderColor: fieldErrors.pmType ? 'var(--error, #b3402f)' : undefined,
                  }}
                  placeholder="Select role type"
                />
                {fieldErrors.pmType && <p className="field-error-text">{fieldErrors.pmType}</p>}
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Tenants managed</label>
                <FormSelect
                  value={formData.tenantsNumber}
                  options={TENANT_OPTIONS}
                  onChange={(val) => {
                    clearFieldError('tenantsNumber')
                    setFormData({ ...formData, tenantsNumber: val })
                  }}
                  icon={<Users size={15} color="var(--forest-700)" />}
                  triggerStyle={{
                    ...selectTriggerStyle,
                    borderColor: fieldErrors.tenantsNumber ? 'var(--error, #b3402f)' : undefined,
                  }}
                  placeholder="Select range"
                />
                {fieldErrors.tenantsNumber && <p className="field-error-text">{fieldErrors.tenantsNumber}</p>}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="business-email">Business work email</label>
              <div className={`input-shell ${fieldErrors.email || emailExists ? 'input-shell--error' : ''}`}>
                <Mail size={15} />
                <input
                  id="business-email"
                  type="email"
                  placeholder="operations@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    clearFieldError('email')
                    setFormData({ ...formData, email: e.target.value })
                  }}
                  required
                />
                {isCheckingEmail && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
              </div>
              {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}
              {emailExists && (
                <p className="field-error-text">
                  This email is already registered.{' '}
                  <Link href="/login" style={{ color: 'var(--forest-700)', fontWeight: 600, textDecoration: 'underline' }}>
                    Sign in?
                  </Link>
                </p>
              )}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="business-phone">Business phone number</label>
              <div className="phone-row">
                <div style={{ width: '100px', flexShrink: 0 }}>
                  <FormSelect
                    value={businessPhoneCountry}
                    options={ALL_COUNTRIES}
                    searchable
                    onChange={(val) => setBusinessPhoneCountry(val)}
                    triggerStyle={selectTriggerStyle}
                    menuStyle={{ minWidth: '280px', width: '280px' }}
                  />
                </div>
                <div className={`input-shell ${fieldErrors.phone ? 'input-shell--error' : ''}`} style={{ flex: 1 }}>
                  <Phone size={15} />
                  <input
                    id="business-phone"
                    type="tel"
                    placeholder="801 234 5678"
                    value={formData.phone}
                    onChange={(e) => {
                      clearFieldError('phone')
                      setFormData({ ...formData, phone: e.target.value })
                    }}
                    required
                  />
                </div>
              </div>
              {fieldErrors.phone && <p className="field-error-text">{fieldErrors.phone}</p>}
            </div>

            <div className="step-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="primary-btn" disabled={isCheckingEmail || emailExists}>
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 2: About You (Personal Details)
         ═══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          <p className="step-label">STEP 2 OF 3</p>
          <div className="card-head" style={{ marginBottom: 20 }}>
            <h2>About you</h2>
            <p>Your personal credentials for account security, verification, and recovery.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (validateStep2()) setStep(3) }} noValidate>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="user-fullname">Full name</label>
              <div className={`input-shell ${fieldErrors.fullName ? 'input-shell--error' : ''}`}>
                <User size={15} />
                <input
                  id="user-fullname"
                  type="text"
                  placeholder="e.g. Adebayo Ogunlesi"
                  value={formData.fullName}
                  onChange={(e) => {
                    clearFieldError('fullName')
                    setFormData({ ...formData, fullName: e.target.value })
                  }}
                  required
                />
              </div>
              {fieldErrors.fullName && <p className="field-error-text">{fieldErrors.fullName}</p>}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="personal-email">Personal contact email</label>
              <div className={`input-shell ${fieldErrors.personalEmail ? 'input-shell--error' : ''}`}>
                <Mail size={15} />
                <input
                  id="personal-email"
                  type="email"
                  placeholder="personal@email.com"
                  value={formData.personalEmail}
                  onChange={(e) => {
                    clearFieldError('personalEmail')
                    setFormData({ ...formData, personalEmail: e.target.value })
                  }}
                  required
                />
              </div>
              {fieldErrors.personalEmail && <p className="field-error-text">{fieldErrors.personalEmail}</p>}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="personal-phone">Personal mobile number</label>
              <div className="phone-row">
                <div style={{ width: '100px', flexShrink: 0 }}>
                  <FormSelect
                    value={personalPhoneCountry}
                    options={ALL_COUNTRIES}
                    searchable
                    onChange={(val) => setPersonalPhoneCountry(val)}
                    triggerStyle={selectTriggerStyle}
                    menuStyle={{ minWidth: '280px', width: '280px' }}
                  />
                </div>
                <div className={`input-shell ${fieldErrors.personalPhone ? 'input-shell--error' : ''}`} style={{ flex: 1 }}>
                  <Phone size={15} />
                  <input
                    id="personal-phone"
                    type="tel"
                    placeholder="801 234 5678"
                    value={formData.personalPhone}
                    onChange={(e) => {
                      clearFieldError('personalPhone')
                      setFormData({ ...formData, personalPhone: e.target.value })
                    }}
                    required
                  />
                </div>
              </div>
              {fieldErrors.personalPhone && <p className="field-error-text">{fieldErrors.personalPhone}</p>}
            </div>

            <div className="step-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="submit" className="primary-btn">
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 3: Secure Your Account
         ═══════════════════════════════════════════════════ */}
      {step === 3 && (
        <div>
          <p className="step-label">STEP 3 OF 3</p>
          <div className="card-head">
            <h2>Secure your account</h2>
            <p>Choose a password to finish setting up Upward.</p>
          </div>

          <form onSubmit={handleFinalSubmit} noValidate>
            <div className="field">
              <label htmlFor="signup-pass">Password</label>
              <div className={`input-shell ${fieldErrors.password ? 'input-shell--error' : ''}`}>
                <Lock size={16} />
                <input
                  id="signup-pass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => {
                    clearFieldError('password')
                    setFormData({ ...formData, password: e.target.value })
                  }}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="field-hint">At least 8 characters.</p>
              {fieldErrors.password && <p className="field-error-text">{fieldErrors.password}</p>}
            </div>

            <div className="field">
              <label htmlFor="signup-confirm-pass">Confirm password</label>
              <div className={`input-shell ${fieldErrors.confirmPassword ? 'input-shell--error' : ''}`}>
                <Lock size={16} />
                <input
                  id="signup-confirm-pass"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    clearFieldError('confirmPassword')
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="icon-btn"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="field-error-text">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className="checkbox-row">
              <input
                type="checkbox"
                id="signup-terms"
                checked={termsAgreed}
                onChange={(e) => {
                  clearFieldError('termsAgreed')
                  setTermsAgreed(e.target.checked)
                }}
              />
              <label htmlFor="signup-terms">
                I agree to the{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Use
                </a>{' '}
                and{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </label>
            </div>
            {fieldErrors.termsAgreed && <p className="field-error-text">{fieldErrors.termsAgreed}</p>}

            <div className="step-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                <span>{loading ? 'Sending code...' : 'Create account'}</span>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 4: OTP Verification
         ═══════════════════════════════════════════════════ */}
      {step === 'otp' && (
        <div>
          <div className="card-head">
            <h2>Verify your email</h2>
            <p>
              We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); triggerVerification(otp) }} noValidate>
            <div className={`otp-row ${verifyOtpMutation.isError || otpLoginMutation.isError ? 'otp-row--error' : ''}`}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`signup-otp-${i}`}
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
                      document.getElementById(`signup-otp-${i - 1}`)?.focus()
                    }
                  }}
                  required
                />
              ))}
            </div>

            {(verifyOtpMutation.isError || otpLoginMutation.isError || signupMutation.isError) && (
              <p className="field-error-text" style={{ textAlign: 'center', marginBottom: 12 }}>
                {getErrorMessage(verifyOtpMutation.error, '') ||
                  getErrorMessage(otpLoginMutation.error, '') ||
                  getErrorMessage(signupMutation.error, 'Invalid verification code')}
              </p>
            )}

            <div className="otp-meta">
              <span>
                Wrong email?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setOtp(['', '', '', '', '', ''])
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

            <button type="submit" className="primary-btn" disabled={isVerifying || isResending}>
              <span>{isVerifying ? 'Verifying code...' : 'Verify & complete'}</span>
              {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 5: Success
         ═══════════════════════════════════════════════════ */}
      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <CheckCircle2 size={56} color="var(--forest-700)" />
          </div>
          <div className="card-head">
            <h2>Account created!</h2>
            <p>
              Your property manager account has been successfully created. Welcome to Upward!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            className="primary-btn"
            style={{ marginTop: 24 }}
          >
            <span>Go to dashboard</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── Footer Link ── */}
      {step !== 'success' && (
        <p className="foot-note">
          Already have an account?{' '}
          <Link href="/login">
            Sign in
          </Link>
        </p>
      )}
    </div>
  )
}
