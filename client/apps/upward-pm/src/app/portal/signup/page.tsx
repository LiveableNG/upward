'use client'

import React, { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Key, 
  Mail, 
  User, 
  ShieldCheck, 
  Loader2, 
  ArrowRight, 
  ChevronRight, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone 
} from 'lucide-react'
import { 
  landlordSignup, 
  landlordRequestOTPSignup, 
  landlordVerifyOTPSignup 
} from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'
import Link from 'next/link'
import '@/styles/auth.css'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useToast } from '@/components/common/Toast'

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

function LandlordSignupForm() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  const [stage, setStage] = useState<'info' | 'otp'>('info')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  })

  const email = watch('email')
  const formData = watch()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await landlordRequestOTPSignup(email)
      setStage('otp')
      toastSuccess('Verification code sent to your email.')
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleInfoSubmit = async () => {
    setLoading(true)
    try {
      await landlordRequestOTPSignup(formData.email)
      setStage('otp')
      toastSuccess('Verification code sent to your email.')
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }

    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      triggerVerification(newOtp)
    }
  }

  const triggerVerification = async (otpArray: string[]) => {
    const otpCode = otpArray.join('')
    if (otpCode.length !== 6) return

    setLoading(true)
    try {
      // 1. Verify OTP first
      await landlordVerifyOTPSignup(formData.email, otpCode)
      
      // 2. Perform actual signup
      const signupPayload = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined
      }
      
      await landlordSignup(signupPayload)
      toastSuccess('Account created successfully!')
      router.push('/portal')
    } catch (err: any) {
      toastError(err.message || 'Verification or signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerVerification(otp)
  }

  return (
    <AuthLayout 
      title="Landlord Portal"
      subtitle="Register your property portfolio account"
      visualTitle={
        <>
          Your properties, <br />
          <span className="text-gradient">all in one place</span>.
        </>
      }
      visualDesc="Access your property portfolio, view unit performance, and stay connected with your property managers through our premium landlord portal."
    >
      <div className="animate-fade-in">
        <div className="auth-role-toggle">
          <Link 
            href="/signup"
            className="auth-role-toggle__btn"
          >
            Property Manager
          </Link>
          <button 
            type="button"
            className="auth-role-toggle__btn auth-role-toggle__btn--active"
          >
            Landlord
          </button>
        </div>

        <div className="auth-header" style={{ textAlign: 'left' }}>
           <h2 className="auth-card__title" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ background: 'var(--ivory-dark)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                <ShieldCheck size={24} color="var(--dark)" />
              </div>
              Landlord Registration
           </h2>
           <p className="auth-card__subtitle">
             {stage === 'info' 
               ? 'Create your landlord account to monitor your property portfolio.' 
               : 'Check your email for the verification code.'
             }
           </p>
        </div>

        {stage === 'info' ? (
          <form onSubmit={handleSubmit(handleInfoSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    {...register('firstName')}
                    className={`form-input ${errors.firstName ? 'form-input--error' : ''}`} 
                    placeholder="Segun"
                    style={{ paddingLeft: '52px' }}
                  />
                </div>
                {errors.firstName && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    {...register('lastName')}
                    className={`form-input ${errors.lastName ? 'form-input--error' : ''}`} 
                    placeholder="Arinze"
                    style={{ paddingLeft: '52px' }}
                  />
                </div>
                {errors.lastName && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input 
                  {...register('email')}
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`} 
                  placeholder="you@example.com"
                  style={{ paddingLeft: '52px' }}
                />
              </div>
              {errors.email && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input 
                  {...register('phone')}
                  className="form-input" 
                  placeholder="+234 80 1234 5678"
                  style={{ paddingLeft: '52px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input 
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`} 
                  placeholder="••••••••"
                  style={{ paddingLeft: '52px', paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input 
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`} 
                  placeholder="••••••••"
                  style={{ paddingLeft: '52px', paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="auth-btn auth-btn--primary"
              style={{ width: '100%', marginTop: '24px' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  Register & Continue
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            <div className="auth-footer" style={{ marginTop: '24px' }}>
              Already have an account? <Link href="/portal/login" style={{ color: 'var(--forest)', fontWeight: 700 }}>Go to Login</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="otp-group" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  className="otp-input"
                  style={{ width: '48px', height: '52px', fontSize: '20px', textAlign: 'center', border: '1px solid var(--border-strong)', borderRadius: '8px' }}
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

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px', lineHeight: 1.4 }}>
              We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>. If you don&apos;t see it after a few minutes, check your Spam or Promotions folder or request a new code.
            </p>

            <button 
              type="submit" 
              className="auth-btn auth-btn--primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  Verify & Complete
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="auth-footer" style={{ marginTop: '24px' }}>
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await landlordRequestOTPSignup(formData.email)
                    toastSuccess('Verification code resent.')
                  } catch (err: any) {
                    toastError(err.message || 'Failed to resend code')
                  }
                }}
                style={{
                  color: 'var(--forest)',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Resend
              </button>
            </div>

            <div className="auth-footer" style={{ marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setStage('info')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
              >
                Back to registration
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}

export default function LandlordSignupPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LandlordSignupForm />
    </Suspense>
  )
}
