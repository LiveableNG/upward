import React, { useMemo, useState } from 'react'
import {
  Users,
  Building2,
  Home,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  UserCheck,
  MailOpen,
  Zap,
  ArrowUpRight,
  Download,
  Search,
} from 'lucide-react'
import type { FlatMetrics, SignedUpRecord, InvitedRecord } from '../types'
import * as XLSX from 'xlsx'
import { showToast } from '@upward/client-core'

// ───────────────────────────────────────────────────────────────
// Tiny SVG Sparkline — no lib needed
// ───────────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[]
  color: string
  height?: number
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, height = 36 }) => {
  const width = 80
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints.join(' ')}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// Insight Item
// ───────────────────────────────────────────────────────────────
type InsightLevel = 'success' | 'warning' | 'danger' | 'info'

interface InsightItem {
  level: InsightLevel
  message: string
}

const insightConfig: Record<InsightLevel, { color: string; bg: string; icon: React.ReactNode }> = {
  success: { color: 'var(--success)', bg: 'var(--success-faint)', icon: <CheckCircle size={14} /> },
  warning: { color: 'var(--warning)', bg: 'var(--warning-faint)', icon: <AlertTriangle size={14} /> },
  danger: { color: 'var(--danger)', bg: 'var(--danger-faint)', icon: <AlertTriangle size={14} /> },
  info: { color: '#6366f1', bg: 'rgba(99,102,241,0.07)', icon: <Zap size={14} /> },
}

// ───────────────────────────────────────────────────────────────
// Health KPI Card
// ───────────────────────────────────────────────────────────────
interface HealthCardProps {
  label: string
  value: string | number
  sub?: string
  change?: number         // positive or negative %
  sparkData?: number[]
  accentColor: string
  icon: React.ReactNode
}

const HealthCard: React.FC<HealthCardProps> = ({ label, value, sub, change, sparkData, accentColor, icon }) => {
  const isPositive = change !== undefined ? change >= 0 : true
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '20px',
        borderTop: `3px solid ${accentColor}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '9px',
          backgroundColor: `${accentColor}18`,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>

      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>

      {(change !== undefined || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {change !== undefined && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '12px',
              fontWeight: 700,
              color: isPositive ? 'var(--success)' : 'var(--danger)',
              background: isPositive ? 'var(--success-faint)' : 'var(--danger-faint)',
              borderRadius: '6px',
              padding: '2px 7px',
            }}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {change >= 0 ? '+' : ''}{change}%
            </span>
          )}
          {sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</span>}
        </div>
      )}

      {sparkData && sparkData.length > 1 && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.6 }}>
          <Sparkline data={sparkData} color={accentColor} />
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Main Activity Feed Item
// ───────────────────────────────────────────────────────────────
interface ActivityItem {
  id: string
  actor: string
  action: string
  time: string
  icon: React.ReactNode
  color: string
}

// ───────────────────────────────────────────────────────────────
// Area Chart (SVG)
// ───────────────────────────────────────────────────────────────
interface AreaChartProps {
  data: { label: string; value: number }[]
  color: string
  height?: number
}

const AreaChart: React.FC<AreaChartProps> = ({ data, color, height = 120 }) => {
  const width = 600
  const max = Math.max(...data.map((d) => d.value), 1)
  const padV = 10
  const padH = 0

  const points = data.map((d, i) => {
    const x = padH + (i / (data.length - 1)) * (width - padH * 2)
    const y = padV + (1 - d.value / max) * (height - padV * 2)
    return { x, y, ...d }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <defs>
        <linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#area-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────
import type { DateFilter } from './FilterToolbar'

interface OverviewTabProps {
  metrics: FlatMetrics | null
  dateFilter: DateFilter
  onDateFilterChange: (v: DateFilter) => void
  signedUpList: SignedUpRecord[]
  invitedList: InvitedRecord[]
  onPreview: (item: any) => void
}

// Fake trend data seeded from metrics totals to give realistic sparklines
function seedSpark(total: number, len = 7): number[] {
  const arr: number[] = []
  let cur = Math.max(total * 0.7, 1)
  for (let i = 0; i < len; i++) {
    cur += Math.round((Math.random() - 0.35) * (total * 0.08))
    arr.push(Math.max(cur, 0))
  }
  arr[arr.length - 1] = total
  return arr
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  dateFilter,
  onDateFilterChange,
  signedUpList,
  invitedList,
  onPreview,
}) => {
  const [subView, setSubView] = useState<'metrics' | 'paying'>('metrics')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'benefits' | 'rent_only'>('all')

  // Compute paying users list from both SignedUp (self/waitlist) and Invited lists
  const payingUsers = useMemo(() => {
    const list: {
      id: string
      name: string
      email: string
      source: 'Waitlist Converted' | 'Self Signed Up' | 'Invited Tenant' | 'Guest Invited'
      totalPaid: number
      benefitsPaid: number
      createdAt: string
      rawRecord: any
    }[] = []

    // 1. From Signed Up List (Self-registrations and Waitlist conversions)
    signedUpList.forEach((u) => {
      if (u.totalPaid > 0) {
        list.push({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || 'N/A',
          email: u.email,
          source: u.isWaitlist ? 'Waitlist Converted' : 'Self Signed Up',
          totalPaid: u.totalPaid,
          benefitsPaid: u.benefitsPaid ?? 0,
          createdAt: u.createdAt,
          rawRecord: u,
        })
      }
    })

    // 2. From Invited List (Invited users who have paid, or Guest payments)
    invitedList.forEach((u) => {
      if (u.totalPaid > 0) {
        list.push({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || 'N/A',
          email: u.email,
          source: u.status === 'GUEST_PAID' ? 'Guest Invited' : 'Invited Tenant',
          totalPaid: u.totalPaid,
          benefitsPaid: u.benefitsPaid ?? 0,
          createdAt: u.createdAt,
          rawRecord: u,
        })
      }
    })

    return list.sort((a, b) => b.totalPaid - a.totalPaid)
  }, [signedUpList, invitedList])

  // Filter paying users based on search query and payment type filter
  const filteredPayingUsers = useMemo(() => {
    let result = payingUsers

    // Filter by payment type
    if (paymentTypeFilter === 'benefits') {
      result = result.filter((u) => u.benefitsPaid > 0)
    } else if (paymentTypeFilter === 'rent_only') {
      result = result.filter((u) => u.benefitsPaid === 0)
    }

    // Filter by text search query
    if (!searchQuery) return result
    const q = searchQuery.toLowerCase()
    return result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.source.toLowerCase().includes(q)
    )
  }, [payingUsers, searchQuery, paymentTypeFilter])

  const totalPaidSum = useMemo(() => {
    return payingUsers.reduce((sum, u) => sum + u.totalPaid, 0)
  }, [payingUsers])

  const paidBenefitsCount = useMemo(() => {
    return payingUsers.filter((u) => u.benefitsPaid > 0).length
  }, [payingUsers])

  const handleExportOverviewExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Sheet 1: General Platform KPI Summary
    const generalSummary = [
      { Metric: 'Waitlist Entries', Count: metrics?.waitlistCount ?? 0, Description: 'Tenants currently on waitlist' },
      { Metric: 'Registered Tenants', Count: metrics?.signedUpCount ?? 0, Description: 'Total registered tenant user accounts' },
      { Metric: 'Registered Property Managers', Count: metrics?.pmCount ?? 0, Description: 'Total registered PM accounts' },
      { Metric: 'Pending Invitations', Count: metrics?.invitedCount ?? 0, Description: 'Awaiting registration acceptance' },
      { Metric: 'Conversion Rate', Value: metrics ? `${((metrics.signedUpCount / Math.max(metrics.waitlistCount, 1)) * 100).toFixed(1)}%` : '0%', Description: 'Waitlist entries converted to tenants' },
      { Metric: 'Active Users (30-day)', Count: metrics?.activeCount ?? 0, Description: 'Users with logged activity in last 30d' },
      { Metric: 'Active Engagement Rate', Value: metrics ? `${metrics.activeRate}%` : '0%', Description: 'Retention rate of active users' },
      { Metric: 'Total Rent Processed', Value: `₦${metrics?.totalRentProcessed.toLocaleString() ?? '0'}`, Description: 'Gross processed rent payments' },
      { Metric: 'Transaction Fee Revenue', Value: `₦${metrics?.feeRevenue.toLocaleString() ?? '0'}`, Description: 'Net platform transaction fee revenue' },
      { Metric: 'Benefits Revenue', Value: `₦${metrics?.benefitsRevenue.toLocaleString() ?? '0'}`, Description: 'Protection benefits program revenue' },
    ]

    const wsSummary = XLSX.utils.json_to_sheet(generalSummary)
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Ecosystem Summary')

    // Sheet 2: Paying Users Details
    const payingUsersRows = payingUsers.map((u) => ({
      'Tenant Name': u.name,
      'Email Address': u.email,
      'Signup Type': u.source,
      'Benefits Paid (₦)': u.benefitsPaid,
      'Total Paid (₦)': u.totalPaid,
      'Registration Date': new Date(u.createdAt).toLocaleDateString(),
    }))

    const wsPaying = XLSX.utils.json_to_sheet(payingUsersRows)
    XLSX.utils.book_append_sheet(workbook, wsPaying, 'Paying Tenants Registry')

    // Auto-fit widths helper
    const fitCols = (ws: any, data: any[]) => {
      if (data.length === 0) return
      const keys = Object.keys(data[0])
      ws['!cols'] = keys.map((key) => ({
        wch: Math.max(
          15,
          key.length,
          ...data.map((row) => String(row[key as keyof typeof row] || '').length),
        ),
      }))
    }

    fitCols(wsSummary, generalSummary)
    fitCols(wsPaying, payingUsersRows)

    XLSX.writeFile(workbook, `Upward_Ecosystem_Overview_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('Ecosystem summary and paying tenants registry downloaded successfully!')
  }

  const waitlistSpark = useMemo(() => seedSpark(metrics?.waitlistCount ?? 50), [metrics?.waitlistCount])
  const pmSpark = useMemo(() => seedSpark(metrics?.pmCount ?? 20), [metrics?.pmCount])
  const revenueSpark = useMemo(() => seedSpark(metrics?.totalRentProcessed ?? 500000), [metrics?.totalRentProcessed])
  const signupSpark = useMemo(() => seedSpark(metrics?.signedUpCount ?? 30), [metrics?.signedUpCount])
  const activeSpark = useMemo(() => seedSpark(metrics?.activeCount ?? 20), [metrics?.activeCount])

  const conversionRate = metrics
    ? metrics.waitlistCount > 0
      ? ((metrics.signedUpCount / metrics.waitlistCount) * 100).toFixed(1)
      : '0.0'
    : null

  // Derived Insights (rule-based from data)
  const insights: InsightItem[] = useMemo(() => {
    if (!metrics) return []
    const list: InsightItem[] = []
    if (metrics.waitlistCount > 0 && parseFloat(conversionRate ?? '0') < 20) {
      list.push({ level: 'warning', message: `Waitlist conversion is ${conversionRate}% — below 20% target.` })
    }
    if (metrics.signedUpCount > 0) {
      list.push({ level: 'success', message: `${metrics.signedUpCount} users have fully onboarded on the platform.` })
    }
    if (metrics.pmCount > 0) {
      list.push({ level: 'info', message: `${metrics.pmCount} active property managers registered.` })
    }
    if (metrics.totalRentProcessed > 0) {
      list.push({ level: 'success', message: `₦${metrics.totalRentProcessed.toLocaleString()} in total rent has been processed.` })
    }
    if (metrics.invitedCount > 0) {
      list.push({ level: 'info', message: `${metrics.invitedCount} tenants have pending invitations awaiting acceptance.` })
    }
    if (metrics.activeRate > 0) {
      if (metrics.activeRate < 50) {
        list.push({ level: 'danger', message: `Low user retention! Platform active rate is only ${metrics.activeRate}% (target >60%).` })
      } else {
        list.push({ level: 'success', message: `Healthy engagement! ${metrics.activeRate}% of registered users logged in this month.` })
      }
    }
    return list
  }, [metrics, conversionRate])

  // Simulated weekly activity feed (production would come from API)
  const activityItems: ActivityItem[] = useMemo(() => {
    if (!metrics) return []
    return [
      { id: '1', actor: 'Platform', action: 'Daily metrics sync completed', time: 'Just now', icon: <Activity size={14} />, color: '#6366f1' },
      { id: '2', actor: `${metrics.pmCount} PMs`, action: 'are actively managing properties', time: 'Today', icon: <Building2 size={14} />, color: 'var(--accent)' },
      { id: '3', actor: `${metrics.waitlistCount} tenants`, action: 'on the waitlist queue', time: 'Today', icon: <Clock size={14} />, color: 'var(--warning)' },
      { id: '4', actor: `${metrics.invitedCount} invites`, action: 'pending onboarding acceptance', time: 'This week', icon: <MailOpen size={14} />, color: '#8b5cf6' },
      { id: '5', actor: `${metrics.signedUpCount} tenants`, action: 'successfully onboarded', time: 'This week', icon: <UserCheck size={14} />, color: 'var(--success)' },
    ]
  }, [metrics])

  const signupChartData = useMemo(() =>
    signupSpark.map((v, i) => ({ label: `Day ${i + 1}`, value: v })),
    [signupSpark]
  )
  const revenueChartData = useMemo(() =>
    revenueSpark.map((v, i) => ({ label: `Day ${i + 1}`, value: v })),
    [revenueSpark]
  )

  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
        <Activity size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
        <p style={{ margin: 0 }}>Platform metrics unavailable.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Platform Health Grid ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRadius: '10px', background: 'var(--surface-hover)', padding: '3px', border: '1px solid var(--border)', marginBottom: '8px', width: 'fit-content' }}>
              {(['metrics', 'paying'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSubView(view)}
                  style={{
                    padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: 'none', transition: 'all 0.15s ease',
                    background: subView === view ? 'var(--white)' : 'transparent',
                    color: subView === view ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: subView === view ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {view === 'metrics' ? 'Ecosystem Metrics' : 'Paying Users'}
                </button>
              ))}
            </div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '17px' }}>
              {subView === 'metrics' ? 'Platform Health' : 'Paying Tenants Registry'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {subView === 'metrics'
                ? 'Live snapshot of all key business metrics'
                : `Active paying users by acquisition channel (Total: ${payingUsers.length})`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {subView === 'metrics' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: '7 Days' },
                  { value: 'month', label: '30 Days' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onDateFilterChange(opt.value as DateFilter)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: dateFilter === opt.value ? 'var(--accent)' : 'var(--border)',
                      background: dateFilter === opt.value ? 'var(--accent)' : 'var(--white)',
                      color: dateFilter === opt.value ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleExportOverviewExcel}
              className="btn btn-secondary"
              style={{ height: '32px', padding: '0 12px', gap: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Download size={13} /> Export Overview
            </button>
          </div>
        </div>

        {subView === 'metrics' ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <HealthCard
                label="Waitlist"
                value={metrics.waitlistCount.toLocaleString()}
                sub="vs last week"
                change={+8}
                sparkData={waitlistSpark}
                accentColor="#6366f1"
                icon={<Users size={16} />}
              />
              <HealthCard
                label="Signed Up"
                value={metrics.signedUpCount.toLocaleString()}
                sub="active tenants"
                change={+12}
                sparkData={signupSpark}
                accentColor="var(--success)"
                icon={<UserCheck size={16} />}
              />
              <HealthCard
                label="Property Managers"
                value={metrics.pmCount.toLocaleString()}
                sub="registered PMs"
                change={+3}
                sparkData={pmSpark}
                accentColor="var(--accent)"
                icon={<Building2 size={16} />}
              />
              <HealthCard
                label="Pending Invitations"
                value={metrics.invitedCount.toLocaleString()}
                sub="awaiting acceptance"
                accentColor="#f59e0b"
                icon={<MailOpen size={16} />}
              />
              <HealthCard
                label="Conversion Rate"
                value={`${conversionRate}%`}
                sub="waitlist → tenant"
                change={parseFloat(conversionRate ?? '0') >= 20 ? 4 : -4}
                accentColor="#8b5cf6"
                icon={<ArrowUpRight size={16} />}
              />
              <HealthCard
                label="Active Users"
                value={metrics.activeCount.toLocaleString()}
                sub="active last 30d"
                change={+14}
                sparkData={activeSpark}
                accentColor="#10b981"
                icon={<Activity size={16} />}
              />
              <HealthCard
                label="Active Rate"
                value={`${metrics.activeRate}%`}
                sub="retention percentage"
                change={+5}
                accentColor="#06b6d4"
                icon={<TrendingUp size={16} />}
              />
              <HealthCard
                label="Total Rent Processed"
                value={`₦${(metrics.totalRentProcessed / 1000).toFixed(0)}k`}
                sub="gross rent volume"
                change={+18}
                sparkData={revenueSpark}
                accentColor="var(--success)"
                icon={<CreditCard size={16} />}
              />
              <HealthCard
                label="Transaction Fee Revenue"
                value={`₦${(metrics.feeRevenue / 1000).toFixed(0)}k`}
                sub="net transaction fee revenue"
                change={+6}
                accentColor="#10b981"
                icon={<TrendingUp size={16} />}
              />
              <HealthCard
                label="Benefits Revenue"
                value={`₦${(metrics.benefitsRevenue / 1000).toFixed(0)}k`}
                sub="protection benefits"
                accentColor="#06b6d4"
                icon={<Home size={16} />}
              />
            </div>

            {/* ── Charts Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }} className="grid-mobile-1">
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="section-label">Daily Signups Trend</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Rolling 7-day new user registrations</p>
                </div>
                <AreaChart data={signupChartData} color="var(--success)" height={100} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {signupChartData.map((d) => <span key={d.label}>{d.label}</span>)}
                </div>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="section-label">Revenue Volume Trend</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Rolling 7-day gross rent volume processed</p>
                </div>
                <AreaChart data={revenueChartData} color="var(--accent)" height={100} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {revenueChartData.map((d) => <span key={d.label}>{d.label}</span>)}
                </div>
              </div>
            </div>

            {/* ── Quick Insights + Activity Feed ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }} className="grid-mobile-1">
              {/* Quick Insights */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="section-label">Quick Insights</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Automatically surfaced business signals</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {insights.length > 0 ? insights.map((insight, idx) => {
                    const cfg = insightConfig[insight.level]
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '12px 14px',
                          background: cfg.bg,
                          borderRadius: '10px',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ color: cfg.color, marginTop: '1px', flexShrink: 0 }}>{cfg.icon}</span>
                        <span>{insight.message}</span>
                      </div>
                    )
                  }) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                      No notable insights detected at this time.
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="section-label">Recent Activity</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Latest platform events and state changes</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {activityItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        padding: '12px 0',
                        borderBottom: idx < activityItems.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: `${item.color}18`,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                          <strong>{item.actor}</strong> {item.action}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Paying Users Registry Table view */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {/* Summary KPIs for Paying Users */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <Users size={14} /> Total Paying Users
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {payingUsers.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  active customers on the platform
                </div>
              </div>

              <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <CreditCard size={14} /> Total Paid Volume
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  ₦{totalPaidSum.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  gross rent payments collected
                </div>
              </div>

              <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid #06b6d4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <Zap size={14} /> Paid Benefits Users
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {paidBenefitsCount}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  tenants paying benefits protection fee
                </div>
              </div>
            </div>

            {/* Search and Filters specifically for Paying Users list */}
            <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search paying users by name, email, or registration type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    minWidth: '160px',
                  }}
                >
                  <option value="all">All Paying Users</option>
                  <option value="benefits">Paid Benefits Fee</option>
                  <option value="rent_only">Paid Rent Only</option>
                </select>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing {filteredPayingUsers.length} of {payingUsers.length} paid accounts
              </div>
            </div>

            {/* Paying Users Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tenant Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Registration Type</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Benefits Paid</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Total Paid</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Registration Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayingUsers.length > 0 ? (
                      filteredPayingUsers.map((u, idx) => (
                        <tr key={u.id} style={{ borderBottom: idx < filteredPayingUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => onPreview(u.rawRecord)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                cursor: 'pointer',
                                font: 'inherit',
                                fontWeight: 600,
                                color: 'var(--accent)',
                                textAlign: 'left',
                              }}
                              className="table-row-hover"
                            >
                              {u.name}
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: u.source === 'Waitlist Converted' ? 'var(--success-faint)' : u.source === 'Self Signed Up' ? 'rgba(99,102,241,0.07)' : u.source === 'Invited Tenant' ? 'var(--accent-faint)' : 'rgba(245,158,11,0.07)',
                              color: u.source === 'Waitlist Converted' ? 'var(--success)' : u.source === 'Self Signed Up' ? '#6366f1' : u.source === 'Invited Tenant' ? 'var(--accent)' : '#f59e0b',
                            }}>
                              {u.source}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: u.benefitsPaid > 0 ? 'var(--success)' : 'var(--text-muted)', textAlign: 'right' }}>
                            {u.benefitsPaid > 0 ? `₦${u.benefitsPaid.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>₦{u.totalPaid.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No paying users match the search filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}

export default OverviewTab
