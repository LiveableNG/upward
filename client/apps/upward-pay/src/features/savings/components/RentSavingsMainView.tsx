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
import '@/styles/savings-v1.css'

export function RentSavingsMainView() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { data: vault, isLoading, error, refetch } = useRentVault()
  const { rates: platformRates, isLoading: ratesLoading } = usePlatformRates()

  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SETTLEMENT'>('DASHBOARD')
  const [showKycModal, setShowKycModal] = useState<boolean>(false)

  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  if (isLoading || ratesLoading) {
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
          <span style={{ fontSize: '0.875rem' }}>Loading your Rent Vault...</span>
        </div>
      </PayPageShell>
    )
  }

  if (platformRates.savingsEnabled === false) {
    return (
      <PayPageShell
        title="Rent Savings"
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <div className="rent-calculator__card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <PiggyBank size={36} color="var(--clay)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
            Rent Savings Is Launching Soon
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginTop: 6,
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            We are finalizing partner activation so you can start saving towards your next rent. Please check back shortly.
          </p>
          <button
            type="button"
            className="vault-btn-primary"
            onClick={() => router.push('/dashboard')}
          >
            Back to Home
          </button>
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
        <div className="rent-calculator__card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <AlertCircle size={36} color="var(--error)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
            Unable to Load Rent Vault
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            {error instanceof Error ? error.message : 'A network error occurred. Please try again.'}
          </p>
          <button type="button" className="vault-btn-primary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </PayPageShell>
    )
  }

  const isVaultActive =
    vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT'

  const isKycRequired = Boolean(user && !user.isIdentityVerified && !vault?.vault_id)
  const hasConsented = Boolean(
    user?.savingsWalletEnabled || isVaultActive || (vault && vault.current_balance_kobo > 0),
  )
  const shouldBlurActivities = (isKycRequired || !hasConsented) && Boolean(isVaultActive)

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
              <span className="savings-kyc-banner__title">Identity Verification Required</span>
              <span className="savings-kyc-banner__partner">
                powered by {platformRates.partnerShortName || 'ARM'}
              </span>
            </div>
            <span className="savings-kyc-banner__desc">
              Verify your identity to unlock rent savings and start earning daily compound returns.
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
                powered by {platformRates.partnerShortName || 'ARM'}
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
