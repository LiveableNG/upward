'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { useLogin } from '@/features/auth/hooks/useLogin'
import FallbackSuspense from '@/components/FallbackSuspense'
import { UpwardLogo } from '@/components/PoweredByUpward'
import {
  TrendingUp,
  Gift,
  Shield,
  ArrowRight,
  ArrowLeft,
  Mail,
  User,
  Lock,
  Phone,
  LogIn,
  UserPlus,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react'

/* ─── benefit slides ─── */
const BENEFITS = [
  {
    icon: TrendingUp,
    color: '#22c55e',
    title: 'Build Your Credit',
    desc: 'Monthly rent payments are reported to credit bureaus — boosting your financial score effortlessly.',
  },
  {
    icon: Gift,
    color: '#d97757',
    title: 'Earn Rewards',
    desc: 'Every on-time payment earns Upward points redeemable for rent discounts and exclusive perks.',
  },
  {
    icon: Shield,
    color: '#6366f1',
    title: 'Verified Tenancy',
    desc: 'Get a tamper-proof digital record of your tenancy history — trusted by future landlords instantly.',
  },
  {
    icon: CheckCircle2,
    color: '#0ea5e9',
    title: 'Secure Payments',
    desc: 'Bank-grade encryption on every transaction. Your money and data stay protected, always.',
  },
]

type Mode = 'welcome' | 'signup' | 'login'
type SignupStep = 1 | 2 | 3
type LoginStep = 1 | 2

/* ─── Terms footer ─── */
function TermsFooter() {
  return (
    <p className="auth-terms">
      By proceeding you agree to our{' '}
      <a href="https://upward.goodtenants.io/legal/terms" target="_blank" rel="noopener noreferrer">
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        href="https://upward.goodtenants.io/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
    </p>
  )
}

/* ─── Benefits Carousel ─── */
function BenefitsCarousel() {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % BENEFITS.length)
    }, 3200)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const slide = BENEFITS[active]
  const Icon = slide.icon

  return (
    <div className="benefit-carousel">
      <div className="benefit-carousel__track" key={active}>
        <div
          className="benefit-carousel__icon-ring"
          style={{ '--accent': slide.color } as React.CSSProperties}
        >
          <Icon size={30} color={slide.color} strokeWidth={2} />
        </div>
        <h2 className="benefit-carousel__title">{slide.title}</h2>
        <p className="benefit-carousel__desc">{slide.desc}</p>
      </div>

      {/* Dot indicators */}
      <div className="benefit-carousel__dots">
        {BENEFITS.map((_, i) => (
          <button
            key={i}
            className={`benefit-carousel__dot ${i === active ? 'is-active' : ''}`}
            onClick={() => {
              setActive(i)
              if (timerRef.current) clearInterval(timerRef.current)
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Progress bar ─── */
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="step-progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`step-progress__pip ${i < current ? 'is-done' : i === current - 1 ? 'is-active' : ''}`}
        />
      ))}
    </div>
  )
}

/* ─── Main page ─── */
function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, loading } = useAuth()
  const { signup, loading: signupLoading, error: signupError } = useSignup('/dashboard')
  const { login: doLogin, loading: loginLoading, error: loginError } = useLogin('/dashboard')

  const initialMode: Mode = searchParams.get('mode') === 'login' ? 'login' : 'welcome'
  const [mode, setMode] = useState<Mode>(initialMode)

  // Signup fields
  const [sStep, setSStep] = useState<SignupStep>(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  // Login fields
  const [lStep, setLStep] = useState<LoginStep>(1)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  useEffect(() => {
    if (!loading && isLoggedIn) router.push('/dashboard')
  }, [isLoggedIn, loading, router])

  if (loading) return <FallbackSuspense message="Getting ready…" />

  /* ── Welcome screen ── */
  if (mode === 'welcome') {
    return (
      <div className="auth-shell auth-shell--welcome">
        {/* Logo */}
        <div className="auth-shell__logo">
          <UpwardLogo size={36} color="var(--clay)" />
        </div>

        {/* Animated carousel */}
        <BenefitsCarousel />

        {/* CTA buttons */}
        <div className="auth-shell__ctas">
          <button
            id="btn-create-account"
            className="auth-cta auth-cta--primary"
            onClick={() => setMode('signup')}
          >
            <UserPlus size={18} />
            Create Account
          </button>
          <button
            id="btn-login"
            className="auth-cta auth-cta--secondary"
            onClick={() => setMode('login')}
          >
            <LogIn size={18} />
            Log In
          </button>
        </div>

        <TermsFooter />
      </div>
    )
  }

  /* ── Login flow ── */
  if (mode === 'login') {
    return (
      <div className="auth-shell auth-shell--login">
        <div className="auth-shell__top">
          <button
            className="auth-shell__back"
            onClick={() => {
              setMode('welcome')
              setLStep(1)
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <StepProgress current={lStep} total={2} />
        </div>

        <div className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </div>

        {lStep === 1 && (
          <div className="auth-stage" key="login-1">
            <div className="auth-stage__header">
              <h1 className="auth-stage__title">Welcome back</h1>
              <p className="auth-stage__subtitle">Enter the email tied to your Upward account.</p>
            </div>
            <div className="auth-form">
              <div className="auth-form__field">
                <label htmlFor="login-email">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={17} />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="sarah@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                id="login-next"
                className="btn btn--primary btn--full btn--pay"
                disabled={!loginEmail}
                onClick={() => setLStep(2)}
              >
                Continue <ArrowRight size={17} />
              </button>
            </div>
            <TermsFooter />
          </div>
        )}

        {lStep === 2 && (
          <div className="auth-stage" key="login-2">
            <div className="auth-stage__header">
              <button className="auth-stage__back-sm" onClick={() => setLStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="auth-stage__title">Enter your password</h2>
              <p className="auth-stage__subtitle">{loginEmail}</p>
            </div>
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault()
                doLogin(loginEmail, loginPassword)
              }}
            >
              {loginError && <div className="auth-form__error">{loginError}</div>}
              <div className="auth-form__field">
                <label htmlFor="login-password">Password</label>
                <div className="input-with-icon">
                  <Lock size={17} />
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                  />
                </div>
              </div>
              <button
                id="login-submit"
                className="btn btn--primary btn--full btn--pay"
                type="submit"
                disabled={loginLoading || !loginPassword}
              >
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <TermsFooter />
          </div>
        )}
      </div>
    )
  }

  /* ── Signup flow ── */
  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__top">
        <button
          className="auth-shell__back"
          onClick={() => {
            if (sStep === 1) {
              setMode('welcome')
            } else {
              setSStep((s) => (s - 1) as SignupStep)
            }
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <StepProgress current={sStep} total={3} />
      </div>

      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      {sStep === 1 && (
        <div className="auth-stage" key="signup-1">
          <div className="auth-stage__header">
            <h1 className="auth-stage__title">Create your account</h1>
            <p className="auth-stage__subtitle">Let's start with your name and email address.</p>
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
              onClick={() => setSStep(2)}
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
          <TermsFooter />
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
              onClick={() => setSStep(3)}
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
          <TermsFooter />
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
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              signup({ email, password, fullName, phone })
            }}
          >
            {signupError && <div className="auth-form__error">{signupError}</div>}
            <div className="auth-form__field">
              <label htmlFor="signup-password">Create Password</label>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              id="signup-submit"
              className="btn btn--primary btn--full btn--pay"
              type="submit"
              disabled={signupLoading || !password || password.length < 8}
            >
              {signupLoading ? 'Creating account…' : 'Complete Setup'}
            </button>
          </form>
          <TermsFooter />
        </div>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading…" />}>
      <SignupPageContent />
    </Suspense>
  )
}
