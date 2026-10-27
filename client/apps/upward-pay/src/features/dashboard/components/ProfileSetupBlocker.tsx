'use client'

import { useEffect } from 'react'
import {
  Bell,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Home,
  ArrowRight,
  Lock,
  Check,
  User,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useAuth } from '@/features/auth/AuthContext'
import { type UserProfile } from '@/features/auth/types'
import {
  getIdentityVerificationPath,
  getStandalonePhonePath,
  getStandaloneRentalPath,
  hasContactDetails,
  hasRentalInfo,
  needsIdentityVerification,
} from '../utils/profileCompletion'
import { isSavingsWalletEnabled } from '../utils/savingsWallet'
import { useRentalExperiment } from '../setup/hooks/useRentalExperiment'
import { useRentalGate } from '../setup/hooks/useRentalGate'

interface ProfileSetupBlockerProps {
  user: UserProfile
  score?: number
  maxScore?: number
  profileCompletion?: number
  onSkip: () => void
}

type SetupStepId = 'rental' | 'phone' | 'identity'

interface SetupStep {
  id: SetupStepId
  label: string
  hint: string
  icon: typeof Home
  done: boolean
  href: string
}

interface QuickAction {
  label: string
  icon: typeof Home
  href: string
  comingSoon?: boolean
}

export function ProfileSetupBlocker({ user, score, maxScore, onSkip }: ProfileSetupBlockerProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const { trackExposure, trackDeferral } = useRentalExperiment()
  const { isGated, guard, notifyGated } = useRentalGate()

  useEffect(() => {
    trackExposure('ProfileSetupBlocker')
  }, [trackExposure])

  const firstName = user.firstName || 'there'
  const rentalDone = hasRentalInfo(user)
  const showIdentityStep = (user.verificationOn ?? true) && !isGated

  const steps: SetupStep[] = [
    {
      id: 'rental',
      label: 'Rental details',
      hint: isGated ? 'Required' : 'About 1 min',
      icon: Home,
      done: rentalDone,
      href: getStandaloneRentalPath(),
    },
    {
      id: 'phone',
      label: 'Personal details',
      hint: 'Phone & date of birth',
      icon: User,
      done: hasContactDetails(user),
      href: getStandalonePhonePath(),
    },
    ...(showIdentityStep
      ? [
          {
            id: 'identity' as const,
            label: 'Verify identity',
            hint: 'Boosts your score',
            icon: ShieldCheck,
            done: !needsIdentityVerification(user),
            href: getIdentityVerificationPath(),
          },
        ]
      : []),
  ]

  const nextStep = steps.find((s) => !s.done) ?? steps[0]!
  const completedCount = steps.filter((s) => s.done).length

  const quickActions: QuickAction[] = [
    { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent' },
    { label: 'Save for Home', icon: Home, href: '/dashboard/save-for-home' },
    { label: 'Save Rent', icon: PiggyBank, href: '/dashboard/savings' },
  ]

  const title = isGated ? 'Add your rental details' : `Welcome, ${firstName}`
  const subtitle = isGated
    ? 'Takes about a minute. Unlocks rent payments, savings and your Rent Passport.'
    : 'Finish setup to unlock your full Upward Score.'

  return (
    <div className="setup-gate" role="dialog" aria-modal="true" aria-labelledby="setup-gate-title">
      <header className="setup-gate__header">
        <button
          type="button"
          className="setup-gate__avatar"
          onClick={() => router.push('/dashboard/me')}
          aria-label="Open profile"
        >
          <UserAvatar src={user.profilePic} alt={firstName} size={38} />
        </button>
        <button
          type="button"
          className="setup-gate__icon-btn"
          onClick={() => guard('notifications', () => router.push('/dashboard/notifications'))}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </header>

      <div className="setup-gate__scroll">
        <div className="setup-gate__body">
          <section className="setup-gate__hero">
            <div className="setup-gate__hero-top">
              <span className="setup-gate__hero-icon" aria-hidden="true">
                <Home size={22} strokeWidth={2.2} />
              </span>
              {score !== undefined && (
                <span className="setup-gate__score-chip">
                  <strong>{score}</strong>
                  {maxScore ? <span>/ {maxScore}</span> : null}
                </span>
              )}
            </div>
            <h1 id="setup-gate-title" className="setup-gate__title">
              {title}
            </h1>
            <p className="setup-gate__subtitle">{subtitle}</p>
            <div
              className="setup-gate__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={completedCount}
              aria-label="Setup progress"
            >
              {steps.map((s) => (
                <span
                  key={s.id}
                  className={`setup-gate__progress-seg${s.done ? ' setup-gate__progress-seg--done' : ''}`}
                />
              ))}
            </div>
          </section>

          <ul className="setup-gate__list">
            {steps.map((step) => {
              const Icon = step.icon
              const isNext = step.id === nextStep.id && !step.done
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    className={[
                      'setup-gate__row',
                      isNext && 'setup-gate__row--next',
                      step.done && 'setup-gate__row--done',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => router.push(step.href)}
                    disabled={step.done}
                  >
                    <span className="setup-gate__row-icon" aria-hidden="true">
                      {step.done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                    </span>
                    <span className="setup-gate__row-text">
                      <span className="setup-gate__row-label">{step.label}</span>
                      <span className="setup-gate__row-hint">{step.done ? 'Done' : step.hint}</span>
                    </span>
                    {!step.done && <ChevronRight size={16} className="setup-gate__row-chevron" />}
                  </button>
                </li>
              )
            })}
          </ul>

          <section className="setup-gate__actions" aria-label={isGated ? 'Locked features' : 'Quick actions'}>
            <h2 className="setup-gate__section-label">
              {isGated ? 'Unlocks after setup' : 'Quick actions'}
            </h2>
            <div className="setup-gate__tiles">
              {quickActions.map((action) => {
                const Icon = action.icon
                const locked = isGated || !!action.comingSoon
                return (
                  <button
                    key={action.label}
                    type="button"
                    className={`setup-gate__tile${locked ? ' setup-gate__tile--locked' : ''}`}
                    aria-disabled={locked ? 'true' : undefined}
                    onClick={() => {
                      if (action.comingSoon) return
                      if (isGated) {
                        notifyGated(action.label)
                        return
                      }
                      router.push(action.href)
                    }}
                  >
                    <span className="setup-gate__tile-icon">
                      <Icon size={18} strokeWidth={2} />
                      {isGated && !action.comingSoon && (
                        <span className="setup-gate__tile-lock" aria-hidden="true">
                          <Lock size={9} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="setup-gate__tile-label">{action.label}</span>
                    {action.comingSoon && <span className="setup-gate__tile-soon">Soon</span>}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      <footer className="setup-gate__footer">
        <button type="button" className="setup-gate__cta" onClick={() => router.push(nextStep.href)}>
          <span>{isGated ? 'Add rental details' : 'Continue setup'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {isGated ? (
          <button type="button" className="setup-gate__text-btn" onClick={logout}>
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="setup-gate__text-btn"
            onClick={() => {
              trackDeferral('profile_blocker_footer')
              onSkip()
            }}
          >
            I&apos;ll do this later
          </button>
        )}
      </footer>
    </div>
  )
}
