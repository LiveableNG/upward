'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  PiggyBank,
} from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
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

  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SETTLEMENT'>('DASHBOARD')
  const [showKycModal, setShowKycModal] = useState<boolean>(false)

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

  if (!isVaultActive) {
    return (
      <RentCalculatorView
        onSuccess={() => {
          refetch()
          refreshUser().catch(() => {})
        }}
      />
    )
  }

  return (
    <PayPageShell
      title={viewMode === 'SETTLEMENT' ? 'Rent Settlement' : 'Rent Savings'}
      showBack
      onBack={() => {
        if (viewMode === 'SETTLEMENT') {
          setViewMode('DASHBOARD')
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
                vault={vault}
                onRestartVault={() => {
                  refetch()
                  setViewMode('DASHBOARD')
                }}
              />
            )}

            {viewMode === 'DASHBOARD' && (
              <VaultDashboardView
                vault={vault}
                onGoToSettlementHub={() => setViewMode('SETTLEMENT')}
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
