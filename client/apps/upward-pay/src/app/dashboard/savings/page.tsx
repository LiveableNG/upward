'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, History } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { SavingsWalletGate } from '@/features/dashboard/components/SavingsWalletGate'
import { isSavingsWalletEnabled } from '@/features/dashboard/utils/savingsWallet'
import { useAuth } from '@/features/auth/AuthContext'

type WalletTransaction = {
  id: string | number
  type?: string
  amount?: number
  narration?: string
  createdAt: string | Date
}

export default function SavingsDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const savingsEnabled = isSavingsWalletEnabled(user)

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.getWallet(),
    enabled: savingsEnabled,
  })

  const walletBalance = Number(wallet?.balance ?? wallet?.availableBalance ?? 0)
  const transactions: WalletTransaction[] = Array.isArray(wallet?.transactions) ? wallet.transactions : []

  return (
    <SavingsWalletGate>
      <PayPageShell
        title="Savings"
        subtitle="Save money for rent in one place."
        showBack
        onBack={() => router.push('/dashboard')}
      >
      <section className="savings-hero">
        <div className="savings-hero__top">
          <span className="savings-hero__label">Wallet Balance</span>
        </div>
        <p className="savings-hero__balance">{formatCurrency(walletBalance, 'NGN')}</p>
        <div className="savings-hero__actions">
          <button
            type="button"
            className="savings-hero__cta"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            <ArrowUpRight size={18} />
            Add funds
          </button>
        </div>
      </section>

      <section className="savings-page__section">
        <div className="savings-page__section-head">
          <h2 className="savings-page__section-title">Recent Transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="savings-tx-empty">
            <History size={28} className="savings-tx-empty__icon" />
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="savings-tx-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="savings-tx">
                <div className="savings-tx__left">
                  <span
                    className={`savings-tx__dot ${
                      ['WALLET_DEPOSIT', 'PREFUND', 'INTEREST'].includes(String(tx.type))
                        ? 'savings-tx__dot--credit'
                        : 'savings-tx__dot--debit'
                    }`}
                  />
                  <div>
                    <div className="savings-tx__title">
                      {tx.type === 'WALLET_DEPOSIT'
                        ? 'Wallet top-up'
                        : tx.type === 'PREFUND'
                          ? 'Wallet credit'
                          : tx.type === 'INTEREST'
                            ? 'Daily interest'
                            : tx.narration || 'Wallet activity'}
                    </div>
                    <div className="savings-tx__meta">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className="savings-tx__amount">
                  {formatCurrency(Number(tx.amount || 0), 'NGN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </PayPageShell>
    </SavingsWalletGate>
  )
}
