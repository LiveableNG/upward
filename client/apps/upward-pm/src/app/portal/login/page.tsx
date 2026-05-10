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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  otp: z.string().optional()
})

type LoginFormValues = z.infer<typeof loginSchema>

function LandlordLoginForm() {
  const router = useRouter()
  const [loginType, setLoginType] = useState<'PASSWORD' | 'OTP'>('PASSWORD')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const email = watch('email')

  const handleRequestOTP = async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      await landlordRequestOTP(email)
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    setError(null)
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
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Landlord Portal"
      subtitle="Secure access to your property portfolio"
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

        <div className="auth-header">
           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'var(--ivory-dark)', padding: '12px', borderRadius: '16px' }}>
                 <ShieldCheck size={32} color="var(--dark)" />
              </div>
           </div>
           <h2 className="auth-card__title">Landlord Portal</h2>
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

        {error && <div className="auth-error" style={{ marginBottom: '24px' }}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
               <Mail size={18} className="form-input-icon" />
               <input 
                {...register('email')}
                className="form-input" 
                placeholder="you@example.com"
                style={{ paddingLeft: '44px' }}
              />
            </div>
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          {loginType === 'PASSWORD' ? (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrapper">
                <Key size={18} className="form-input-icon" />
                <input 
                  {...register('password')}
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••"
                  style={{ paddingLeft: '44px' }}
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
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleRequestOTP}
                  disabled={loading || !email}
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
                    Code sent to your email. Check your inbox.
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
