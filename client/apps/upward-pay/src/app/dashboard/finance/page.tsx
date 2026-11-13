'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  PiggyBank,
  TrendingUp,
  History,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { usePendingPayments } from '@/features/dashboard/hooks/useDashboard'
import { useAuth } from '@/features/auth/AuthContext'

export default function FinanceDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    data: scoreProfile,
    isLoading: isScoreLoading,
    isError: isScoreError,
  } = useScoreProfile()
  const {
    data: rawPending,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = usePendingPayments()

  const scoreData = scoreProfile?.data
  const isScorable = scoreData?.isScorable ?? false
  const score = typeof scoreData?.score === 'number' && scoreData.score > 0 ? scoreData.score : null
  const maxScore = typeof scoreData?.maxScore === 'number' && scoreData.maxScore > 0 ? scoreData.maxScore : null
  const scoreBand = scoreData?.band ? scoreData.band.toUpperCase() : null

  // Deduplicate and filter pending invoices according to active tenancy rules
  const pendingInvoices = useMemo(() => {
    return (rawPending || []).filter((p: { type?: string; userPropertyUuid?: string }) => {
      if (p.type === 'refund_alert') return false
      if (!p.userPropertyUuid) return true
      const prop = user?.properties?.find(
        (pr) => pr.uuid === p.userPropertyUuid,
      )
      return !prop?.isPastTenancy
    })
  }, [rawPending, user?.properties])

  const pendingCount = pendingInvoices.length

  return (
    <div className="profile-page dashboard--nav-offset">
      <div className="profile-page__container">
        <header className="profile-page__header">
          <div className="profile-page__header-text">
            <h1 className="profile-page__title">Finance</h1>
            <p className="profile-page__subtitle">
              Financial infrastructure for your tenancy and personal goals.
            </p>
          </div>
        </header>

        <div className="profile-page__body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics Bar — real verified figures only */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {/* Metric 1: Rent Credibility Score */}
            <button
              type="button"
              onClick={() => router.push('/dashboard/score-breakdown')}
              style={{
                background: 'var(--surface, #ffffff)',
                border: '1px solid var(--shell-border, #f0e9df)',
                borderRadius: '16px',
                padding: '16px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(60, 40, 20, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted, #8F857A)' }}>
                  Rent Score
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted, #8F857A)' }} />
              </div>

              {isScoreLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                  <div className="animate-pulse" style={{ width: '60px', height: '24px', background: 'var(--shell-tint, #fbede5)', borderRadius: '6px' }} />
                  <div className="animate-pulse" style={{ width: '80px', height: '12px', background: 'var(--shell-tint, #fbede5)', borderRadius: '4px' }} />
                </div>
              ) : isScoreError || !scoreData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-muted, #8F857A)' }}>
                    —
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #8F857A)' }}>
                    Score unavailable
                  </span>
                </div>
              ) : !isScorable || score === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--dark, #1a1714)', letterSpacing: '-0.01em' }}>
                    Unranked
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #8F857A)' }}>
                    Pay rent to activate
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--dark, #1a1714)', letterSpacing: '-0.02em' }}>
                      {score}
                    </span>
                    {maxScore && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted, #8F857A)' }}>
                        / {maxScore}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clay, #c2501f)' }}>
                    {scoreBand ? `${scoreBand} · ` : ''}Credibility
                  </span>
                </div>
              )}
            </button>

            {/* Metric 2: Pending Invoices */}
            <button
              type="button"
              onClick={() => router.push('/dashboard/pay-rent')}
              style={{
                background: 'var(--surface, #ffffff)',
                border: '1px solid var(--shell-border, #f0e9df)',
                borderRadius: '16px',
                padding: '16px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(60, 40, 20, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted, #8F857A)' }}>
                  Pending Rent
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted, #8F857A)' }} />
              </div>

              {isPendingLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                  <div className="animate-pulse" style={{ width: '40px', height: '24px', background: 'var(--shell-tint, #fbede5)', borderRadius: '6px' }} />
                  <div className="animate-pulse" style={{ width: '70px', height: '12px', background: 'var(--shell-tint, #fbede5)', borderRadius: '4px' }} />
                </div>
              ) : isPendingError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-muted, #8F857A)' }}>
                    —
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #8F857A)' }}>
                    Data unavailable
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: pendingCount > 0 ? 'var(--clay, #c2501f)' : 'var(--dark, #1a1714)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {pendingCount}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #8F857A)' }}>
                    {pendingCount === 0 ? 'All caught up' : pendingCount === 1 ? '1 invoice due' : `${pendingCount} invoices due`}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Section 1: Rent & Tenancy */}
          <div>
            <div className="profile-page__section-label">Rent & Tenancy</div>
            <div className="profile-page__menu-card">
              <button
                type="button"
                className="profile-page__menu-item"
                onClick={() => router.push('/dashboard/pay-rent')}
              >
                <span className="profile-page__menu-icon">
                  <CreditCard size={18} strokeWidth={2.2} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">Pay Rent</span>
                  <span className="profile-page__menu-desc">
                    View upcoming rent, make one-time payments, or upload proof
                  </span>
                </span>
                <ChevronRight size={16} className="profile-page__menu-chevron" />
              </button>

              <button
                type="button"
                className="profile-page__menu-item"
                onClick={() => router.push('/dashboard/savings')}
              >
                <span className="profile-page__menu-icon">
                  <PiggyBank size={18} strokeWidth={2.2} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">Rent Vault</span>
                  <span className="profile-page__menu-desc">
                    Automated rent savings with yield towards contract settlement
                  </span>
                </span>
                <ChevronRight size={16} className="profile-page__menu-chevron" />
              </button>

              <button
                type="button"
                className="profile-page__menu-item"
                onClick={() => router.push('/dashboard/benefits')}
              >
                <span className="profile-page__menu-icon">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">Upward Benefits</span>
                  <span className="profile-page__menu-desc">
                    Annual rent protection cover and tenant relief
                  </span>
                </span>
                <ChevronRight size={16} className="profile-page__menu-chevron" />
              </button>
            </div>
          </div>

          {/* Section 2: Credibility & History */}
          <div>
            <div className="profile-page__section-label">Credibility & Records</div>
            <div className="profile-page__menu-card">
              <button
                type="button"
                className="profile-page__menu-item"
                onClick={() => router.push('/dashboard/score-breakdown')}
              >
                <span className="profile-page__menu-icon">
                  <TrendingUp size={18} strokeWidth={2.2} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">Rent Credibility Score</span>
                  <span className="profile-page__menu-desc">
                    Monitor on-time streaks, rating factors, and landlord credibility
                  </span>
                </span>
                <ChevronRight size={16} className="profile-page__menu-chevron" />
              </button>

              <button
                type="button"
                className="profile-page__menu-item"
                onClick={() => router.push('/dashboard/transactions')}
              >
                <span className="profile-page__menu-icon">
                  <History size={18} strokeWidth={2.2} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">Transactions</span>
                  <span className="profile-page__menu-desc">
                    Complete history of rent payments, deposits, and receipts
                  </span>
                </span>
                <ChevronRight size={16} className="profile-page__menu-chevron" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
