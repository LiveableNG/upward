import React from 'react'
import type { MetricsSummary } from '../types'

interface MetricsCardsProps {
  metrics: MetricsSummary | null
  activeTab: string
  setActiveTab: (tab: 'waitlist' | 'signedUp' | 'invited' | 'pms' | 'revenue') => void
  totalPmsCount: number
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  activeTab,
  setActiveTab,
  totalPmsCount,
}) => {
  if (!metrics) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
      
      {/* Card 1: Waitlist */}
      <div
        onClick={() => setActiveTab('waitlist')}
        style={{
          background: activeTab === 'waitlist' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
          border: activeTab === 'waitlist' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          cursor: 'pointer',
          boxShadow: activeTab === 'waitlist' ? 'var(--shadow-md)' : 'none',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Waitlist Accounts</span>
        <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--text)' }}>
          {metrics.waitlist.total}
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>Converted: <strong>{metrics.waitlist.converted}</strong></div>
          <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>Paid: ₦{metrics.waitlist.totalPaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Card 2: Self Signed Up */}
      <div
        onClick={() => setActiveTab('signedUp')}
        style={{
          background: activeTab === 'signedUp' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
          border: activeTab === 'signedUp' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          cursor: 'pointer',
          boxShadow: activeTab === 'signedUp' ? 'var(--shadow-md)' : 'none',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Self Signed Up</span>
        <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: '#6366f1' }}>
          {metrics.signedUp.total}
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>Paying Users: <strong>{metrics.signedUp.paying}</strong></div>
          <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>Paid: ₦{metrics.signedUp.totalPaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Card 3: Invited & Guest Checkouts */}
      <div
        onClick={() => setActiveTab('invited')}
        style={{
          background: activeTab === 'invited' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
          border: activeTab === 'invited' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          cursor: 'pointer',
          boxShadow: activeTab === 'invited' ? 'var(--shadow-md)' : 'none',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invited & Guest</span>
        <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--warning)' }}>
          {metrics.invited.total}
        </h2>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>Pending: <strong>{metrics.invited.pending}</strong> • Onboard: <strong>{metrics.invited.onboarded}</strong></div>
          <div>Guest Pay: <strong>{metrics.invited.guestPaid}</strong> (₦{metrics.invited.guestTotalPaid.toLocaleString()})</div>
        </div>
      </div>

      {/* Card 4: Platform Sources */}
      <div
        onClick={() => setActiveTab('pms')}
        style={{
          background: activeTab === 'pms' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
          border: activeTab === 'pms' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          cursor: 'pointer',
          boxShadow: activeTab === 'pms' ? 'var(--shadow-md)' : 'none',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PMs & Platforms</span>
        <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--success)' }}>
          {totalPmsCount}
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>From PM Invites: <strong>{metrics.sources.pmCount}</strong></div>
          <div>From Platform: <strong>{metrics.sources.platformCount}</strong></div>
        </div>
      </div>

      {/* Card 5: Upward Collected Fees */}
      <div
        onClick={() => setActiveTab('revenue')}
        style={{
          background: activeTab === 'revenue' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
          border: activeTab === 'revenue' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          cursor: 'pointer',
          boxShadow: activeTab === 'revenue' ? 'var(--shadow-md)' : 'none',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Collected Upward Fees</span>
        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '12px 0 8px 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ₦{metrics.revenue.totalUpwardFees.toLocaleString()}
        </h2>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div>Benefits Fee: <strong>₦{metrics.revenue.totalBenefitsFees.toLocaleString()}</strong></div>
          <div>Rent Processed: <strong>₦{metrics.revenue.totalRentProcessed.toLocaleString()}</strong></div>
        </div>
      </div>

    </div>
  )
}
