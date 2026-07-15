import React, { useState, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import './OTPInput.css'

interface OTPInputProps {
  email: string
  onVerify: (otp: string) => Promise<void>
  onResend: (channel?: 'SMS' | 'WHATSAPP') => Promise<void>
  onChangeEmail?: () => void
  isLoading?: boolean
  error?: string | null
}

export const OTPInput: React.FC<OTPInputProps> = ({
  email,
  onVerify,
  onResend,
  onChangeEmail,
  isLoading,
  error
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const [resendCount, setResendCount] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendChannel, setResendChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Auto-focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Take only the last character
    setOtp(newOtp)

    // Move to next input if value is entered
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus()
    }

    // Trigger verification if all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      onVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char
    })
    setOtp(newOtp)

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()

    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      onVerify(newOtp.join(''))
    }
  }

  const handleResend = async () => {
    if (timer > 0 || resendCount >= 3 || isResending) return

    setIsResending(true)
    try {
      await onResend(resendChannel)
      setTimer(30 * (resendCount + 1)) // Exponential-ish backoff
      setResendCount(prev => prev + 1)
    } finally {
      setIsResending(false)
    }
  }

  const isPhone = email.startsWith('+') || /^\d+$/.test(email)

  return (
    <div className="otp-container">
      <div className="otp-header">
        <h2>Verify your identity</h2>
        <p>
          We've sent a 6-digit code to <strong>{email}</strong>. 
          {!isPhone && <span> Be sure to check your <strong>spam/junk</strong> folder if you don't see it.</span>}
        </p>
        {onChangeEmail && (
          <button className="otp-change-email" onClick={onChangeEmail} disabled={isLoading}>
            Not your {isPhone ? 'phone number' : 'email'}? Change it
          </button>
        )}
      </div>

      <div className={`otp-inputs ${error ? 'otp-inputs--error' : ''}`}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {error && <div className="otp-error-msg">{error}</div>}

      <div className="otp-footer">
        {timer > 0 ? (
          <span className="otp-timer">Resend code in {timer}s</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {isPhone && (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input type="radio" name="resendChannel" checked={resendChannel === 'SMS'} onChange={() => setResendChannel('SMS')} style={{ accentColor: 'var(--clay)' }} /> SMS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input type="radio" name="resendChannel" checked={resendChannel === 'WHATSAPP'} onChange={() => setResendChannel('WHATSAPP')} style={{ accentColor: 'var(--clay)' }} /> WhatsApp
                </label>
              </div>
            )}
            <button 
              className="otp-resend-btn" 
              onClick={handleResend} 
              disabled={isLoading || isResending || resendCount >= 3}
            >
              {isResending ? <Loader2 className="animate-spin" size={16} /> : 'Resend Code'}
            </button>
          </div>
        )}
        {resendCount >= 3 && <p className="otp-limit-msg">Max resend attempts reached. Please try again later.</p>}
      </div>

      <div className="otp-loading-overlay" style={{ display: isLoading ? 'flex' : 'none' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    </div>
  )
}
