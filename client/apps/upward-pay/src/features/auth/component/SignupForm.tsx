'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignup } from '../hooks/useSignup'
import {
  TrendingUp,
  Gift,
  Shield,
  ArrowRight,
  ArrowLeft,
  Mail,
  User,
  Lock,
  ChevronRight,
  Sprout,
  Star,
  Calendar,
} from 'lucide-react'

type Step = 0 | 1 | 2 | 3

export default function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const prefillName = searchParams.get('name') || ''

  const [step, setStep] = useState<Step>(0)
  const [email, setEmail] = useState(prefillEmail)
  const [fullName, setFullName] = useState(prefillName)
  const [properties, setProperties] = useState<Array<{
    address: string;
    rentEndDate: string;
    companyName?: string;
    managerName?: string;
  }>>([{ address: '', rentEndDate: '', companyName: '', managerName: '' }])
  const [password, setPassword] = useState('')

  const { signup, loading, error } = useSignup('/dashboard')

  const nextStep = () => setStep((s) => (s + 1) as Step)
  const prevStep = () => setStep((s) => (s - 1) as Step)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    signup({ email, password, firstName, lastName, properties })
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

  const progressWidth = (step / 3) * 100

  return (
    <div className="auth-page__content">
      <div className="signup-progress mb-8">
        <div
          className="signup-progress__bar"
          style={{ width: `${progressWidth}%` }}
        ></div>
        <div className="signup-progress__dots">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`signup-progress__dot ${step === s ? 'is-active' : step > s ? 'is-done' : ''}`}
            />
          ))}
        </div>
      </div>

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
              We&apos;ll use this to set up your profile and verified rent records.
            </p>
          </div>

          <div className="auth-form">
            <div className="auth-form__field">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Sarah Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-form__field">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn--primary btn--full btn--pay"
              onClick={nextStep}
              disabled={!fullName || !email}
            >
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
            <h2 className="auth-page__title">Where do you live?</h2>
            <p className="auth-page__subtitle">
              Add your current property details. You can add more than one if you have multiple places.
            </p>
          </div>

          <div className="auth-form pb-8">
            {properties.map((prop, index) => (
              <div key={index} className="property-item mb-8 p-4 border rounded-2xl bg-white/50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400">
                    Property {index + 1}
                  </h4>
                  {properties.length > 1 && (
                    <button 
                      className="text-red-500 text-xs font-semibold"
                      onClick={() => setProperties(properties.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="auth-form__field">
                  <label>Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Baker Street"
                    value={prop.address}
                    onChange={(e) => {
                      const newProps = [...properties]
                      newProps[index].address = e.target.value
                      setProperties(newProps)
                    }}
                    required
                  />
                </div>

                <div className="auth-form__field mt-4">
                  <label>Rent Due Date</label>
                  <div className="input-with-icon">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={prop.rentEndDate}
                      onChange={(e) => {
                        const newProps = [...properties]
                        newProps[index].rentEndDate = e.target.value
                        setProperties(newProps)
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="auth-form__field mt-4">
                  <label>Company/Agent (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Baker Realty"
                    value={prop.companyName}
                    onChange={(e) => {
                      const newProps = [...properties]
                      newProps[index].companyName = e.target.value
                      setProperties(newProps)
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn--outline btn--full mb-6"
              onClick={() => setProperties([...properties, { address: '', rentEndDate: '', companyName: '', managerName: '' }])}
            >
              + Add Another Property
            </button>

            <button
              className="btn btn--primary btn--full btn--pay"
              onClick={nextStep}
              disabled={properties.some(p => !p.address || !p.rentEndDate)}
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
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

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-form__error">{error}</div>}

            <div className="auth-form__field">
              <label htmlFor="password">Create Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="signup-info-card mt-4 mb-4">
              <Sprout size={18} color="#22c55e" />
              <p className="text-sm text-gray-400">
                By joining, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <button
              className="btn btn--primary btn--full btn--pay"
              type="submit"
              disabled={loading || !password}
            >
              {loading ? 'Creating profile…' : 'Complete Setup'}
            </button>
          </form>
        </div>
      )}

      <div className="auth-page__alt mt-6 text-center">
        Already have an account?{' '}
        <button className="text-secondary font-semibold" onClick={() => router.push('/login')}>
          Sign in
        </button>
      </div>
    </div>
  )
}
