'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  PiggyBank,
  TrendingUp,
  History,
  ShieldCheck,
  ChevronRight,
  Wallet,
} from 'lucide-react'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { usePendingPayments } from '@/features/dashboard/hooks/useDashboard'

export default function FinanceDashboardPage() {
  const router = useRouter()
  const { data: scoreProfile } = useScoreProfile()
  const { data: pendingPayments = [] } = usePendingPayments()

  const scoreData = scoreProfile?.data
  const credScore = scoreData?.score ?? 0
  const maxScore = scoreData?.maxScore ?? 850
  const pendingCount = pendingPayments.length

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
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
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
                gap: '4px',
                boxShadow: '0 1px 2px rgba(60, 40, 20, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted, #8F857A)' }}>
                  Upward Score
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted, #8F857A)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--dark, #1a1714)', letterSpacing: '-0.02em' }}>
                  {credScore}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #8F857A)' }}>
                  / {maxScore}
                </span>
              </div>
            </button>

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
                gap: '4px',
                boxShadow: '0 1px 2px rgba(60, 40, 20, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted, #8F857A)' }}>
                  Pending Invoices
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted, #8F857A)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: pendingCount > 0 ? 'var(--clay, #c2501f)' : 'var(--dark, #1a1714)', letterSpacing: '-0.02em' }}>
                  {pendingCount}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #8F857A)' }}>
                  {pendingCount === 1 ? 'due' : 'due'}
                </span>
              </div>
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
                  <span className="profile-page__menu-title">Score Breakdown</span>
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
