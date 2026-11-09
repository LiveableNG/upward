'use client'

import { Check, TrendingUp, Clock, History, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface StatStripProps {
  completedPaymentsCount: number
  totalPaid: number
  currency: string
  pendingCount: number
  isLoading?: boolean
}

export function StatStrip({
  completedPaymentsCount,
  totalPaid,
  currency,
  pendingCount,
  isLoading = false,
}: StatStripProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="dashboard__stat-strip">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dashboard__stat-card animate-pulse" style={{ height: '72px' }}>
            <div className="dashboard__stat-icon" style={{ backgroundColor: 'var(--border)' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '20px', width: '40%', backgroundColor: 'var(--border)', marginBottom: '4px', borderRadius: '4px' }}></div>
              <div style={{ height: '14px', width: '60%', backgroundColor: 'var(--border)', borderRadius: '4px' }}></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="dashboard__stat-strip">
      <div className="dashboard__stat-card">
        <div className="dashboard__stat-icon dashboard__stat-icon--clay">
          <Check size={16} />
        </div>
        <div>
          <p className="dashboard__stat-value">{completedPaymentsCount}</p>
          <p className="dashboard__stat-label">Payments Made</p>
        </div>
      </div>

      <div className="dashboard__stat-card">
        <div className="dashboard__stat-icon dashboard__stat-icon--clay">
          <TrendingUp size={16} />
        </div>
        <div>
          <p className="dashboard__stat-value">{formatCurrency(totalPaid, currency)}</p>
          <p className="dashboard__stat-label">Total Paid</p>
        </div>
      </div>

      <div
        className="dashboard__stat-card dashboard__stat-card--action"
        onClick={() => router.push('/dashboard/notifications')}
        style={{ cursor: pendingCount > 0 ? 'pointer' : 'default' }}
      >
        <div
          className={`dashboard__stat-icon dashboard__stat-icon--clay ${pendingCount > 0 ? 'dashboard__stat-icon--pulse' : ''}`}
        >
          <Clock size={16} />
        </div>
        <div>
          <p className="dashboard__stat-value">{pendingCount}</p>
          <p className="dashboard__stat-label">Pending</p>
        </div>
        {pendingCount > 0 && <ArrowUpRight size={14} className="dashboard__stat-arrow" />}
      </div>

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
