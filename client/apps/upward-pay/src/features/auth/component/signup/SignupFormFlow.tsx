'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  User,
  Mail,
  ArrowRight,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Home,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useSignup } from '@/features/auth/hooks/useSignup'
import DateInput from '@/components/common/DateInput'
import LocationPicker from '@/components/common/LocationPicker'

interface SignupFormFlowProps {
  onBackToWelcome: () => void
  onSignupSuccess: () => void
}

export function SignupFormFlow({ onBackToWelcome, onSignupSuccess }: SignupFormFlowProps) {
  const { signup, loading: signupLoading, error: signupError } = useSignup('', onSignupSuccess)

  const [sStep, setSStep] = useState<1 | 2 | 3 | 4>(1)

  useEffect(() => {
    // Scroll to top on steps
    window.scrollTo(0, 0)
  }, [sStep])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // New fields
  const [rentAnniversary, setRentAnniversary] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [streetAddress, setStreetAddress] = useState('')

  const handleNext = () => {
    if (sStep < 4) setSStep((s) => (s + 1) as 1 | 2 | 3 | 4)
  }

  const handleBack = () => {
    if (sStep === 1) {
      onBackToWelcome()
    } else {
      setSStep((s) => (s - 1) as 1 | 2 | 3 | 4)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    signup({ 
      email, 
      password, 
      fullName, 
      phone,
      rentAnniversary,
      city,
      country,
      address: `${streetAddress}, ${city}, ${country}` // Formatting as string as requested
    })
  }

  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__top">
        <button className="auth-shell__back" onClick={handleBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="step-progress">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`step-progress__pip ${i <= sStep ? 'is-active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      {sStep === 1 && (
        <div className="auth-stage" key="signup-1">
          <div className="auth-stage__header">
            <h1 className="auth-stage__title">Create your account</h1>
            <p className="auth-stage__subtitle">Let&apos;s start with your name and email address.</p>
          </div>
          <div className="auth-form">
            <div className="auth-form__field">
              <label htmlFor="signup-name">Full Name</label>
              <div className="input-with-icon">
                <User size={17} />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="e.g. Sarah Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
            <div className="auth-form__field">
              <label htmlFor="signup-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="sarah@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <button
              id="signup-step1-next"
              className="btn btn--primary btn--full btn--pay"
              disabled={!fullName || !email}
              onClick={handleNext}
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {sStep === 2 && (
        <div className="auth-stage" key="signup-2">
          <div className="auth-stage__header">
            <h2 className="auth-stage__title">Phone number</h2>
            <p className="auth-stage__subtitle">
              We&apos;ll use this for account security and rent alerts.
            </p>
          </div>
          <div className="auth-form">
            <div className="auth-form__field">
              <label htmlFor="signup-phone">Phone Number</label>
              <div className="input-with-icon">
                <Phone size={17} />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
            <button
              id="signup-step2-next"
              className="btn btn--primary btn--full btn--pay"
              onClick={handleNext}
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {sStep === 3 && (
        <div className="auth-stage" key="signup-3">
          <div className="auth-stage__header">
            <h2 className="auth-stage__title">Secure your account</h2>
            <p className="auth-stage__subtitle">
              Create a strong password to protect your payment history.
            </p>
          </div>
          <div className="auth-form">
            <div className="auth-form__field">
              <label htmlFor="signup-password">Create Password</label>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              id="signup-step3-next"
              className="btn btn--primary btn--full btn--pay"
              disabled={!password || password.length < 8}
              onClick={handleNext}
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {sStep === 4 && (
        <div className="auth-stage" key="signup-4">
          <div className="auth-stage__header">
            <h2 className="auth-stage__title">Almost there!</h2>
            <p className="auth-stage__subtitle">
              Help us personalize your experience with your rent details.
            </p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {signupError && <div className="auth-form__error">{signupError}</div>}
            
            <DateInput 
              id="rent-anniversary"
              label="When does your current rent expire?"
              value={rentAnniversary}
              onChange={setRentAnniversary}
              required
            />

            <div className="mt-4">
              <LocationPicker 
                country={country}
                city={city}
                onCountryChange={setCountry}
                onCityChange={setCity}
              />
            </div>

            <div className="auth-form__field mt-4">
              <label htmlFor="street-address">House No / Street</label>
              <div className="input-with-icon">
                <Home size={17} />
                <input
                  id="street-address"
                  type="text"
                  placeholder="e.g. 24, Admiralty Way"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              id="signup-submit"
              className="btn btn--primary btn--full btn--pay mt-6"
              type="submit"
              disabled={signupLoading || !rentAnniversary || !country || !city || !streetAddress}
            >
              {signupLoading ? 'Creating account…' : 'Complete Setup'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
