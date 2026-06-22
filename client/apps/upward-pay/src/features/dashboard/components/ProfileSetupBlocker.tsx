'use client'

import {
  Bell,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Home,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/common/UserAvatar'
import { type UserProfile } from '@/features/auth/types'
import {
  getStandalonePhonePath,
  getStandaloneRentalPath,
  hasPhone,
  hasRentalInfo,
} from '../utils/profileCompletion'

interface ProfileSetupBlockerProps {
  user: UserProfile
  score?: number
  profileCompletion?: number
  onSkip: () => void
}

const SCORE_MAX = 900

type SetupStepId = 'rental' | 'phone'

function getActiveStepId(user: UserProfile): SetupStepId {
  if (!hasRentalInfo(user)) return 'rental'
  if (!hasPhone(user)) return 'phone'
  return 'rental'
}

export function ProfileSetupBlocker({ user, score = 0, profileCompletion = 0, onSkip }: ProfileSetupBlockerProps) {
  const router = useRouter()
  const firstName = user.firstName || 'there'

  const rentalDone = hasRentalInfo(user)
  const phoneDone = hasPhone(user)
  const activeStepId = getActiveStepId(user)

  const displayScore = score > 0 ? score : 300
  const ringPct = Math.min(100, Math.max(profileCompletion || (displayScore / SCORE_MAX) * 100, 12))

  const stepPaths: Record<SetupStepId, string> = {
    rental: getStandaloneRentalPath(),
    phone: getStandalonePhonePath(),
  }

  const steps: Array<{
    id: SetupStepId
    label: string
    done: boolean
    isAction: boolean
    onPress?: () => void
  }> = [
    {
      id: 'rental',
      label: 'Add your rental details',
      done: rentalDone,
      isAction: !rentalDone,
      onPress: () => router.push(stepPaths.rental),
    },
    {
      id: 'phone',
      label: 'Add your phone number',
      done: phoneDone,
      isAction: !phoneDone,
      onPress: () => router.push(stepPaths.phone),
    },
  ]

  const quickActions = [
    { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent' },
    { label: 'Save Rent', icon: PiggyBank, href: '/dashboard/savings' },
    { label: 'Save Home', icon: Home, href: '/dashboard/savings' },
  ]

  return (
    <div className="profile-setup-blocker" role="dialog" aria-modal="true" aria-label="Complete your profile setup">
      <header className="profile-setup-blocker__header">
        <div className="dashboard__header-left dashboard__header-left--user">
          <button
            type="button"
            className="profile-setup-blocker__avatar-btn dashboard__avatar"
            onClick={() => router.push('/dashboard/me')}
            aria-label="Open profile"
          >
            <UserAvatar src={user.profilePic} alt={firstName} size={44} />
          </button>
          <div className="dashboard__greeting-block">
            <span className="dashboard__greeting-eyebrow">Hey,</span>
            <div className="dashboard__greeting">
              <span className="dashboard__greeting-name">{firstName}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="dashboard__icon-btn dashboard__icon-btn--notif"
          onClick={() => router.push('/dashboard/notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </header>

      <div className="profile-setup-blocker__scroll">
        <div className="profile-setup-blocker__body">
          <div
            className="profile-setup-blocker__score-card"
            style={{ '--ring-pct': `${ringPct}%` } as React.CSSProperties}
          >
            <div className="profile-setup-blocker__score-top">
              <div className="profile-setup-blocker__score-labels">
                <span className="profile-setup-blocker__score-eyebrow">Your Upward Score</span>
                <span className="profile-setup-blocker__score-sub">Rent Passport · Starter</span>
              </div>
              <span className="profile-setup-blocker__badge">NEW</span>
            </div>

            <div className="profile-setup-blocker__score-main">
              <div className="profile-setup-blocker__ring" aria-hidden="true">
                <div className="profile-setup-blocker__ring-disc">
                  <span className="profile-setup-blocker__ring-score">{displayScore}</span>
                  <span className="profile-setup-blocker__ring-max">/ {SCORE_MAX}</span>
                </div>
              </div>

              <div className="profile-setup-blocker__setup-copy">
                <h2>Complete your setup</h2>
                <p>Unlock your true score potential in 60 seconds.</p>
                <span className="profile-setup-blocker__pts-hint">✦ +50 pts on verification</span>
              </div>
            </div>

            <div className="profile-setup-blocker__divider" aria-hidden="true" />

            <div className="profile-setup-blocker__steps">
              {steps.map((step, idx) => {
                const isActive = step.id === activeStepId && !step.done
                const StepTag = step.isAction ? 'button' : 'div'

                return (
                  <StepTag
                    key={step.id}
                    type={step.isAction ? 'button' : undefined}
                    className={[
                      'profile-setup-blocker__step',
                      isActive && 'profile-setup-blocker__step--active',
                      step.done && 'profile-setup-blocker__step--done',
                      step.isAction && 'profile-setup-blocker__step--action',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={step.isAction ? step.onPress : undefined}
                    disabled={step.isAction ? step.done : undefined}
                  >
                    <span className="profile-setup-blocker__step-num">{idx + 1}</span>
                    <span className="profile-setup-blocker__step-label">{step.label}</span>
                    {step.isAction && !step.done && (
                      <ChevronRight size={16} className="profile-setup-blocker__step-chevron" />
                    )}
                  </StepTag>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            className="profile-setup-blocker__cta"
            onClick={() => router.push(stepPaths[activeStepId])}
          >
            Complete Setup — 60 Seconds <span aria-hidden="true">→</span>
          </button>

          <div className="profile-setup-blocker__quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  type="button"
                  className="profile-setup-blocker__quick-action"
                  onClick={() => router.push(action.href)}
                >
                  <span className="profile-setup-blocker__quick-action-icon">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="profile-setup-blocker__quick-action-label">{action.label}</span>
                </button>
              )
            })}
          </div>

          <div className="profile-setup-blocker__nudge">
            <span className="profile-setup-blocker__nudge-icon" aria-hidden="true">
              <TrendingUp size={18} />
            </span>
            <div>
              <div className="profile-setup-blocker__nudge-title">Path to Home Ownership</div>
              <div className="profile-setup-blocker__nudge-desc">
                3 on-time payments = a stronger profile for lenders.
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="profile-setup-blocker__footer">
        <button type="button" className="profile-setup-blocker__skip" onClick={onSkip}>
          Skip for now — go to dashboard
        </button>
      </footer>
    </div>
  )
}
