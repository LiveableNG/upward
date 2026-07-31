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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export const SignupForm = () => {
  const router = useRouter()
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
    firstName: '',
    lastName: '',
    personalEmail: '',
    personalPhone: '',
  })

  const [phoneCountryCode, setPhoneCountryCode] = useState('Nigeria')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [passwordError, setPasswordError] = useState('')

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

  const loading =
    signupMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    otpLoginMutation.isPending

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (!formData.companyName.trim()) {
      setPasswordError('Please enter company name')
      return
    }
    if (!formData.country) {
      setPasswordError('Please select country')
      return
    }
    if (!formData.pmType) {
      setPasswordError('Please select account type')
      return
    }
    if (!formData.tenantsNumber) {
      setPasswordError('Please select number of tenants')
      return
    }
    if (!formData.firstName.trim()) {
      setPasswordError('Please enter your first name')
      return
    }
    if (!formData.lastName.trim()) {
      setPasswordError('Please enter your last name')
      return
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setPasswordError('Please enter a valid work email')
      return
    }
    if (emailExists) {
      setPasswordError('This email is already registered')
      return
    }
    if (!formData.phone.trim()) {
      setPasswordError('Please enter phone number')
      return
    }
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
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

              const signupPayload = {
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
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
              We&apos;ve sent a 6-digit code to <strong>{formData.email}</strong>.{' '}
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
        <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  triggerStyle={{ height: '48px' }}
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
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Business Name</label>
              <div className="input-wrapper">
                <Building size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input form-input--with-icon"
                  placeholder="Enter business name"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      companyName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">What type of business do you own?</label>
              <div className="input-wrapper">
                <Briefcase size={18} className="input-icon" />
                <FormSelect
                  width="100%"
                  triggerStyle={{ height: '48px', paddingLeft: '42px' }}
                  value={formData.pmType}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      pmType: val,
                    })
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tenants under management</label>
              <div className="input-wrapper">
                <Users size={18} className="input-icon" />
                <FormSelect
                  width="100%"
                  triggerStyle={{ height: '48px', paddingLeft: '42px' }}
                  value={formData.tenantsNumber}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      tenantsNumber: val,
                    })
                  }
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
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">First Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input form-input--with-icon"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Last Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input form-input--with-icon"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value,
                    })
                  }
                  required
                />
              </div>
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
                    className="form-input"
                    style={{ height: '48px', width: '100%', paddingLeft: '14px' }}
                    placeholder={phoneCountryCode === 'Kenya' ? '712 345 678' : '908 155 2162'}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ margin: '8px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showAdditionalContact}
                onChange={(e) => setShowAdditionalContact(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--forest)',
                  cursor: 'pointer',
                }}
              />
              <span>Add personal contact details for communications</span>
            </label>
          </div>

          {showAdditionalContact && (
            <div className="grid-2 animate-fade-in" style={{ background: '#F3F8F3', padding: '16px', borderRadius: '12px', border: '1px solid #E7E3DA', marginBottom: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Personal Email (Optional)</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input form-input--with-icon"
                    placeholder="personal@email.com"
                    value={formData.personalEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Personal Phone (Optional)</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="tel"
                    className="form-input form-input--with-icon"
                    placeholder="e.g. +234 801 234 5678"
                    value={formData.personalPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalPhone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input--with-icon"
                  style={{ paddingRight: '50px' }}
                  placeholder="•••••••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
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
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input form-input--with-icon"
                  style={{ paddingRight: '50px' }}
                  placeholder="•••••••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
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
            </div>
          </div>

          {passwordError && (
            <p style={{ color: 'red', fontSize: '13px', margin: 0, fontWeight: 500 }}>
              {passwordError}
            </p>
          )}

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
    </div>
  )
}
