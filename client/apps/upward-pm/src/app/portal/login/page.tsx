'use client'

import React, { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Key, Mail, ShieldCheck, Loader2, ArrowRight } from 'lucide-react'
import { landlordLogin, landlordRequestOTP } from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'
import Link from 'next/link'
import '@/styles/auth.css'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useToast } from '@/components/common/Toast'
import { checkLandlordExistence } from '@/features/auth/services/landlordAuthService'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  otp: z.string().optional()
})

type LoginFormValues = z.infer<typeof loginSchema>

function LandlordLoginForm() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  const [loginType, setLoginType] = useState<'PASSWORD' | 'OTP'>('PASSWORD')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [existenceError, setExistenceError] = useState<string | null>(null)
  const [isCheckingExistence, setIsCheckingExistence] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const email = watch('email')

  // Silent existence check
  React.useEffect(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setExistenceError(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingExistence(true)
      try {
        const { exists } = await checkLandlordExistence(email)
        if (!exists) {
          setExistenceError('Account not found. Please contact your property manager.')
        } else {
          setExistenceError(null)
        }
      } catch (err) {
        // Ignore errors for silent check
      } finally {
        setIsCheckingExistence(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [email])

  const handleRequestOTP = async () => {
    if (!email) return
    setLoading(true)
    try {
      await landlordRequestOTP(email)
      setOtpSent(true)
      toastSuccess('Verification code sent to your email.')
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    try {
      const response = await landlordLogin({
        email: data.email,
        password: data.password,
        otp: data.otp,
        type: loginType
      })

      if (response.user.mustChangePassword) {
        router.push('/portal/change-password')
      } else {
        router.push('/portal')
      }
    } catch (err: any) {
      toastError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Landlord Portal"
      subtitle="Secure access to your property portfolio"
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
            href="/login"
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
              Landlord Portal
           </h2>
           <p className="auth-card__subtitle">Enter your credentials to access your portfolio.</p>
        </div>

        <div className={styles.toggleContainer} style={{ marginBottom: '32px' }}>
          <button 
            type="button"
            className={`${styles.toggleButton} ${loginType === 'PASSWORD' ? styles.activeToggle : ''}`}
            onClick={() => setLoginType('PASSWORD')}
          >
            Password
          </button>
          <button 
            type="button"
            className={`${styles.toggleButton} ${loginType === 'OTP' ? styles.activeToggle : ''}`}
            onClick={() => setLoginType('OTP')}
          >
            Access Code
          </button>
        </div>

        {/* Removed on-page error div as we use Toast now */}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
               <Mail size={18} className="input-icon" />
               <input 
                {...register('email')}
                className={`form-input ${errors.email || existenceError ? 'form-input--error' : ''}`} 
                placeholder="you@example.com"
                style={{ paddingLeft: '52px' }}
              />
            </div>
            {(errors.email || existenceError) && (
              <p style={{ 
                fontSize: '12px', 
                color: '#ef4444', 
                marginTop: '8px', 
                fontWeight: 400 
              }}>
                {errors.email?.message || existenceError}
              </p>
            )}
          </div>

          {loginType === 'PASSWORD' ? (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Key size={18} className="input-icon" />
                <input 
                  {...register('password')}
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••"
                  style={{ paddingLeft: '52px' }}
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              {!otpSent ? (
                <button 
                  type="button" 
                  className="auth-btn auth-btn--ghost" 
                  style={{ width: '100%', justifyContent: 'center', height: '52px' }}
                  onClick={handleRequestOTP}
                  disabled={loading || !email || !!existenceError}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Get Access Code'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    {...register('otp')}
                    className="form-input"
                    placeholder="000000"
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Code sent to your email. Check your inbox <strong>(and spam folder)</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className="auth-btn auth-btn--primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={loading || (loginType === 'OTP' && !otpSent)}
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Login to Portal
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <div className="auth-footer" style={{ marginTop: '24px' }}>
            Don't have an account? <Link href="/portal/signup" style={{ color: 'var(--forest)', fontWeight: 700 }}>Create one for free</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}

export default function LandlordLoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LandlordLoginForm />
    </Suspense>
  )
}
