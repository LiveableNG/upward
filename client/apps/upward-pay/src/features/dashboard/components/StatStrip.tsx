'use client'

import React from 'react'
import { Check, TrendingUp, Clock, History, ArrowUpRight, Calendar, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface StatStripProps {
  completedPaymentsCount: number
  totalPaid: number
  currency: string
  pendingCount: number
  targetAmount?: number
  rentDueDays?: number
  vaultBalance?: number
  isLoading?: boolean
}

export function StatStrip({
  completedPaymentsCount,
  totalPaid,
  currency,
  pendingCount,
  targetAmount,
  rentDueDays,
  vaultBalance,
  isLoading = false,
}: StatStripProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="dashboard__stat-strip">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dashboard__stat-card animate-pulse" style={{ height: '72px' }}>
            <div className="dashboard__stat-icon" style={{ backgroundColor: 'var(--border)' }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '20px',
                  width: '40%',
                  backgroundColor: 'var(--border)',
                  marginBottom: '4px',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '14px',
                  width: '60%',
                  backgroundColor: 'var(--border)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const hasVaultBalance = (vaultBalance || 0) > 0
  const hasTargetAmount = (targetAmount || 0) > 0

  return (
    <div className="dashboard__stat-strip">
      {/* 1. Target Rent or Total Paid */}
      <div className="dashboard__stat-card">
        <div className="dashboard__stat-icon dashboard__stat-icon--clay">
          <Check size={16} />
        </div>
        <div>
          <p className="dashboard__stat-value">
            {hasTargetAmount
              ? formatCurrency(targetAmount!, currency)
              : totalPaid > 0
                ? formatCurrency(totalPaid, currency)
                : `${completedPaymentsCount} Paid`}
          </p>
          <p className="dashboard__stat-label">
            {hasTargetAmount
              ? 'Target Rent'
              : totalPaid > 0
                ? 'Total Rent Paid'
                : 'Payments Completed'}
          </p>
        </div>
      </div>

      {/* 2. Vault Runway or Days to Rent */}
      <div
        className="dashboard__stat-card dashboard__stat-card--action"
        onClick={() => router.push('/dashboard/savings')}
        style={{ cursor: 'pointer' }}
      >
        <div className="dashboard__stat-icon dashboard__stat-icon--clay">
          {hasVaultBalance ? <TrendingUp size={16} /> : <Calendar size={16} />}
        </div>
        <div>
          <p className="dashboard__stat-value">
            {hasVaultBalance
              ? formatCurrency(vaultBalance!, currency)
              : rentDueDays && rentDueDays > 0
                ? `${rentDueDays} Days`
                : '14.5% p.a.'}
          </p>
          <p className="dashboard__stat-label">
            {hasVaultBalance ? 'Saved in Vault' : rentDueDays ? 'To Rent Day' : 'Savings Yield'}
          </p>
        </div>
        <ArrowUpRight size={14} className="dashboard__stat-arrow" />
      </div>

      {/* 3. Pending Actions / Bills */}
      <div
        className="dashboard__stat-card dashboard__stat-card--action"
        onClick={() =>
          router.push(pendingCount > 0 ? '/dashboard/notifications' : '/dashboard/my-home')
        }
        style={{ cursor: 'pointer' }}
      >
        <div
          className={`dashboard__stat-icon dashboard__stat-icon--clay ${pendingCount > 0 ? 'dashboard__stat-icon--pulse' : ''}`}
        >
          <Clock size={16} />
        </div>
        <div>
          <p className="dashboard__stat-value">{pendingCount}</p>
          <p className="dashboard__stat-label">Pending Bills</p>
        </div>
        {pendingCount > 0 && <ArrowUpRight size={14} className="dashboard__stat-arrow" />}
      </div>

      {/* 4. Past Records */}
      <div
        className="dashboard__stat-card dashboard__stat-card--action dashboard__stat-card--request-cta"
        onClick={() => router.push('/dashboard/request-records')}
      >
        <div className="dashboard__stat-icon dashboard__stat-icon--clay">
          <History size={16} />
        </div>
        <div className="dashboard__stat-info">
          <span className="dashboard__stat-cta-label">Request</span>
          <p className="dashboard__stat-label">Past Records</p>
        </div>
        <ArrowUpRight size={14} className="dashboard__stat-arrow" />
      </div>
    </div>
  )
}
