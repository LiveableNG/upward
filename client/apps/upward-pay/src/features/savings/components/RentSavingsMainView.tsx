'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Lock,
  PiggyBank,
  Copy,
  Check,
  Receipt,
  FileText,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRentVault } from '../hooks/useRentSavings'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { SavingsInvestorKycModal } from './SavingsInvestorKycModal'
import { RentCalculatorView } from './RentCalculatorView'
import { VaultSetupFlow } from './VaultSetupFlow'
import { VaultDashboardView } from './VaultDashboardView'
import { SettlementHubView } from './SettlementHubView'
import '@/styles/savings-v1.css'

export function RentSavingsMainView() {
  const { user, refreshUser } = useAuth()
  const { data: vault, isLoading, error, refetch } = useRentVault()

  const [step, setStep] = useState<'CALCULATOR' | 'SETUP'>('CALCULATOR')
  const [simulationConfig, setSimulationConfig] = useState<{
    targetAmountKobo: number
    contractualDueDate: string
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodicDepositKobo: number
  } | null>(null)

  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SETTLEMENT'>('DASHBOARD')
  const [showKycModal, setShowKycModal] = useState<boolean>(false)
  const [copiedDepositAccount, setCopiedDepositAccount] = useState<boolean>(false)
  const { success: toastSuccess } = useToast()

  const { data: depositSummary } = useQuery({
    queryKey: ['rent-deposit-summary'],
    queryFn: () => api.getRentDepositSummary(),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
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
    )
  }

  if (error) {
    return (
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
    )
  }

  const isVaultActive =
    vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT'

  const isKycRequired = Boolean(user && !user.isIdentityVerified)
  const hasConsented = Boolean(
    user?.savingsWalletEnabled || (vault && vault.current_balance_kobo > 0),
  )
  const shouldBlurActivities = (isKycRequired || !hasConsented) && Boolean(isVaultActive)

  const renderKycBanner = () => {
    if (!user) return null

    if (!user.isIdentityVerified) {
      return (
        <div className="savings-kyc-banner">
          <div className="savings-kyc-banner__icon">
            <ShieldCheck size={20} color="var(--clay)" />
          </div>
          <div className="savings-kyc-banner__content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="savings-kyc-banner__title">Investor Verification Required</span>
              <span className="savings-kyc-banner__partner">powered by ARM</span>
            </div>
            <span className="savings-kyc-banner__desc">
              Complete your one-time regulatory KYC to enable your 14.5% p.a. daily compound yield
              and dedicated funding account.
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
              <span className="savings-kyc-banner__partner">powered by ARM</span>
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

    return (
      <div className="savings-kyc-banner savings-kyc-banner--verified">
        <div className="savings-kyc-banner__icon">
          <ShieldCheck size={18} color="#10b981" />
        </div>
        <div className="savings-kyc-banner__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="savings-kyc-banner__title">Savings Active &amp; Verified</span>
            <span className="savings-kyc-banner__partner">powered by ARM</span>
          </div>
          <span className="savings-kyc-banner__desc">
            Your rent savings grow daily with 14.5% annual returns.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderKycBanner()}

      {!isVaultActive && (
        <>
          {depositSummary &&
            ((depositSummary.availableBalance || 0) > 0 ||
              depositSummary.property?.dva?.accountNumber ||
              (depositSummary.history && depositSummary.history.length > 0)) && (
              <div className="vault-dashboard__hero" style={{ marginBottom: 16 }}>
                <div className="vault-dashboard__top-row">
                  <div className="vault-dashboard__lock-pill">
                    <PiggyBank size={13} color="var(--clay)" />
                    <span>Rent Deposit Balance</span>
                  </div>
                  <span className="vault-dashboard__countdown-pill">Ready for Rent Lock</span>
                </div>

                <div className="vault-dashboard__amounts">
                  <span className="vault-dashboard__balance-caption">
                    Available Rent Deposit Credit
                  </span>
                  <span className="vault-dashboard__current-balance">
                    {formatCurrency(depositSummary.availableBalance || 0, 'NGN')}
                  </span>
                  <span className="vault-dashboard__target-label">
                    Automatically consolidated when you activate your Target Rent Vault below.
                  </span>
                </div>

                {depositSummary.property?.dva?.accountNumber && (
                  <div className="vault-dva-card">
                    <div className="vault-dva-card__header">
                      <span className="vault-dva-card__title">Dedicated Rent Account</span>
                      <span className="vault-dva-card__badge">
                        {depositSummary.property.dva.bankName || 'Wema Bank'}
                      </span>
                    </div>
                    <div className="vault-dva-card__number-row">
                      <div className="vault-dva-card__number-block">
                        <span className="vault-dva-card__number-label">
                          {depositSummary.property.dva.accountName || 'Upward Rent Account'}
                        </span>
                        <span className="vault-dva-card__number">
                          {depositSummary.property.dva.accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`vault-dva-card__copy-btn ${
                          copiedDepositAccount ? 'vault-dva-card__copy-btn--copied' : ''
                        }`}
                        onClick={() => {
                          navigator.clipboard.writeText(
                            depositSummary.property!.dva!.accountNumber,
                          )
                          setCopiedDepositAccount(true)
                          toastSuccess('Account number copied!')
                          setTimeout(() => setCopiedDepositAccount(false), 2000)
                        }}
                      >
                        {copiedDepositAccount ? (
                          <>
                            <Check size={14} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {depositSummary.history && depositSummary.history.length > 0 && (
                  <div className="vault-ledger" style={{ padding: 14 }}>
                    <div className="vault-ledger__header">
                      <div className="vault-ledger__title">
                        <Receipt size={16} color="var(--clay)" />
                        <span>Recent Rent Deposit Activity</span>
                      </div>
                    </div>
                    <div className="vault-ledger__list">
                      {depositSummary.history.slice(0, 5).map(
                        (tx: {
                          uuid: string
                          status?: string
                          type?: string
                          narration?: string
                          sourceLabel?: string
                          createdAt: string
                          amount: number
                        }) => {
                          const isCredit = tx.status === 'AVAILABLE' || tx.type === 'CREDIT'
                          return (
                            <div key={tx.uuid} className="vault-ledger__row">
                              <div className="vault-ledger__meta">
                                <span className="vault-ledger__label">
                                  {tx.narration || tx.sourceLabel}
                                </span>
                                <span className="vault-ledger__sub">
                                  {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="vault-ledger__right">
                                <span
                                  className={`vault-ledger__amount ${
                                    isCredit
                                      ? 'vault-ledger__amount--credit'
                                      : 'vault-ledger__amount--debit'
                                  }`}
                                >
                                  {isCredit ? '+' : '-'}
                                  {formatCurrency(tx.amount, 'NGN')}
                                </span>
                                <a
                                  href={`/dashboard/receipt/deposit/${tx.uuid}`}
                                  className="vault-ledger__receipt-link"
                                >
                                  <FileText size={11} /> Receipt
                                </a>
                              </div>
                            </div>
                          )
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          {step === 'SETUP' && simulationConfig ? (
            <VaultSetupFlow
              initialConfig={simulationConfig}
              onBack={() => setStep('CALCULATOR')}
              onSuccess={() => {
                refetch()
                setStep('CALCULATOR')
              }}
            />
          ) : (
            <RentCalculatorView
              onProceedToSetup={(config) => {
                setSimulationConfig(config)
                setStep('SETUP')
              }}
            />
          )}
        </>
      )}

      {isVaultActive && (
        <div className="rent-savings__gated-container">
          <div
            className={`rent-savings__gated-content ${
              shouldBlurActivities ? 'rent-savings__gated-content--blurred' : ''
            }`}
          >
            {viewMode === 'SETTLEMENT' && (
              <div>
                <button
                  type="button"
                  onClick={() => setViewMode('DASHBOARD')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: 16,
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Vault Dashboard</span>
                </button>

                <SettlementHubView
                  vault={vault}
                  onRestartVault={() => {
                    refetch()
                    setViewMode('DASHBOARD')
                  }}
                />
              </div>
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
            >
              <div className="rent-savings__gated-badge">
                <Lock size={15} color="var(--clay)" />
                <span>
                  {!user?.isIdentityVerified
                    ? 'Verification required to access and fund your vault'
                    : 'Get cash back on your next rent when you save up for it regularly'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <SavingsInvestorKycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onSuccess={async () => {
          await refreshUser()
          refetch()
        }}
      />
    </div>
  )
}
