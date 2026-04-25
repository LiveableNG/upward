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
} from 'lucide-react'
import { useSignup } from '../hooks/useSignup'
import { useRequestOTP, useVerifyOTP } from '../hooks/useOtp'

export const SignupForm = () => {
  const [stage, setStage] = useState<'info' | 'otp' | 'success'>('info')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [passwordError, setPasswordError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const signupMutation = useSignup()
  const requestOtpMutation = useRequestOTP()
  const verifyOtpMutation = useVerifyOTP()

  const loading =
    signupMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        onSuccess: () => setStage('otp'),
      }
    )
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const otpCode = otp.join('')

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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  if (stage === 'success') {
    return (
      <div
        className="animate-fade-in"
        style={{ textAlign: 'center' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '20px',
              background: 'var(--success-bg)',
              borderRadius: '50%',
            }}
          >
            <CheckCircle2
              size={48}
              color="var(--success)"
            />
          </div>
        </div>

        <h2 className="auth-card__title">
          You're all set!
        </h2>

        <p
          className="auth-card__subtitle"
          style={{ marginBottom: '32px' }}
        >
          Your account has been created.
          Welcome to Upward Property Management.
        </p>

        <Link
          href="/dashboard"
          className="auth-btn auth-btn--primary"
        >
          Go to Dashboard <ArrowRight size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="auth-card__title">
          {stage === 'info'
            ? 'Get started with Upward'
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
          <div className="otp-group">
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