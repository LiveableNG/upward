'use client'

import React, { useState } from 'react'
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { useRentVault } from '../hooks/useRentSavings'
import { RentCalculatorView } from './RentCalculatorView'
import { VaultSetupFlow } from './VaultSetupFlow'
import { VaultDashboardView } from './VaultDashboardView'
import { SettlementHubView } from './SettlementHubView'
import '@/styles/savings-v1.css'

export function RentSavingsMainView() {
  const { data: vault, isLoading, error, refetch } = useRentVault()

  const [step, setStep] = useState<'CALCULATOR' | 'SETUP'>('CALCULATOR')
  const [simulationConfig, setSimulationConfig] = useState<{
    targetAmountKobo: number
    contractualDueDate: string
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodicDepositKobo: number
  } | null>(null)

  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'SETTLEMENT'>('DASHBOARD')

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

  // If tenant has no active locked vault: Show Screen 1 (Calculator) or Screen 2 (Setup)
  if (!isVaultActive) {
    if (step === 'SETUP' && simulationConfig) {
      return (
        <VaultSetupFlow
          initialConfig={simulationConfig}
          onBack={() => setStep('CALCULATOR')}
          onSuccess={() => {
            refetch()
            setStep('CALCULATOR')
          }}
        />
      )
    }

    return (
      <RentCalculatorView
        onProceedToSetup={(config) => {
          setSimulationConfig(config)
          setStep('SETUP')
        }}
      />
    )
  }

  // Tenant has an active vault
  // If viewMode is 'SETTLEMENT', display Screen 5 (Settlement Hub)
  if (viewMode === 'SETTLEMENT') {
    return (
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
    )
  }

  // Otherwise, display Screen 3 (Active Locked Dashboard)
  return <VaultDashboardView vault={vault} onGoToSettlementHub={() => setViewMode('SETTLEMENT')} />
}
