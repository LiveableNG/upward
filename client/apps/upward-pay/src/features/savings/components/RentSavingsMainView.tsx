'use client'

import React, { useState } from 'react'
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { useRentVault } from '../hooks/useRentSavings'
import { useAuth } from '@/features/auth/AuthContext'
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

    return (
      <div className="savings-kyc-banner savings-kyc-banner--verified">
        <div className="savings-kyc-banner__icon">
          <ShieldCheck size={18} color="#10b981" />
        </div>
        <div className="savings-kyc-banner__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="savings-kyc-banner__title">
              Investor Profile Verified &bull; SEC Compliant
            </span>
            <span className="savings-kyc-banner__partner">powered by ARM</span>
          </div>
          <span className="savings-kyc-banner__desc">
            Mutual Fund Portfolio active earning 14.5% p.a. daily compounding yield.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderKycBanner()}

      {/* Screen 1 or Screen 2: No active vault */}
      {!isVaultActive && (
        <>
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

      {/* Screen 5: Settlement Hub */}
      {isVaultActive && viewMode === 'SETTLEMENT' && (
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

      {/* Screen 3: Active Locked Dashboard */}
      {isVaultActive && viewMode === 'DASHBOARD' && (
        <VaultDashboardView vault={vault} onGoToSettlementHub={() => setViewMode('SETTLEMENT')} />
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
