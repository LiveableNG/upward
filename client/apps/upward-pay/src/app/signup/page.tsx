'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { setToken, setTenant } from '@/lib/auth'
import { 
  CheckCircle2, CreditCard, Shield, TrendingUp, Gift, 
  ArrowRight, ArrowLeft, Mail, User, Lock, Phone, 
  ChevronRight, Sprout, Star
} from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

// Steps: 0 (Benefits), 1 (Personal Info), 2 (Security)
type Step = 0 | 1 | 2

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const prefillName = searchParams.get('name') || ''
  
  const [step, setStep] = useState<Step>(0)
  const [email, setEmail] = useState(prefillEmail)
  const [fullName, setFullName] = useState(prefillName)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const nextStep = () => setStep((s) => (s + 1) as Step)
  const prevStep = () => setStep((s) => (s - 1) as Step)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !fullName) {
       setError('Please fill in all required fields')
       return
    }

    setLoading(true)
    setError('')

    try {
      const result = await api.signup({ email, password, fullName, phone })
      setToken(result.accessToken)
      setTenant(result.tenant)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Build Your Credit',
      desc: 'Monthly rent payments help build your financial score.',
      color: '#22c55e'
    },
    {
      icon: Gift,
      title: 'Earn Rewards',
      desc: 'Get points on every on-time payment towards future deals.',
      color: '#d97757'
    },
    {
      icon: Shield,
      title: 'Verified Tenancy',
      desc: 'Instant digital record of your tenancy for future landlords.',
      color: '#3b82f6'
    }
  ]

  return (
    <div className="auth-page auth-page--multi-step">
      <header className="auth-page__header">
        <PoweredByUpward />
        <div className="signup-progress">
           <div className={`signup-progress__bar ${step === 0 ? 'w-0' : step === 1 ? 'w-1/2' : 'w-full'}`}></div>
           <div className="signup-progress__dots">
              {[0, 1, 2].map(s => (
                <div key={s} className={`signup-progress__dot ${step === s ? 'is-active' : step > s ? 'is-done' : ''}`} />
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
               <p className="auth-page__subtitle">Join thousands of tenants using Upward to simplify their living experience.</p>
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

            <button className="btn btn--primary btn--full btn--pay" onClick={nextStep} style={{ marginTop: 'auto' }}>
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
               <p className="auth-page__subtitle">We'll use this to set up your profile and verified rent records.</p>
            </div>

            <div className="auth-form">
               <div className="auth-form__field">
                 <label>Full Name</label>
                 <div className="input-with-icon">
                    <User size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah Johnson" 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                 </div>
               </div>

               <div className="auth-form__field">
                 <label>Email Address</label>
                 <div className="input-with-icon">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      placeholder="sarah@email.com" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                 </div>
               </div>

               <div className="auth-form__field">
                 <label>Phone Number</label>
                 <div className="input-with-icon">
                    <Phone size={18} />
                    <input 
                      type="tel" 
                      placeholder="+234 800 000 0000" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                 </div>
               </div>

               <button className="btn btn--primary btn--full btn--pay" onClick={nextStep} disabled={!fullName || !email}>
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
               <p className="auth-page__subtitle">Create a strong password to protect your payment history.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
               {error && <div className="auth-form__error">{error}</div>}

               <div className="auth-form__field">
                 <label>Create Password</label>
                 <div className="input-with-icon">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      placeholder="Min. 8 characters" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                 </div>
               </div>

               <div className="signup-info-card">
                  <Sprout size={18} color="#22c55e" />
                  <p>By joining, you agree to our Terms of Service and Privacy Policy.</p>
               </div>

               <button className="btn btn--primary btn--full btn--pay" type="submit" disabled={loading || !password}>
                 {loading ? 'Creating profile…' : 'Complete Setup'}
               </button>
            </form>
          </div>
        )}

        <div className="auth-page__alt">
          Already have an account?{' '}
          <button onClick={() => router.push('/login')}>Sign in</button>
        </div>
      </div>
      
      <div className="auth-page__footer">
        <PoweredByUpward className="pay-page__footer-badge" />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <UpwardLogo size={28} color="#fff" />
            </div>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
