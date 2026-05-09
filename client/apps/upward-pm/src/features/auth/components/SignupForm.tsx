'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Lock,
  User,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Briefcase,
} from 'lucide-react'
import { useSignup } from '../hooks/useSignup'
import { useRequestOTP, useVerifyOTP, useOtpLogin } from '../hooks/useOtp'

export const SignupForm = () => {
  const [stage, setStage] = useState<'info' | 'otp' | 'success'>('info')
  const [effectiveContext, setEffectiveContext] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    pmType: '',
  })

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [passwordError, setPasswordError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const signupMutation = useSignup()
  const requestOtpMutation = useRequestOTP()
  const verifyOtpMutation = useVerifyOTP()
  const otpLoginMutation = useOtpLogin()

  const loading =
    signupMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    otpLoginMutation.isPending

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.pmType) {
      setPasswordError('Please select your role')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordError('')

    requestOtpMutation.mutate(
      {
        email: formData.email,
        context: 'SIGNUP',
      },
      {
        onSuccess: (data: any) => {
          setEffectiveContext(data.context)
          setStage('otp')
        },
      }
    )
  }

  const triggerVerification = (otpArray: string[]) => {
    const otpCode = otpArray.join('')
    if (otpCode.length !== 6) return

    if (effectiveContext === 'LOGIN') {
      otpLoginMutation.mutate(
        { email: formData.email, otp: otpCode },
        {
          onSuccess: () => {
            window.location.href = '/dashboard'
          }
        }
      )
    } else {
      verifyOtpMutation.mutate(
        {
          email: formData.email,
          otp: otpCode,
          context: 'SIGNUP',
        },
        {
          onSuccess: (res: any) => {
            if (res.success) {
              const { confirmPassword, ...signupPayload } = formData
              signupMutation.mutate(signupPayload, {
                onSuccess: () => setStage('success'),
              })
            }
          },
        }
      )
    }
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerVerification(otp)
  }

  const handleOtpChange = (index: number, value: string) => {
    // Reset error state when user starts typing again
    if (verifyOtpMutation.isError) verifyOtpMutation.reset()
    if (otpLoginMutation.isError) otpLoginMutation.reset()

    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }

    // Auto-verify if all digits are filled
    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  if (stage === 'success') {
    return (
      <div className="auth-success animate-fade-in">
        <div className="success-icon-wrapper">
          <CheckCircle2 size={40} />
        </div>

        <h2 className="auth-card__title">You're all set!</h2>
        <p className="auth-card__subtitle">
          Your account has been created. <br />
          Welcome to Upward Property Management.
        </p>

        <Link href="/dashboard" className="auth-btn auth-btn--primary" style={{ marginTop: '32px' }}>
          Go to Dashboard <ArrowRight size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="auth-header">
        <h2 className="auth-card__title">
          {stage === 'info'
            ? 'Get started'
            : 'Verify your email'}
        </h2>

        <p className="auth-card__subtitle">
          {stage === 'info'
            ? 'Create your property manager account in seconds.'
            : `We've sent a 6-digit code to ${formData.email}. Enter it below to continue.`}
        </p>
      </div>

      {stage === 'info' ? (
        <form onSubmit={handleInfoSubmit}>
          <div className="form-group">
            <label className="form-label">
              I am a...
            </label>
            <div className="input-wrapper">
              <Briefcase size={18} className="input-icon" />
              <select 
                className="form-input form-input--with-icon"
                value={formData.pmType}
                onChange={(e) => setFormData({ ...formData, pmType: e.target.value })}
                required
              >
                <option value="" disabled>-- Select your role --</option>
                <option value="Landlord">Landlord</option>
                <option value="Caretaker">Caretaker</option>
                <option value="Lawyer">Lawyer</option>
                <option value="Estate Agent">Estate Agent</option>
                <option value="Property Manager">Property Manager</option>
                <option value="Company">Management Co.</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <div className="form-group">
              <label className="form-label">
                First Name
              </label>

              <div className="input-wrapper">
                <User
                  size={18}
                  className="input-icon"
                />

                <input
                  type="text"
                  className="form-input form-input--with-icon"
                  placeholder="Segun"
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

            <div className="form-group">
              <label className="form-label">
                Last Name
              </label>

              <div className="input-wrapper">
                <User
                  size={18}
                  className="input-icon"
                />

                <input
                  type="text"
                  className="form-input form-input--with-icon"
                  placeholder="Arinze"
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

          <div className="form-group">
            <label className="form-label">
              Email Address
            </label>

            <div className="input-wrapper">
              <Mail
                size={18}
                className="input-icon"
              />

              <input
                type="email"
                className="form-input form-input--with-icon"
                placeholder="segun@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Password
            </label>

            <div
              className="input-wrapper"
              style={{ position: 'relative' }}
            >
              <Lock
                size={18}
                className="input-icon"
              />

              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input form-input--with-icon"
                placeholder="Create a strong password"
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
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Confirm Password
            </label>

            <div
              className="input-wrapper"
              style={{ position: 'relative' }}
            >
              <Lock
                size={18}
                className="input-icon"
              />

              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                className="form-input form-input--with-icon"
                placeholder="Confirm your password"
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
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {passwordError && (
              <p
                style={{
                  color: 'red',
                  fontSize: '14px',
                  marginTop: '8px',
                }}
              >
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : 'Continue'}{' '}
            <ChevronRight size={18} />
          </button>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link href="/login">
              Log in
            </Link>
          </div>
        </form>
      ) : (
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
                onChange={(e) =>
                  handleOtpChange(
                    i,
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Backspace' &&
                    !digit &&
                    i > 0
                  ) {
                    document
                      .getElementById(
                        `otp-${i - 1}`
                      )
                      ?.focus()
                  }
                }}
                required
              />
            ))}
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={loading}
          >
            {loading
              ? 'Verifying...'
              : 'Verify & Complete'}{' '}
            <ArrowRight size={18} />
          </button>

          <div className="auth-footer">
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
  )
}