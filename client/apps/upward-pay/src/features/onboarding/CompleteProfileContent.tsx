'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Mail,
  Phone,
  Lock,
  ChevronRight,
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Gift,
  Shield,
  Star,
  ArrowRight,
  Sprout,
} from 'lucide-react'
import { completeProfile, updateProfile } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/AuthContext'
import PoweredByUpward from '@/components/PoweredByUpward'

const profileSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().optional(),
  rentAnniversary: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface CompleteProfileProps {
  initialEmail?: string
  token?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
}

// Steps: 0 (Benefits), 1 (Personal Info), 2 (Security), 3 (Residential)
type OnboardingStep = 0 | 1 | 2 | 3

export default function CompleteProfileContent({
  initialEmail,
  token,
  initialData,
}: CompleteProfileProps) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<OnboardingStep>(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: initialEmail || '',
      fullName: initialData?.fullName || '',
      phone: initialData?.phone || '',
      password: '',
      address: '',
      rentAnniversary: '',
    },
  })

  const completeMutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      completeProfile({ ...data, invitedByCompanyId: token }),
    onSuccess: (result) => {
      setAuthUser(result.tenant)
      queryClient.setQueryData(['user'], result.tenant)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProfileFormValues>) => updateProfile(data),
  })

  const nextStep = () => setStep((s) => (s + 1) as OnboardingStep)
  const prevStep = () => setStep((s) => (s - 1) as OnboardingStep)

  const onNextStep = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (step === 1) {
      const isValid = await trigger(['fullName', 'email', 'phone'])
      if (isValid) nextStep()
    } else if (step === 2) {
      const isValid = await trigger(['password'])
      if (isValid) {
        setIsSyncing(true)
        try {
          await completeMutation.mutateAsync(getValues())
          nextStep()
        } catch (err) {
          console.error('Account creation failed:', err)
        } finally {
          setIsSyncing(false)
        }
      }
    }
  }

  const onFinalSubmit = async (data: ProfileFormValues) => {
    setIsSyncing(true)
    try {
      if (data.address || data.rentAnniversary) {
        await updateMutation.mutateAsync({
          address: data.address,
          rentAnniversary: data.rentAnniversary,
        })
      }
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (err) {
      console.error('Final update failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Build Your Credit',
      desc: 'Monthly rent payments help build your financial score.',
      color: '#22c55e',
    },
    {
      icon: Gift,
      title: 'Earn Rewards',
      desc: 'Get points on every on-time payment towards future deals.',
      color: '#d97757',
    },
    {
      icon: Shield,
      title: 'Verified Tenancy',
      desc: 'Instant digital record of your tenancy for future landlords.',
      color: '#3b82f6',
    },
  ]

  return (
    <div className="auth-page auth-page--multi-step">
      <header className="auth-page__header">
        <PoweredByUpward />
        <div className="signup-progress">
          <div className="signup-progress__bar" style={{ width: `${(step / 3) * 100}%` }}></div>
          <div className="signup-progress__dots">
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                className={`signup-progress__dot ${step === s ? 'is-active' : step > s ? 'is-done' : ''}`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="auth-page__content">
        {step === 0 && (
          <div className="signup-step signup-step--benefits">
            <div className="signup-step__hero">
              <div className="signup-step__icon-circle">
                <Star fill="#d97757" color="#d97757" size={32} />
              </div>
              <h1 className="auth-page__title">Unlock Premium Rent Experience</h1>
              <p className="auth-page__subtitle">
                Join thousands of tenants using Upward to simplify their living experience.
              </p>
            </div>

            <div className="benefits-list">
              {benefits.map((b, i) => (
                <div key={i} className="benefit-item">
                  <div className="benefit-item__icon" style={{ backgroundColor: `${b.color}15` }}>
                    <b.icon size={20} color={b.color} />
                  </div>
                  <div className="benefit-item__info">
                    <h3>{b.title}</h3>
                    <p>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn--primary btn--full btn--pay"
              onClick={nextStep}
              style={{ marginTop: 'auto' }}
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="signup-step signup-step--form">
            <button className="signup-step__back" onClick={prevStep}>
              <ArrowLeft size={18} /> Back
            </button>

            <div className="signup-step__header">
              <h2 className="auth-page__title">Tell us about yourself</h2>
              <p className="auth-page__subtitle">
                We'll use this to set up your profile and verified rent records.
              </p>
            </div>

            <div className="auth-form">
              <div className="auth-form__field">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input {...register('fullName')} type="text" placeholder="e.g. Sarah Johnson" />
                </div>
                {errors.fullName && (
                  <span
                    className="auth-form__error"
                    style={{ background: 'none', border: 'none', padding: '0', marginTop: '4px' }}
                  >
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              <div className="auth-form__field">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input {...register('email')} type="email" placeholder="sarah@email.com" />
                </div>
                {errors.email && (
                  <span
                    className="auth-form__error"
                    style={{ background: 'none', border: 'none', padding: '0', marginTop: '4px' }}
                  >
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="auth-form__field">
                <label>Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input {...register('phone')} type="tel" placeholder="+234 800 000 0000" />
                </div>
                {errors.phone && (
                  <span
                    className="auth-form__error"
                    style={{ background: 'none', border: 'none', padding: '0', marginTop: '4px' }}
                  >
                    {errors.phone.message}
                  </span>
                )}
              </div>

              <button className="btn btn--primary btn--full btn--pay" onClick={onNextStep}>
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="signup-step signup-step--form">
            <button className="signup-step__back" onClick={prevStep}>
              <ArrowLeft size={18} /> Back
            </button>

            <div className="signup-step__header">
              <h2 className="auth-page__title">Secure your account</h2>
              <p className="auth-page__subtitle">
                Create a strong password to protect your payment history.
              </p>
            </div>

            <div className="auth-form">
              <div className="auth-form__field">
                <label>Create Password</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="Min. 8 characters"
                  />
                </div>
                {errors.password && (
                  <span
                    className="auth-form__error"
                    style={{ background: 'none', border: 'none', padding: '0', marginTop: '4px' }}
                  >
                    {errors.password.message}
                  </span>
                )}
              </div>

              <div className="signup-info-card">
                <Sprout size={18} color="#22c55e" />
                <p>By joining, you agree to our Terms of Service and Privacy Policy.</p>
              </div>

              <button
                className="btn btn--primary btn--full btn--pay"
                onClick={onNextStep}
                disabled={isSyncing}
              >
                {isSyncing ? 'Creating profile…' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="signup-step signup-step--form">
            <div className="signup-step__header">
              <h2 className="auth-page__title">One last thing</h2>
              <p className="auth-page__subtitle">
                Help us verify your residential record to build your credit score.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit(onFinalSubmit)}>
              <div className="auth-form__field">
                <label>Current Address</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input
                    {...register('address')}
                    type="text"
                    placeholder="House No, Street, City"
                  />
                </div>
              </div>

              <div className="auth-form__field">
                <label>Rent Anniversary</label>
                <div className="input-with-icon">
                  <Calendar size={18} />
                  <input {...register('rentAnniversary')} type="date" />
                </div>
              </div>

              <button
                className="btn btn--primary btn--full btn--pay"
                type="submit"
                disabled={isSyncing}
              >
                {isSyncing ? 'Finalizing…' : 'Go to Dashboard'}{' '}
                <CheckCircle2 size={18} style={{ marginLeft: '8px' }} />
              </button>
            </form>
          </div>
        )}

        {step !== 3 && (
          <div className="auth-page__alt">
            Already have an account? <button onClick={() => router.push('/login')}>Sign in</button>
          </div>
        )}
      </div>
    </div>
  )
}
