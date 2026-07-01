import React from 'react'
import {
  Users,
  UserCheck,
  Building2,
  MailOpen,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import type { FlatMetrics } from '../types'

interface MetricsCardsProps {
  metrics: FlatMetrics | null
  onTabChange?: (tab: string) => void
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  change?: number
  changeLabel?: string
  accentColor: string
  accentFaint: string
  icon: React.ReactNode
  tab?: string
  onTabChange?: (tab: string) => void
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, sub, change, changeLabel, accentColor, accentFaint, icon, tab, onTabChange,
}) => {
  const isPositive = change !== undefined ? change >= 0 : undefined

  return (
    <div
      className="card"
      onClick={() => tab && onTabChange && onTabChange(tab)}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderTop: `3px solid ${accentColor}`,
        cursor: tab ? 'pointer' : 'default',
        transition: 'var(--transition)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Icon + Label Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: accentFaint,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>

      {/* Change Indicator + Sublabel Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '22px' }}>
        {change !== undefined && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '6px',
            color: isPositive ? 'var(--success)' : 'var(--danger)',
            background: isPositive ? 'var(--success-faint)' : 'var(--danger-faint)',
          }}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
        {sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</span>}
        {changeLabel && !sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{changeLabel}</span>}
      </div>

      {/* Navigate Hint */}
      {tab && (
        <div style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          color: accentColor,
          opacity: 0.4,
          transition: 'opacity 0.2s',
        }}
          className="card-nav-arrow"
        >
          <ArrowRight size={14} />
        </div>
      )}
    </div>
  )
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, onTabChange }) => {
  if (!metrics) return null

  const convRate = metrics.waitlistCount > 0
    ? ((metrics.signedUpCount / metrics.waitlistCount) * 100).toFixed(1)
    : '0.0'

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
      }}>
        <KpiCard
          label="Waitlist"
          value={metrics.waitlistCount.toLocaleString()}
          sub="vs last week"
          change={+8}
          accentColor="#6366f1"
          accentFaint="rgba(99,102,241,0.08)"
          icon={<Users size={16} />}
          tab="waitlist"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Signed Up"
          value={metrics.signedUpCount.toLocaleString()}
          sub="active accounts"
          change={+12}
          accentColor="var(--success)"
          accentFaint="var(--success-faint)"
          icon={<UserCheck size={16} />}
          tab="signed-up"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Property Managers"
          value={metrics.pmCount.toLocaleString()}
          sub="registered PMs"
          change={+3}
          accentColor="var(--accent)"
          accentFaint="var(--accent-faint)"
          icon={<Building2 size={16} />}
          tab="pms"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Pending Invites"
          value={metrics.invitedCount.toLocaleString()}
          changeLabel="awaiting acceptance"
          accentColor="#f59e0b"
          accentFaint="var(--warning-faint)"
          icon={<MailOpen size={16} />}
          tab="invited"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${convRate}%`}
          sub="waitlist → tenant"
          change={parseFloat(convRate) >= 20 ? 4 : -4}
          accentColor="#8b5cf6"
          accentFaint="rgba(139,92,246,0.08)"
          icon={<TrendingUp size={16} />}
        />
        <KpiCard
          label="Active Users"
          value={metrics.activeCount.toLocaleString()}
          sub="active last 30d"
          change={+14}
          accentColor="#10b981"
          accentFaint="rgba(16,185,129,0.08)"
          icon={<Users size={16} />}
          tab="sessions"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Active Rate"
          value={`${metrics.activeRate}%`}
          sub="active / total registered"
          change={+5}
          accentColor="#06b6d4"
          accentFaint="rgba(6,182,212,0.08)"
          icon={<TrendingUp size={16} />}
          tab="sessions"
          onTabChange={onTabChange}
        />
        <KpiCard
          label="Total Rent Processed"
          value={`₦${(metrics.totalRentProcessed / 1000).toFixed(0)}k`}
          sub="gross rent volume"
          change={+18}
          accentColor="var(--success)"
          accentFaint="var(--success-faint)"
          icon={<CreditCard size={16} />}
          tab="revenue"
          onTabChange={onTabChange}
        />
      </div>

      <style>{`
        .card:hover .card-nav-arrow { opacity: 1 !important; }
      `}</style>
    </>
  )
}

export default MetricsCards
