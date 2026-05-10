'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { KeyRound, Loader2, CheckCircle } from 'lucide-react'
import { landlordChangePassword } from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    try {
      await landlordChangePassword(data.password)
      setSuccess(true)
      setTimeout(() => {
        router.push('/portal')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
           <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 24px' }} />
           <h2 className={styles.title}>Password Updated</h2>
           <p className={styles.subtitle}>Your password has been changed successfully. Redirecting you to the dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
             <KeyRound size={32} color="var(--forest)" />
          </div>
          <h1 className={styles.title}>Secure Your Account</h1>
          <p className={styles.subtitle}>Please set a new password for your landlord portal access.</p>
        </div>

        {error && <div style={{ color: 'var(--error)', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Password</label>
            <input 
              {...register('password')}
              type="password" 
              className={styles.input} 
              placeholder="Minimum 8 characters"
            />
            {errors.password && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{errors.password.message}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input 
              {...register('confirmPassword')}
              type="password" 
              className={styles.input} 
              placeholder="Repeat new password"
            />
            {errors.confirmPassword && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
