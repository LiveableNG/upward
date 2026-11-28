'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  PiggyBank,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { usePendingPayments } from '@/features/dashboard/hooks/useDashboard'
import { type PendingPayment } from '@/features/dashboard/types'
import { isProofUnderReview } from '@/features/dashboard/components/payment/propertyPayDisplay'
import { useRentVault } from '../hooks/useRentSavings'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { useAuth } from '@/features/auth/AuthContext'
import { SavingsInvestorKycModal } from './SavingsInvestorKycModal'
import { RentCalculatorView } from './RentCalculatorView'
import { VaultDashboardView } from './VaultDashboardView'
import { SettlementHubView } from './SettlementHubView'
import { SavingsInterestContent } from './SavingsInterestModal'
import '@/styles/savings-v1.css'

function getFriendlySavingsErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : ''
  const normalized = raw.trim().toLowerCase()
  const isTechnical =
    !normalized ||
    normalized.includes('internal server error') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('prisma') ||
    normalized.includes('unexpected token') ||
    normalized.includes('status code') ||
    /\b5\d\d\b/.test(normalized)

  if (isTechnical) {
    return "We're having trouble loading your savings right now. Please try again in a moment."
  }
  return raw
}

export function RentSavingsMainView() {
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const { rates: platformRates, isLoading: ratesLoading } = usePlatformRates()
  const effectiveSavingsMode =
    platformRates.savingsMode ||
    (platformRates.savingsEnabled === false ? 'COMING_SOON' : 'LIVE')
  const shouldFetchVault = !ratesLoading && effectiveSavingsMode !== 'COMING_SOON'
  const { data: vault, isLoading, error, refetch } = useRentVault(shouldFetchVault)
  const { data: pendingPayments = [] } = usePendingPayments()

  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SETTLEMENT'>('DASHBOARD')
  const [pinnedSettlementVault, setPinnedSettlementVault] = useState<typeof vault | null>(null)
  const [holdCalculatorView, setHoldCalculatorView] = useState<boolean>(false)
  const [showKycModal, setShowKycModal] = useState<boolean>(false)
  const [bypassPartialBalanceGuard, setBypassPartialBalanceGuard] = useState<boolean>(false)

  const incompleteRentPayment = (pendingPayments || []).find((p: PendingPayment) => {
    if (p?.type === 'refund_alert') return false
    if (isProofUnderReview(p)) return false
    const paid = Number(p?.amountPaid || 0)
    const total = Number(p?.total_amount || 0)
    return (p?.status === 'PARTIAL' || paid > 0) && total > paid
  })

  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  if ((shouldFetchVault && isLoading) || ratesLoading || (authLoading && !user)) {
    return (
      <PayPageShell
        title="Rent Savings"
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 360,
            gap: 16,
            color: 'var(--text-muted)',
          }}
        >
          <Loader2 size={32} className="animate-spin" color="var(--clay)" />
          <span style={{ fontSize: '0.875rem' }}>Loading Rent Savings...</span>
        </div>
      </PayPageShell>
    )
  }

  if (effectiveSavingsMode === 'COMING_SOON') {
    return (
      <PayPageShell
        title="Rent Savings"
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <div className="savings-interest-page">
          <SavingsInterestContent
            source="direct_savings_page"
            secondaryLabel="Back to Home"
            onDone={() => router.push('/dashboard')}
          />
        </div>
      </PayPageShell>
    )
  }

  if (error) {
    return (
      <PayPageShell
        title="Rent Savings"
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <div className="rent-calculator__card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <AlertCircle size={36} color="var(--clay)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
            We couldn&apos;t load Rent Savings
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginTop: 6,
              marginBottom: 22,
              lineHeight: 1.5,
            }}
          >
            {getFriendlySavingsErrorMessage(error)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="vault-btn-primary" onClick={() => refetch()}>
              Try again
            </button>
            <button
              type="button"
              className="savings-interest-modal__btn-secondary"
              onClick={() => router.push('/dashboard')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </PayPageShell>
    )
  }

  const isVaultActive =
    vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT'
  const effectiveSettlementVault =
    viewMode === 'SETTLEMENT' ? vault || pinnedSettlementVault : null

  const isKycRequired = Boolean(
    user &&
      (!user.isIdentityVerified ||
        (vault && vault.has_completed_arm_kyc === false)),
  )
  const hasConsented = Boolean(
    vault?.consent?.accepted_at ||
      user?.savingsWalletEnabled ||
      (vault && vault.current_balance_kobo > 0),
  )
  const shouldBlurActivities = (isKycRequired || !hasConsented) && Boolean(isVaultActive)
  const fundDisplayName = platformRates.fundName || 'ARM Money Market Fund'

  // Only render top banners when the vault is already active (to avoid duplicate headers/buttons before starting)
  const renderKycBanner = () => {
    if (!user || !isVaultActive) return null

    if (isKycRequired) {
      return (
        <div className="savings-kyc-banner">
          <div className="savings-kyc-banner__icon">
            <ShieldCheck size={20} color="var(--clay)" />
          </div>
          <div className="savings-kyc-banner__content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="savings-kyc-banner__title">Identity &amp; Address Verification Required</span>
              <span className="savings-kyc-banner__partner">
                {fundDisplayName} (ARMMMF)
              </span>
            </div>
            <span className="savings-kyc-banner__desc">
              Complete your BVN, NIN, valid ID, and utility bill verification to invest and earn daily compound returns.
            </span>
          </div>
          <button
            type="button"
            className="savings-kyc-banner__btn"
            onClick={() => setShowKycModal(true)}
          >
            Verify Now
          </button>
        </div>
      )
    }

    if (!hasConsented) {
      return (
        <div className="savings-kyc-banner">
          <div className="savings-kyc-banner__icon">
            <PiggyBank size={20} color="var(--clay)" />
          </div>
          <div className="savings-kyc-banner__content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="savings-kyc-banner__title">Rent Savings Plan Ready</span>
              <span className="savings-kyc-banner__partner">
                {fundDisplayName} (ARMMMF)
              </span>
            </div>
            <span className="savings-kyc-banner__desc">
              Get cash back on your next rent when you save up for it regularly.
            </span>
          </div>
          <button
            type="button"
            className="savings-kyc-banner__btn"
            onClick={() => setShowKycModal(true)}
          >
            Start Saving Today
          </button>
        </div>
      )
    }

    return null
  }

  if ((!isVaultActive && !effectiveSettlementVault) || holdCalculatorView) {
    if (!holdCalculatorView && incompleteRentPayment && !bypassPartialBalanceGuard) {
      const paidNaira = Number(incompleteRentPayment.amountPaid || 0)
      const totalNaira = Number(incompleteRentPayment.total_amount || 0)
      const remainingNaira = Math.max(0, totalNaira - paidNaira)
      const pctPaid = totalNaira > 0 ? Math.min(100, Math.round((paidNaira / totalNaira) * 100)) : 0
      const rawDue = incompleteRentPayment.due_date || incompleteRentPayment.dueDate
      const formattedDue = rawDue
        ? new Date(rawDue).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null

      return (
        <PayPageShell
          title="Complete Your Rent"
          subtitle="Finish your current rent balance before starting a new savings plan."
          showBack
          onBack={() => router.push('/dashboard')}
        >
          <div className="rent-calculator__card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--clay-faint)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  You have a rent balance to complete
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {formattedDue ? `Due ${formattedDue}` : 'Current rent cycle'}
                </p>
              </div>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Already Paid</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {formatCurrency(paidNaira, incompleteRentPayment.currency || 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Total Rent</span>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(totalNaira, incompleteRentPayment.currency || 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Balance Remaining</span>
                <span style={{ color: 'var(--clay)', fontWeight: 800 }}>
                  {formatCurrency(remainingNaira, incompleteRentPayment.currency || 'NGN')}
                </span>
              </div>
            </div>

            <div>
              <div className="vault-dashboard__progress-bar">
                <div className="vault-dashboard__progress-fill" style={{ width: `${pctPaid}%` }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.45 }}>
                Once your {formatCurrency(remainingNaira, incompleteRentPayment.currency || 'NGN')}{' '}
                balance is paid, you can start saving towards next year&apos;s rent.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="vault-btn-primary"
                onClick={() =>
                  router.push(
                    `/dashboard/pay-rent?paymentUuid=${encodeURIComponent(incompleteRentPayment.uuid)}`,
                  )
                }
              >
                <span>Pay Remaining {formatCurrency(remainingNaira, incompleteRentPayment.currency || 'NGN')} Now</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="vault-btn-secondary"
                onClick={() => router.push('/dashboard')}
              >
                Back to Home
              </button>

              <button
                type="button"
                className="vault-dashboard__text-action"
                onClick={() => setBypassPartialBalanceGuard(true)}
              >
                Save for a future rent cycle instead
              </button>
            </div>
          </div>
        </PayPageShell>
      )
    }

    return (
      <RentCalculatorView
        onHoldInWizard={(holding) => setHoldCalculatorView(holding)}
        onSuccess={() => {
          setHoldCalculatorView(false)
          refetch()
          refreshUser().catch(() => {})
        }}
      />
    )
  }

  const activeVaultForView = effectiveSettlementVault || vault!

  return (
    <PayPageShell
      title={viewMode === 'SETTLEMENT' ? 'Rent Settlement' : 'Rent Savings'}
      showBack
      onBack={() => {
        if (viewMode === 'SETTLEMENT') {
          setPinnedSettlementVault(null)
          setViewMode('DASHBOARD')
          refetch()
        } else {
          router.push('/dashboard')
        }
      }}
    >
      <div className="rent-savings-view" style={{ width: '100%' }}>
        {renderKycBanner()}

        <div className="rent-savings__gated-container">
          <div
            className={`rent-savings__gated-content ${
              shouldBlurActivities ? 'rent-savings__gated-content--blurred' : ''
            }`}
          >
            {viewMode === 'SETTLEMENT' && (
              <SettlementHubView
                vault={activeVaultForView}
                onRestartVault={() => {
                  setPinnedSettlementVault(null)
                  setViewMode('DASHBOARD')
                  refetch()
                  refreshUser().catch(() => {})
                }}
              />
            )}

            {viewMode === 'DASHBOARD' && (
              <VaultDashboardView
                vault={activeVaultForView}
                onGoToSettlementHub={() => {
                  setPinnedSettlementVault(activeVaultForView)
                  setViewMode('SETTLEMENT')
                }}
                onRestartVault={() => {
                  setPinnedSettlementVault(null)
                  setViewMode('DASHBOARD')
                  refetch()
                  refreshUser().catch(() => {})
                }}
              />
            )}
          </div>

          {shouldBlurActivities && (
            <div
              className="rent-savings__gated-overlay"
              onClick={() => setShowKycModal(true)}
              role="button"
              tabIndex={0}
              aria-label={
                !user?.isIdentityVerified
                  ? 'Verification required to unlock savings activities'
                  : 'Consent required to start saving'
              }
            />
          )}
        </div>

        <SavingsInvestorKycModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          onSuccess={async () => {
            await refreshUser()
            await refetch()
          }}
        />
      </div>
    </PayPageShell>
  )
}
