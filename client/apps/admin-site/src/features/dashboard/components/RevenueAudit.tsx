import React from 'react'
import type { MetricsSummary } from '../types'

interface RevenueAuditProps {
  metrics: MetricsSummary | null
}

export const RevenueAudit: React.FC<RevenueAuditProps> = ({ metrics }) => {
  if (!metrics) return null

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Rent Processing Fees Collected (Transaction):</span>
          <strong style={{ color: 'var(--success)' }}>₦{metrics.revenue.totalUpwardFees.toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Upward Benefits Protection Fees:</span>
          <strong style={{ color: 'var(--accent)' }}>₦{metrics.revenue.totalBenefitsFees.toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Total Tenant Rent Volume Handled:</span>
          <strong style={{ color: 'var(--text)' }}>₦{metrics.revenue.totalRentProcessed.toLocaleString()}</strong>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
        These numbers represent system processing performance metrics filtered by date preset. Default preset is all transactions.
      </p>
    </div>
  )
}
