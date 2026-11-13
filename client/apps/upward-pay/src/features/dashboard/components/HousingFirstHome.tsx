'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  PiggyBank,
  ShieldCheck,
  Home,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { type UserProfile } from '@/features/auth/types'
import { type PendingPayment } from '../types'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { formatCurrency, formatDate } from '@/lib/utils'

interface HousingFirstHomeProps {
  user: UserProfile
  credScore: number
  maxScore: number
  pendingPaymentsCount: number
  pendingPayments?: PendingPayment[]
  gtBillsCount: number
  anyOverdue: boolean
  benefitsActive: boolean
  benefitsEndsAt?: string | null
  onOpenGoalsMockup: (initialCategory?: string) => void
}

function renderScoreRing(score: number, maxScore: number, size = 42) {
  const max = maxScore || 900
  const val = score || 500
  const pct = Math.min(100, Math.max(4, Math.round((val / max) * 100)))

  return (
    <div
      className="score-pill__ring"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: `conic-gradient(#fff 0% ${pct}%, rgba(255, 255, 255, 0.25) ${pct}% 100%)`,
        flexShrink: 0,
      }}
    >
      <div
        className="score-pill__ring-inner"
        style={{
          width: size - 10,
          height: size - 10,
          borderRadius: '50%',
          background: 'var(--skin-primary, #c2501f)',
        }}
      />
    </div>
  )
}

function renderGoalRing(pct: number, size = 40) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const filled = circ * (Math.min(100, Math.max(0, pct)) / 100)
  const isFilled = pct > 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ede8e2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFilled ? 'var(--clay, #c2501f)' : '#ede8e2'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '9.5px',
          fontWeight: 800,
          color: 'var(--text)',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function HousingFirstHome({
  user,
  credScore,
  maxScore,
  pendingPaymentsCount,
  pendingPayments = [],
  gtBillsCount,
  anyOverdue,
  benefitsActive,
  benefitsEndsAt,
  onOpenGoalsMockup,
}: HousingFirstHomeProps) {
  const router = useRouter()
  const { data: vault } = useRentVault()

  // Housing section modes: 'default' | 'compact' | 'full'
  const [housingMode, setHousingMode] = useState<'default' | 'compact' | 'full'>('default')

  const targetRent = vault?.target_amount_kobo
    ? vault.target_amount_kobo / 100
    : 4000000
  const currentSaved = vault?.current_balance_kobo
    ? vault.current_balance_kobo / 100
    : 463636
  const vaultPct =
    targetRent > 0 ? Math.min(100, Math.round((currentSaved / targetRent) * 100)) : 12

  // Determine top pending payment details for outstanding payment alert chip
  const firstPending = pendingPayments[0]
  const pendingAmount = firstPending
    ? (firstPending.total_amount ?? (firstPending as any).amount ?? 4000000)
    : 4000000
  const pendingAmountFormatted = firstPending
    ? formatCurrency(pendingAmount, firstPending.currency || 'NGN')
    : '₦4,000,000'
  const pendingDueDate = firstPending?.due_date
    ? formatDate(firstPending.due_date)
    : '4 Nov'

  const toggleCollapse = () => {
    setHousingMode((prev) => (prev === 'compact' ? 'default' : 'compact'))
  }

  const toggleExpand = () => {
    setHousingMode((prev) => (prev === 'full' ? 'default' : 'full'))
  }

  return (
    <div className="housing-first-home">
      {/* 1. Quick Action Banners (Horizontal scrolling row) */}
      <div className="alert-row" aria-label="Alerts">
        <button
          type="button"
          className="alert-chip alert-chip--critical"
          onClick={() => router.push('/dashboard/pay-rent')}
        >
          <div className="alert-chip__title">Outstanding Payment</div>
          <div className="alert-chip__meta">
            {pendingAmountFormatted} past due · Due {pendingDueDate}
          </div>
          <div className="alert-chip__cta">Pay Now →</div>
        </button>

        <button
          type="button"
          className="alert-chip alert-chip--protect"
          onClick={() => router.push('/dashboard/benefits')}
        >
          <div className="alert-chip__title">
            {benefitsActive ? "You're covered" : 'Add account protection'}
          </div>
          <div className="alert-chip__meta">
            {benefitsActive
              ? benefitsEndsAt
                ? `Renews ${formatDate(benefitsEndsAt)} · View benefits`
                : 'Annual cover active for your Upward account'
              : 'Annual cover for your Upward account'}
          </div>
          <div className="alert-chip__cta">
            {benefitsActive ? 'View Benefits →' : 'Activate →'}
          </div>
        </button>
      </div>

      {/* 2. Main Accordion Card: "Making housing easier" */}
      <section
        className={`housing-acc housing-acc--${housingMode}`}
        aria-label="Housing"
      >
        <div className="housing-acc__head">
          <div className="housing-acc__titles">
            <h1 className="housing-acc__title">Making housing easier</h1>
            <span className="housing-acc__tag">Housing goals</span>
          </div>
          <div className="housing-acc__controls">
            <button
              type="button"
              className="housing-acc__ctrl"
              onClick={toggleCollapse}
              aria-label={housingMode === 'compact' ? 'Show more' : 'Show less'}
              title={housingMode === 'compact' ? 'Show more' : 'Show less'}
            >
              {housingMode === 'compact' ? (
                <ChevronDown size={16} strokeWidth={2} />
              ) : (
                <ChevronUp size={16} strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              className={`housing-acc__ctrl ${housingMode === 'full' ? 'is-active' : ''}`}
              onClick={toggleExpand}
              aria-label={housingMode === 'full' ? 'Exit full screen' : 'Expand housing'}
              title={housingMode === 'full' ? 'Exit full screen' : 'Expand housing'}
            >
              {housingMode === 'full' ? (
                <Minimize2 size={15} strokeWidth={2} />
              ) : (
                <Maximize2 size={15} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* 3 Action Tiles: Pay Rent | Save Rent | Insurance */}
        <div className="housing-acc__actions">
          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            <span className="quick-action__icon">
              <CreditCard size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Pay Rent</span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/savings')}
          >
            <span className="quick-action__icon">
              <PiggyBank size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Save Rent</span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/benefits')}
          >
            <span className="quick-action__icon">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Insurance</span>
          </button>
        </div>

        {/* Upward Score Banner (Orange/Clay) in default / compact mode */}
        {housingMode !== 'full' && (
          <button
            type="button"
            className="score-pill"
            onClick={() => router.push('/dashboard/score-breakdown')}
            aria-label="View score breakdown"
          >
            <div className="score-pill__left">
              <div className="score-pill__label">UPWARD SCORE</div>
              <div className="score-pill__value">
                {credScore || 500} <span>/ {maxScore || 900}</span>
              </div>
              <div className="score-pill__meta">
                Rent Payment Score · Not scoreable yet
              </div>
            </div>
            {renderScoreRing(credScore || 500, maxScore || 900, 42)}
          </button>
        )}

        {/* Accordion Body: Vault Progress + My Home + Full Links */}
        {housingMode !== 'compact' && (
          <div className="housing-acc__body">
            {/* Full Score Banner (Shown in full mode) */}
            {housingMode === 'full' && (
              <button
                type="button"
                className="score-full"
                onClick={() => router.push('/dashboard/score-breakdown')}
              >
                <div className="score-full__top">
                  <div>
                    <div className="score-full__eyebrow">UPWARD SCORE</div>
                    <div className="score-full__value-row">
                      <span className="score-full__value">{credScore || 500}</span>
                      <span className="score-full__max">/ {maxScore || 900}</span>
                    </div>
                    <div className="score-full__sub">Rent Payment Score</div>
                    <span className="score-full__pill">View breakdown ›</span>
                  </div>
                  <div className="score-full__ring">
                    <div className="score-full__ring-inner">
                      <span>Not scoreable yet</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Rent Savings Progress Card */}
            <button
              type="button"
              className="vault-card"
              onClick={() => router.push('/dashboard/savings')}
            >
              <div className="vault-card__top">
                <div>
                  <span className="vault-card__amount">
                    {formatCurrency(currentSaved, 'NGN')}
                  </span>
                  <span className="vault-card__target">
                    {' '}of {formatCurrency(targetRent, 'NGN')}
                  </span>
                </div>
                <span className="vault-card__pct">{vaultPct}%</span>
              </div>
              <div className="vault-card__track">
                <div className="vault-card__fill" style={{ width: `${vaultPct}%` }} />
              </div>
              <div className="vault-card__meta">
                <span className="vault-card__yield">+₦0 returns accrued</span>
                <span>355 days left</span>
              </div>
            </button>

            {/* My Home row */}
            <button
              type="button"
              className="housing-link"
              onClick={() => router.push('/dashboard/my-home')}
            >
              <span className="housing-link__ico">
                <Home size={16} strokeWidth={2} />
              </span>
              <span className="housing-link__body">
                <h3 className="housing-link__title">My Home</h3>
                <p className="housing-link__desc">
                  Complaints, visitors, bills and documents
                </p>
              </span>
              <span className="housing-link__chev">›</span>
            </button>

            {/* Additional links when in Full mode */}
            {housingMode === 'full' && (
              <>
                <button
                  type="button"
                  className="housing-link"
                  onClick={() => onOpenGoalsMockup('lifestyle')}
                >
                  <span className="housing-link__ico">
                    <Home size={16} strokeWidth={2} />
                  </span>
                  <span className="housing-link__body">
                    <h3 className="housing-link__title">Prepare towards owning a home</h3>
                    <p className="housing-link__desc">Education, events and a cooperative path</p>
                  </span>
                  <span className="housing-link__chev">›</span>
                </button>

                <button
                  type="button"
                  className="housing-link"
                  onClick={() => router.push('/dashboard/lifestyle')}
                >
                  <span className="housing-link__ico">
                    <Home size={16} strokeWidth={2} />
                  </span>
                  <span className="housing-link__body">
                    <h3 className="housing-link__title">Save towards or buy furniture</h3>
                    <p className="housing-link__desc">Furnish your apartment from the marketplace</p>
                  </span>
                  <span className="housing-link__chev">›</span>
                </button>

                <div className="home-ad">
                  <div className="home-ad__art" aria-hidden="true">
                    <span>🧹</span>
                    <span>🧽</span>
                    <span>🪣</span>
                    <span>🧻</span>
                  </div>
                  <div className="home-ad__body">
                    <div className="home-ad__kicker">For your home</div>
                    <div className="home-ad__title">Home refresh package</div>
                    <div className="home-ad__desc">
                      Carpet, mop, sponges, kitchen towels and more, delivered together.
                    </div>
                    <button
                      type="button"
                      className="home-ad__btn"
                      onClick={() => router.push('/dashboard/lifestyle')}
                    >
                      I&apos;m interested
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* 3. Also on Upward Section (Directly below housing accordion) */}
      {housingMode !== 'full' && (
        <section className="more-areas" aria-label="Other goals">
          <div className="more-areas__head">
            <span className="more-areas__label">Also on Upward</span>
            <div className="more-areas__links">
              <button
                type="button"
                className="more-areas__link-btn"
                onClick={() => router.push('/dashboard/goals')}
              >
                See all
              </button>
              <button
                type="button"
                className="more-areas__link-btn"
                onClick={() => onOpenGoalsMockup('custom')}
              >
                + New goal
              </button>
            </div>
          </div>

          {/* Goal 1: Learn a skill (100%) */}
          <button
            type="button"
            className="goal-card"
            onClick={() => onOpenGoalsMockup('career')}
          >
            <div className="goal-card__body">
              <h3 className="goal-card__title">📚 Learn a skill</h3>
              <p className="goal-card__desc">Career &amp; professional · 6 months</p>
            </div>
            {renderGoalRing(100, 40)}
          </button>

          {/* Goal 2: Start a business (0%) */}
          <button
            type="button"
            className="goal-card"
            onClick={() => onOpenGoalsMockup('income')}
          >
            <div className="goal-card__body">
              <h3 className="goal-card__title">💼 Start a business</h3>
              <p className="goal-card__desc">Income · ₦0 of ₦2,300,000</p>
            </div>
            {renderGoalRing(0, 40)}
          </button>
        </section>
      )}
    </div>
  )
}
