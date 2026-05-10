'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Key, Mail, ShieldCheck, Loader2, ArrowRight } from 'lucide-react'
import { landlordLogin, landlordRequestOTP } from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  otp: z.string().optional()
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LandlordLoginPage() {
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
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className="auth-role-toggle" style={{ margin: '0 0 32px 0' }}>
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

        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
             <div style={{ background: 'var(--forest-faint)', padding: '12px', borderRadius: '16px' }}>
                <ShieldCheck size={32} color="var(--forest)" />
             </div>
          </div>
          <h1 className={styles.title}>Landlord Portal</h1>
          <p className={styles.subtitle}>Secure access to your property portfolio</p>
        </div>

        <div className={styles.toggleContainer}>
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

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div style={{ position: 'relative' }}>
               <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
               <input 
                {...register('email')}
                className={styles.input} 
                placeholder="you@example.com"
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>
            {errors.email && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{errors.email.message}</span>}
          </div>

          {loginType === 'PASSWORD' ? (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  {...register('password')}
                  type="password" 
                  className={styles.input} 
                  placeholder="••••••••"
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Verification Code</label>
              {!otpSent ? (
                <button 
                  type="button" 
                  className={styles.button} 
                  style={{ background: 'white', color: 'var(--forest)', border: '1px solid var(--forest)' }}
                  onClick={handleRequestOTP}
                  disabled={loading || !email}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Get Access Code'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <input 
                    {...register('otp')}
                    className={styles.input} 
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }}
                  />
                  <p className={styles.otpHint}>Code sent to your email. Check your inbox.</p>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.button}
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
    </div>
  )
}
