'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, Check, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

type Step = 'OVERVIEW' | 'REASON' | 'CONFIRM' | 'OTP' | 'DELETED'

const REASONS = [
  'I have another Upward account',
  "Don't need an Upward account / No longer renting",
  'My landlord or agent does not support Upward',
  'Got a new mobile number or email address',
  'Poor customer service or technical issues',
  'Switching platforms',
  'Worried about account privacy or security',
  'Prefer not to say',
]

export default function CloseAccountPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { error: toastError } = useToast()

  const [step, setStep] = useState<Step>('OVERVIEW')
  const [selectedReason, setSelectedReason] = useState<string>('Prefer not to say')

  // Checkboxes for Screen 3
  const [chk1, setChk1] = useState(false)
  const [chk2, setChk2] = useState(false)
  const [chk3, setChk3] = useState(false)
  const allChecked = chk1 && chk2 && chk3

  // OTP state for Screen 4
  const [emailMasked, setEmailMasked] = useState<string>('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldown > 0 && step === 'OTP') {
      interval = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [cooldown, step])

  if (!user) return null

  const handleBack = () => {
    if (step === 'OVERVIEW') {
      router.push('/dashboard/settings')
    } else if (step === 'REASON') {
      setStep('OVERVIEW')
    } else if (step === 'CONFIRM') {
      setStep('REASON')
    } else if (step === 'OTP') {
      setStep('CONFIRM')
    }
  }

  const handleProceedToOtp = async () => {
    setIsRequestingOtp(true)
    setOtpError(null)
    try {
      const res = await api.requestDeleteAccountOtp()
      if (res.emailMasked) {
        setEmailMasked(res.emailMasked)
      } else {
        setEmailMasked(user.email || 'your registered email')
      }
      setCooldown(res.cooldownSeconds || 60)
      setStep('OTP')
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code.'
      toastError(msg)
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0 || isRequestingOtp) return
    setIsRequestingOtp(true)
    setOtpError(null)
    try {
      const res = await api.requestDeleteAccountOtp()
      setCooldown(res.cooldownSeconds || 60)
      setOtpDigits(['', '', '', '', '', ''])
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification code.'
      setOtpError(msg)
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '')
    if (!cleaned && val !== '') return

    const newDigits = [...otpDigits]
    newDigits[index] = cleaned.slice(-1)
    setOtpDigits(newDigits)
    setOtpError(null)

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newDigits = [...otpDigits]
    pasted.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char
    })
    setOtpDigits(newDigits)
    setOtpError(null)

    const nextIndex = Math.min(pasted.length, 5)
    otpInputsRef.current[nextIndex]?.focus()
  }

  const otpCode = otpDigits.join('')

  const handleFinalDelete = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter a complete 6-digit verification code.')
      return
    }

    setIsDeleting(true)
    setOtpError(null)
    try {
      await api.deleteAccount({
        otp: otpCode,
        reason: selectedReason,
      })
      setStep('DELETED')
      setTimeout(() => {
        logout()
      }, 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.'
      setOtpError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="pay-flow dashboard--nav-offset">
      <div className="pay-flow__shell">
        {step !== 'DELETED' ? (
          <header className="pay-flow__header">
            <div className="pay-flow__header-row pay-flow__header-row--centered">
              <button
                type="button"
                className="pay-flow__back"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="pay-flow__title">Close Account</h1>
              <span className="pay-flow__back-spacer" aria-hidden />
            </div>
          </header>
        ) : null}

        <div className="pay-flow__scroll">
          <div className="pay-flow__inner">
            {/* =========================================================================
                SCREEN 1: Consequence Overview (OPay Red Alert Style)
               ========================================================================= */}
            {step === 'OVERVIEW' && (
              <div className="close-account-flow">
                <div className="close-account-alert-badge" aria-hidden>
                  <span className="close-account-alert-badge__icon">!</span>
                </div>

                <h2 className="close-account-section-heading">
                  After Successful Account Cancellation:
                </h2>

                <div className="close-account-bullet-card">
                  <ul className="close-account-bullet-list">
                    <li className="close-account-bullet-item">
                      <span className="close-account-bullet-dot">·</span>
                      <span>Permanently Unable to Login or Use the Account</span>
                    </li>
                    <li className="close-account-bullet-item">
                      <span className="close-account-bullet-dot">·</span>
                      <span>
                        Verified Rent Score, Tenancy Profile, and Virtual Accounts will be cleared
                      </span>
                    </li>
                    <li className="close-account-bullet-item">
                      <span className="close-account-bullet-dot">·</span>
                      <span>All Gained Benefits such as Rent Score &amp; Streaks will be cleared</span>
                    </li>
                  </ul>
                </div>

                <p className="close-account-notice">
                  For more details on Account Cancellation, please refer to{' '}
                  <span className="link-like" onClick={() => router.push('/dashboard/legal')}>
                    &lsquo;Upward Account Cancellation Notice&rsquo;
                  </span>
                  .
                </p>

                <div className="close-account-actions">
                  <button
                    type="button"
                    className="pay-flow__cta"
                    onClick={() => setStep('REASON')}
                  >
                    Confirm and Continue
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 2: Reason for Leaving (Optional Radio List)
               ========================================================================= */}
            {step === 'REASON' && (
              <div className="close-account-flow">
                <div>
                  <h2 className="close-account-title">Why do you want to close your account?</h2>
                  <p className="close-account-subtitle">
                    Select a reason to help us improve our service.
                  </p>
                </div>

                <div className="close-account-radio-group">
                  {REASONS.map((r) => {
                    const isSelected = selectedReason === r
                    return (
                      <button
                        key={r}
                        type="button"
                        className={`close-account-radio-item ${
                          isSelected ? 'close-account-radio-item--selected' : ''
                        }`}
                        onClick={() => setSelectedReason(r)}
                      >
                        <span>{r}</span>
                        <span className="close-account-radio-circle" aria-hidden>
                          {isSelected && <span className="close-account-radio-circle__dot" />}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="close-account-actions">
                  <button
                    type="button"
                    className="pay-flow__cta"
                    onClick={() => setStep('CONFIRM')}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 3: Final Confirmation & Acknowledgement
               ========================================================================= */}
            {step === 'CONFIRM' && (
              <div className="close-account-flow">
                <div>
                  <h2 className="close-account-title">Final Confirmation</h2>
                  <p className="close-account-subtitle">
                    Please acknowledge the following before proceeding to verification.
                  </p>
                </div>

                <div className="close-account-danger-banner">
                  <AlertTriangle size={20} className="close-account-danger-banner__icon" />
                  <span>
                    This action is permanent and completely irreversible. Once completed, your
                    account and all associated data cannot be restored.
                  </span>
                </div>

                <div className="close-account-checkbox-group">
                  <div
                    className={`close-account-checkbox-item ${
                      chk1 ? 'close-account-checkbox-item--checked' : ''
                    }`}
                    onClick={() => setChk1(!chk1)}
                    role="checkbox"
                    aria-checked={chk1}
                    tabIndex={0}
                  >
                    <span className="close-account-checkbox-box">
                      {chk1 && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      I understand that my verified rent score, profile, and tenancy history will be
                      permanently deleted.
                    </span>
                  </div>

                  <div
                    className={`close-account-checkbox-item ${
                      chk2 ? 'close-account-checkbox-item--checked' : ''
                    }`}
                    onClick={() => setChk2(!chk2)}
                    role="checkbox"
                    aria-checked={chk2}
                    tabIndex={0}
                  >
                    <span className="close-account-checkbox-box">
                      {chk2 && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      I understand that all active dedicated virtual accounts and direct rent
                      payments will be canceled.
                    </span>
                  </div>

                  <div
                    className={`close-account-checkbox-item ${
                      chk3 ? 'close-account-checkbox-item--checked' : ''
                    }`}
                    onClick={() => setChk3(!chk3)}
                    role="checkbox"
                    aria-checked={chk3}
                    tabIndex={0}
                  >
                    <span className="close-account-checkbox-box">
                      {chk3 && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      I understand that this action is immediate and cannot be undone by Upward
                      Support.
                    </span>
                  </div>
                </div>

                <div className="close-account-actions">
                  <button
                    type="button"
                    className="pay-flow__cta"
                    disabled={!allChecked || isRequestingOtp}
                    onClick={handleProceedToOtp}
                  >
                    {isRequestingOtp ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending verification code…
                      </>
                    ) : (
                      'Proceed to Security Verification'
                    )}
                  </button>

                  <button
                    type="button"
                    className="close-account-btn--cancel"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    Cancel and Keep Account
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 4: Security Verification (OTP Entry)
               ========================================================================= */}
            {step === 'OTP' && (
              <div className="close-account-flow">
                <div>
                  <h2 className="close-account-title">Security Verification</h2>
                  <p className="close-account-subtitle">
                    Enter the 6-digit confirmation code sent to{' '}
                    <strong>{emailMasked || user.email}</strong>.
                  </p>
                </div>

                <div className="close-account-otp-box">
                  <div className="close-account-otp-inputs">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className="close-account-otp-digit"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <div className="close-account-resend-row">
                    <span>Didn&apos;t get a code?</span>
                    <button
                      type="button"
                      className="close-account-resend-btn"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || isRequestingOtp}
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  {otpError && <div className="close-account-otp-error">{otpError}</div>}
                </div>

                <div className="close-account-actions">
                  <button
                    type="button"
                    className="close-account-btn--danger"
                    disabled={otpCode.length !== 6 || isDeleting}
                    onClick={handleFinalDelete}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting Account…
                      </>
                    ) : (
                      'Permanently Delete Account'
                    )}
                  </button>

                  <button
                    type="button"
                    className="close-account-btn--cancel"
                    onClick={() => router.push('/dashboard/settings')}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 5: Completion & Session Terminated
               ========================================================================= */}
            {step === 'DELETED' && (
              <div className="close-account-success-box">
                <div className="close-account-success-icon" aria-hidden>
                  <CheckCircle2 size={44} />
                </div>

                <div>
                  <h2 className="close-account-title" style={{ textAlign: 'center' }}>
                    Account Deleted
                  </h2>
                  <p className="close-account-subtitle" style={{ textAlign: 'center', marginTop: 6 }}>
                    Your Upward account has been permanently closed and your session has ended.
                    Thank you for having been part of Upward.
                  </p>
                </div>

                <button
                  type="button"
                  className="pay-flow__cta"
                  style={{ maxWidth: 280 }}
                  onClick={() => logout()}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
