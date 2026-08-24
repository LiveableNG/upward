import React, { useMemo, useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../../services/api.service'
import {
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Download,
  Search,
  Info,
  Smartphone,

  Mail,
  RefreshCcw,
  Laptop,
  Eye,
  Globe,
  Tablet,
  X,
  Clock,
} from 'lucide-react'
import { Square, CheckSquare } from './Checkbox'
import type { FlatMetrics, SignedUpRecord, InvitedRecord } from '../types'
import * as XLSX from 'xlsx'
import { showToast } from '@upward/client-core'

function formatNaira(amount: number): string {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(2)}B`
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`
  return `₦${amount.toLocaleString()}`
}

function formatDuration(sec: number | undefined): string {
  if (sec === undefined || sec === null) return '0s'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}


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
// 30-Day Daily Traffic Trend Line Chart
// ───────────────────────────────────────────────────────────────
interface DailyTrendChartProps {
  trend: Array<{ date: string; activeUsers: number; sessions: number; pageViews: number }>
}

const DailyTrendChart: React.FC<DailyTrendChartProps> = ({ trend }) => {
  if (!trend || trend.length === 0) return null

  const height = 150
  const width = 600

  const maxViews = Math.max(...trend.map(d => Math.max(d.activeUsers, d.sessions, d.pageViews)), 10)
  const totalPoints = trend.length

  const getSvgPoints = (key: 'activeUsers' | 'sessions' | 'pageViews') => {
    return trend.map((d, i) => {
      const x = (i / (totalPoints - 1)) * width
      const y = height - (d[key] / maxViews) * (height - 20) - 10
      return `${x},${y}`
    })
  }

  const viewsPoints = getSvgPoints('pageViews')
  const sessionsPoints = getSvgPoints('sessions')
  const usersPoints = getSvgPoints('activeUsers')

  const formatDate = (dateStr: string) => {
    if (dateStr.length !== 8) return dateStr
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const date = new Date(`${year}-${month}-${day}`)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>30-Day Traffic Trends</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Daily breakdown of visitors, sessions, and pageviews</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '3px', background: '#3b82f6', borderRadius: '2px' }} /> Page Views
            <InfoTooltip text="Total daily page views across all visitors, including repeat views." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '3px', background: 'var(--success)', borderRadius: '2px' }} /> Sessions
            <InfoTooltip text="Total daily visits initiated (expires after 30 minutes of inactivity)." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '3px', background: 'var(--accent)', borderRadius: '2px' }} /> Active Users
            <InfoTooltip text="Total daily unique engaged visitors (each unique individual is counted once)." />
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="10" x2={width} y2="10" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />

          <polygon
            points={`0,${height - 10} ${viewsPoints.join(' ')} ${width},${height - 10}`}
            fill="url(#trend-views-grad)"
          />
          <defs>
            <linearGradient id="trend-views-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <polyline points={viewsPoints.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={sessionsPoints.join(' ')} fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={usersPoints.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>{formatDate(trend[0].date)}</span>
        <span>{formatDate(trend[Math.floor(trend.length / 2)].date)}</span>
        <span>{formatDate(trend[trend.length - 1].date)}</span>
      </div>
    </div>
  )
}


// ───────────────────────────────────────────────────────────────
// User Conversion Funnel Widget
// ───────────────────────────────────────────────────────────────
interface ConversionFunnelProps {
  sessions: number
  events: Record<string, number>
}

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ sessions, events }) => {
  const steps = [
    { label: 'Website Visits', value: sessions, color: '#3b82f6' },
    { label: 'Signup Started', value: events?.signup_started || 0, color: '#8b5cf6' },
    { label: 'Signup Completed', value: events?.signup_completed || 0, color: 'var(--success)' },
    { label: 'Payment Started', value: events?.payment_initiated || 0, color: '#f59e0b' },
    { label: 'Payment Success', value: events?.payment_success || 0, color: 'var(--accent)' },
  ]

  const maxVal = Math.max(sessions, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Conversion Funnel</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Drop-off diagnostic from initial visit to checkout completion</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map((step, idx) => {
          const pct = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0
          const prevVal = idx > 0 ? steps[idx - 1].value : maxVal
          const stepConv = prevVal > 0 ? Math.round((step.value / prevVal) * 100) : 0

          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{step.label}</span>
                  <span>{step.value.toLocaleString()} ({pct}%)</span>
                </div>
                <div style={{ height: '10px', background: 'var(--surface-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: step.color, width: `${pct}%`, borderRadius: '5px' }} />
                </div>
              </div>

              {idx > 0 && (
                <div style={{
                  width: '54px',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: stepConv >= 70 ? 'var(--success)' : stepConv >= 40 ? '#f59e0b' : 'var(--accent)',
                  background: stepConv >= 70 ? 'var(--success-faint)' : stepConv >= 40 ? 'rgba(245, 158, 11, 0.08)' : 'var(--accent-faint)',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: `1px solid ${stepConv >= 70 ? 'rgba(34, 197, 94, 0.15)' : stepConv >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
                }}>
                  {stepConv}% conv
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ───────────────────────────────────────────────────────────────
// Geographic breakdown Card
// ───────────────────────────────────────────────────────────────
interface TopCitiesCardProps {
  cities: Array<{ city: string; count: number }>
  total: number
}

const TopCitiesCard: React.FC<TopCitiesCardProps> = ({ cities, total }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Geographic Distribution</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Top cities sending active users to the platform</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flex: 1 }}>
        {(!cities || cities.length === 0) ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
            No geographical data available
          </div>
        ) : (
          cities.slice(0, 5).map((c) => {
            const percentage = total ? Math.round((c.count / total) * 100) : 0
            return (
              <div key={c.city}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                  <span>{c.city}</span>
                  <span>{c.count} ({percentage}%)</span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                  <div
                    style={{
                      height: '100%',
                      background: '#8b5cf6',
                      width: `${percentage}%`,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}





// ───────────────────────────────────────────────────────────────
// Health KPI Card
// ───────────────────────────────────────────────────────────────
// Info Tooltip — appears on hover over the ⓘ icon
// ───────────────────────────────────────────────────────────────
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const iconRef = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setCoords({
      // place the bubble above the icon; account for current scroll
      top: rect.top + window.scrollY - 8,
      left: rect.left + window.scrollX + rect.width / 2,
    })
  }

  const hide = () => setCoords(null)

  // Clean up if the component unmounts while hovered
  useEffect(() => () => setCoords(null), [])

  const tooltip = coords
    ? ReactDOM.createPortal(
        <div
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
            background: 'var(--dark, #1a1a2e)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 500,
            lineHeight: 1.45,
            padding: '8px 11px',
            borderRadius: '8px',
            whiteSpace: 'pre-line',
            maxWidth: '240px',
            zIndex: 99999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          {text}
          {/* Caret arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--dark, #1a1a2e)',
            }}
          />
        </div>,
        document.body,
      )
    : null

  return (
    <span
      ref={iconRef}
      style={{ display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <Info size={12} style={{ color: 'var(--text-muted)', cursor: 'help', opacity: 0.6 }} />
      {tooltip}
    </span>
  )
}

// ───────────────────────────────────────────────────────────────
// Health KPI Card
// ───────────────────────────────────────────────────────────────
interface HealthCardProps {
  label: string
  value: string | number
  sub?: React.ReactNode
  subStrong?: string      // bolded sub-label for actual counts
  tooltip?: string        // text shown in the info tooltip on hover
  change?: number         // positive or negative %
  sparkData?: number[]
  accentColor: string
  icon: React.ReactNode
  onClick?: () => void
}

const HealthCard: React.FC<HealthCardProps> = ({ label, value, sub, subStrong, tooltip, change, sparkData, accentColor, icon, onClick }) => {
  const isPositive = change !== undefined ? change >= 0 : true
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '20px',
        borderTop: `3px solid ${accentColor}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
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

      {(change !== undefined || sub || subStrong) && (
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
          {subStrong && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>{subStrong}</span>
          )}
          {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>}
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



interface OverviewTabProps {
  metrics: FlatMetrics | null
  signedUpList: SignedUpRecord[]
  invitedList: InvitedRecord[]
  onPreview: (item: any) => void
  token: string
  onNavigateToRevenueUsers?: () => void
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
  signedUpList,
  invitedList,
  onPreview,
  token,
  onNavigateToRevenueUsers,
}) => {
  const [subView, setSubView] = useState<'metrics' | 'paying'>('metrics')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'benefits' | 'rent_only'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const [gaStats, setGaStats] = useState<any>(null)
  const [loadingGaStats, setLoadingGaStats] = useState(true)
  const [showAllPages, setShowAllPages] = useState(false)
  const navigate = useNavigate()

  // Reset selected users when switching filters or subviews
  useEffect(() => {
    setSelectedUserIds(new Set())
  }, [subView, searchQuery, paymentTypeFilter])

  const fetchGaStats = async () => {
    setLoadingGaStats(true)
    try {
      const response = await apiService.get('/admin/app-activity/google-analytics/stats', token)
      if (response) {
        setGaStats(response)
      }
    } catch (error) {
      console.error('Failed to fetch GA stats in OverviewTab:', error)
    } finally {
      setLoadingGaStats(false)
    }
  }

  useEffect(() => {
    fetchGaStats()
  }, [token])

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
      lastPaidAt: string | null
      transactions: any[]
      paymentRequests: any[]
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
          lastPaidAt: u.lastPaidAt || null,
          transactions: u.transactions || [],
          paymentRequests: u.paymentRequests || [],
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
          lastPaidAt: u.lastPaidAt || null,
          transactions: u.transactions || [],
          paymentRequests: u.paymentRequests || [],
          rawRecord: u,
        })
      }
    })

    return list.sort((a, b) => {
      const dateA = new Date(a.lastPaidAt || a.createdAt).getTime()
      const dateB = new Date(b.lastPaidAt || b.createdAt).getTime()
      return dateB - dateA
    })
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

    const invitedSignedUpCount = invitedList.filter(
      (i) => i.status === 'INVITED_SIGNED_UP' || i.status === 'SIGNED_UP_PAID'
    ).length
    const invitedPendingCount = invitedList.filter((i) => i.status === 'INVITED_PENDING').length
    const convertedCount = metrics?.waitlistConverted ?? 0

    // Sheet 1: Platform KPI Summary — enriched with actual figures, formulas and targets
    const generalSummary = [
      {
        Metric: 'Waitlist Entries',
        Value: metrics?.waitlistCount ?? 0,
        'Actual Detail': `${metrics?.waitlistCount ?? 0} total registrations`,
        Description: 'Total number of people who joined the waitlist. Includes both pending and converted.',
        Target: '—',
      },
      {
        Metric: 'Registered Tenants',
        Value: metrics?.totalAccountsCreated ?? 0,
        'Actual Detail': `${metrics?.totalAccountsCreated ?? 0} total accounts created`,
        Description: `All users who created an account. Breakdown: ${metrics?.waitlistConverted ?? 0} waitlist converts + ${(metrics?.signedUpCount ?? 0) - (metrics?.waitlistConverted ?? 0)} direct sign-ups + ${metrics?.invitedOnboardedCount ?? 0} invited who signed up.`,
        Target: '—',
      },
      {
        Metric: 'Property Managers',
        Value: metrics?.pmCount ?? 0,
        'Actual Detail': `${metrics?.pmCount ?? 0} registered PMs`,
        Description: 'Property management companies or landlords registered on the platform.',
        Target: '—',
      },
      {
        Metric: 'Invited Tenants (Total)',
        Value: metrics?.invitedCount ?? 0,
        'Actual Detail': `${invitedSignedUpCount} signed up · ${invitedPendingCount} still pending`,
        Description: 'Tenants invited by property managers. Breakdown: signed-up vs still awaiting.',
        Target: '—',
      },
      {
        Metric: 'Conversion Rate',
        Value: metrics ? `${((metrics.waitlistConverted / Math.max(metrics.waitlistCount, 1)) * 100).toFixed(1)}%` : '0%',
        'Actual Detail': `${convertedCount} of ${metrics?.waitlistCount ?? 0} waitlist entries converted`,
        Description: 'Formula: (Waitlist Converted ÷ Waitlist Total) × 100. Note: Signed Up count is higher as it includes direct sign-ups.',
        Target: '≥ 20%',
      },
      {
        Metric: 'Active Users (30-day)',
        Value: metrics?.activeCount ?? 0,
        'Actual Detail': `${metrics?.activeCount ?? 0} of ${metrics?.signedUpCount ?? 0} users active`,
        Description: 'Registered tenants with at least one recorded app activity in the last 30 days.',
        Target: '—',
      },
      {
        Metric: 'Active Engagement Rate',
        Value: metrics ? `${metrics.activeRate}%` : '0%',
        'Actual Detail': `${metrics?.activeCount ?? 0} of ${metrics?.signedUpCount ?? 0} users`,
        Description: 'Formula: (Active Users ÷ Total Signed Up) × 100',
        Target: '≥ 60%',
      },
      {
        Metric: 'Total Rent Processed',
        Value: `₦${metrics?.totalRentProcessed.toLocaleString() ?? '0'}`,
        'Actual Detail': formatNaira(metrics?.totalRentProcessed ?? 0),
        Description: 'Gross value of all successful rent payments before fees are deducted.',
        Target: '—',
      },
      {
        Metric: 'Transaction Fee Revenue',
        Value: `₦${metrics?.feeRevenue.toLocaleString() ?? '0'}`,
        'Actual Detail': formatNaira(metrics?.feeRevenue ?? 0),
        Description: "Upward's core revenue from processing fees on rent transactions.",
        Target: '—',
      },
      {
        Metric: 'Benefits Revenue',
        Value: `₦${metrics?.benefitsRevenue.toLocaleString() ?? '0'}`,
        'Actual Detail': formatNaira(metrics?.benefitsRevenue ?? 0),
        Description: 'Revenue from the optional Upward Benefits protection program.',
        Target: '—',
      },
    ]

    const wsSummary = XLSX.utils.json_to_sheet(generalSummary)
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Ecosystem Summary')

    // Sheet 2: Invited Tenants Breakdown
    const invitedBreakdown = [
      { Category: 'Total Invited', Count: metrics?.invitedCount ?? 0, Notes: 'All tenants ever invited by a PM' },
      { Category: 'Signed Up (Onboarded)', Count: invitedSignedUpCount, Notes: 'Accepted invite and created account' },
      { Category: 'Still Pending', Count: invitedPendingCount, Notes: 'Invitation sent but not accepted yet' },
      { Category: 'Guest Paid', Count: invitedList.filter(i => i.status === 'GUEST_PAID').length, Notes: 'Made guest payment without full sign-up' },
      { Category: 'Onboarded & Paid', Count: invitedList.filter(i => i.status === 'SIGNED_UP_PAID').length, Notes: 'Signed up and made at least one payment' },
    ]
    const wsInvited = XLSX.utils.json_to_sheet(invitedBreakdown)
    XLSX.utils.book_append_sheet(workbook, wsInvited, 'Invited Tenants Breakdown')

    // Sheet 3: Paying Users Registry
    const payingUsersRows = payingUsers.map((u) => ({
      'Tenant Name': u.name,
      'Email Address': u.email,
      'Registration Type': u.source,
      'Benefits Paid (₦)': u.benefitsPaid > 0 ? u.benefitsPaid : 0,
      'Rent Paid (₦)': u.totalPaid - u.benefitsPaid,
      'Total Paid (₦)': u.totalPaid,
      'Date Paid': new Date(u.lastPaidAt || u.createdAt).toLocaleDateString('en-GB'),
    }))

    const wsPaying = XLSX.utils.json_to_sheet(payingUsersRows)
    XLSX.utils.book_append_sheet(workbook, wsPaying, 'Paying Tenants Registry')

    // Auto-fit column widths
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
    fitCols(wsInvited, invitedBreakdown)
    fitCols(wsPaying, payingUsersRows)

    XLSX.writeFile(workbook, `Upward_Ecosystem_Overview_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('Overview exported: 3 sheets — Summary, Invited Breakdown & Paying Tenants!')
  }

  const revenueSpark = useMemo(() => seedSpark(metrics?.totalRentProcessed ?? 500000), [metrics?.totalRentProcessed])
  const signupSpark = useMemo(() => seedSpark(metrics?.totalAccountsCreated ?? 30), [metrics?.totalAccountsCreated])





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
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              <HealthCard
                label="Total Users"
                value={metrics.totalUsersWithPassword.toLocaleString()}
                sub="users with active accounts"
                sparkData={signupSpark}
                accentColor="#6366f1"
                icon={<Users size={16} />}
                tooltip={`Total number of fully registered users on the platform (including both password and Google OAuth accounts).\nThis counts all completed sign-ups and onboarded users (excludes shadow or invited-pending accounts that have no credentials/password set).`}
              />
              <HealthCard
                label="Total Rent Processed"
                value={formatNaira(metrics.totalRentProcessed)}
                sub="gross rent collected"
                sparkData={revenueSpark}
                accentColor="var(--success)"
                icon={<CreditCard size={16} />}
                tooltip={`Total gross value of all successful rent payments processed through the Upward platform.\nThis is the combined sum before deducting transaction fees and benefits.`}
              />
              <HealthCard
                label="Platform Revenue"
                value={formatNaira(metrics.feeRevenue + metrics.benefitsRevenue)}
                sub={
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Tx Fee: <strong style={{ color: 'var(--text)' }}>{formatNaira(metrics.feeRevenue)}</strong></span>
                    <span>•</span>
                    <span>Benefits: <strong style={{ color: 'var(--text)' }}>{formatNaira(metrics.benefitsRevenue)}</strong></span>
                  </div>
                }
                accentColor="#10b981"
                icon={<TrendingUp size={16} />}
                onClick={onNavigateToRevenueUsers}
                tooltip={`Total revenue earned by the platform (Click to view breakdown of contributing users).\nThis includes both transaction fees (from processing rent payments) and benefits fees (from optional Upward protection packages).`}
              />
              <HealthCard
                label="Login Sessions (Timeframe)"
                value={metrics.activitySessionsCount !== undefined ? metrics.activitySessionsCount.toLocaleString() : 'N/A'}
                sub="active sessions in timeframe"
                accentColor="#e11d48"
                icon={<Activity size={16} />}
                tooltip="Total number of active login/authorization sessions created for both Tenants and PMs in the selected timeframe."
              />
            </div>

            {/* ── Email Campaigns & Open Performance ── */}
            {metrics.emailLogsSummary && (
              <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={18} style={{ color: 'var(--accent)' }} /> Email Campaigns & Open Performance
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Timeframe statistics for emails sent out, opened vs not opened, and open rates.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Sent</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{metrics.emailLogsSummary.totalSent.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Opened</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>{metrics.emailLogsSummary.totalOpened.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Not Opened</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-muted)' }}>{metrics.emailLogsSummary.totalNotOpened.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Open Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{metrics.emailLogsSummary.openRate}%</div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>Email Subject</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, width: '100px', textAlign: 'center' }}>Sent</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, width: '100px', textAlign: 'center' }}>Opened</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, width: '100px', textAlign: 'center' }}>Not Opened</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, width: '150px', textAlign: 'center' }}>Open Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.emailLogsSummary.bySubject.length > 0 ? (
                          metrics.emailLogsSummary.bySubject.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < metrics.emailLogsSummary!.bySubject.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.subject}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.sent}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{item.opened}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>{item.notOpened}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                  <span style={{ fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>{item.openRate}%</span>
                                  <div style={{ width: '60px', height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--accent)', width: `${item.openRate}%`, borderRadius: '3px' }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No email logs sent in this timeframe.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Web Traffic & Engagement Section (GA4) ── */}
            <div className="card" style={{ padding: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <style>{`
                @keyframes live-pulse {
                  0% { opacity: 0.4; transform: scale(0.9); }
                  50% { opacity: 1; transform: scale(1.15); }
                  100% { opacity: 0.4; transform: scale(0.9); }
                }
                .live-pulse-dot {
                  animation: live-pulse 2s infinite ease-in-out;
                }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Activity size={18} style={{ color: 'var(--accent)' }} /> Website Traffic & Engagement
                    {!loadingGaStats && gaStats?.status !== 'unavailable' && typeof gaStats?.realtimeActiveUsers === 'number' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#22c55e',
                        background: 'rgba(34, 197, 94, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        marginLeft: '8px',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <span className="live-pulse-dot" style={{
                          width: '6px',
                          height: '6px',
                          background: '#22c55e',
                          borderRadius: '50%'
                        }} />
                        {gaStats.realtimeActiveUsers} Live User{gaStats.realtimeActiveUsers !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Real-time web analytics and conversion funnel insights powered by Google Analytics 4 (GA4).
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={fetchGaStats}
                  disabled={loadingGaStats}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '34px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCcw size={14} className={loadingGaStats ? 'spin' : ''} />
                  Refresh GA Data
                </button>
              </div>

              {!loadingGaStats && gaStats?.status === 'unavailable' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  background: 'var(--bg)',
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  gap: '12px'
                }}>
                  <Info size={28} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                      Google Analytics is currently unavailable
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '480px' }}>
                      {gaStats.reason || 'Failed to fetch live web traffic stats. Please check your internet connection or server configurations.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* GA4 Mini Stats Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {/* Website Visitors */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Website Visitors (30d)
                          <InfoTooltip text="The number of unique individual visitors who engaged with the platform in the last 30 days." />
                        </span>
                        <div style={{ color: 'var(--accent)', background: 'var(--accent-faint)', padding: '4px', borderRadius: '6px' }}>
                          <Users size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : gaStats?.activeUsers?.toLocaleString() || 0}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Unique active visitors
                        </p>
                      </div>
                    </div>

                    {/* Visits / Sessions */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Visits / Sessions
                          <InfoTooltip text="The total number of individual visits initiated on the platform. A visit ends after 30 minutes of inactivity." />
                        </span>
                        <div style={{ color: 'var(--success)', background: 'var(--success-faint)', padding: '4px', borderRadius: '6px' }}>
                          <Activity size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : gaStats?.sessions?.toLocaleString() || 0}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Total sessions initiated
                        </p>
                      </div>
                    </div>

                    {/* Page Views */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Page Views
                          <InfoTooltip text="The total number of page views across the platform, including repeat page views by the same visitor." />
                        </span>
                        <div style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)', padding: '4px', borderRadius: '6px' }}>
                          <Eye size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : gaStats?.pageViews?.toLocaleString() || 0}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Total routes viewed
                        </p>
                      </div>
                    </div>

                    {/* Pages per Visit */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Pages per Visit
                          <InfoTooltip text="The average number of screens or pages viewed during a single visit (Page Views divided by Visits)." />
                        </span>
                        <div style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.08)', padding: '4px', borderRadius: '6px' }}>
                          <Globe size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : gaStats?.sessions ? (gaStats.pageViews / gaStats.sessions).toFixed(1) : '0.0'}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Average page depth
                        </p>
                      </div>
                    </div>

                    {/* Average Session Duration */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Avg Session Duration
                          <InfoTooltip text="The average amount of time visitors spent actively engaged on the site per visit." />
                        </span>
                        <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '4px', borderRadius: '6px' }}>
                          <Clock size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : formatDuration(gaStats?.averageSessionDuration)}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Time spent per session
                        </p>
                      </div>
                    </div>

                    {/* Bounce Rate */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Bounce Rate
                          <InfoTooltip text="The percentage of visits where the user left the site after viewing only a single page without performing any further actions." />
                        </span>
                        <div style={{ color: 'var(--warning)', background: 'var(--warning-faint)', padding: '4px', borderRadius: '6px' }}>
                          <TrendingDown size={14} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {loadingGaStats ? '...' : (gaStats?.bounceRate ? `${(gaStats.bounceRate * 100).toFixed(1)}%` : '0.0%')}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>
                          Single-page session rate
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 30-Day Traffic Trends Line Chart */}
                  <DailyTrendChart trend={gaStats?.dailyTrend} />

                  {/* Devices & Top Pages Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr',
                      gap: '20px',
                    }}
                    className="grid-mobile-1"
                  >
                    {/* Left Column: Devices & Traffic Sources */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Visitor Devices */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitor Devices</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Traffic distribution by device category</p>
                        </div>
                        {loadingGaStats ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Loading device categories...
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', flex: 1 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Smartphone size={13} style={{ color: 'var(--accent)' }} /> Mobile Browser</span>
                                <span>{gaStats?.devices?.mobile || 0} ({gaStats?.activeUsers ? Math.round(((gaStats.devices?.mobile || 0) / gaStats.activeUsers) * 100) : 0}%)</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    background: 'var(--accent)',
                                    width: `${gaStats?.activeUsers ? (((gaStats.devices?.mobile || 0) / gaStats.activeUsers) * 100) : 0}%`,
                                    borderRadius: '3px',
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Laptop size={13} style={{ color: 'var(--success)' }} /> Desktop</span>
                                <span>{gaStats?.devices?.desktop || 0} ({gaStats?.activeUsers ? Math.round(((gaStats.devices?.desktop || 0) / gaStats.activeUsers) * 100) : 0}%)</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    background: 'var(--success)',
                                    width: `${gaStats?.activeUsers ? (((gaStats.devices?.desktop || 0) / gaStats.activeUsers) * 100) : 0}%`,
                                    borderRadius: '3px',
                                  }}
                                />
                              </div>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tablet size={13} style={{ color: 'var(--warning)' }} /> Tablet</span>
                                <span>{gaStats?.devices?.tablet || 0} ({gaStats?.activeUsers ? Math.round(((gaStats.devices?.tablet || 0) / gaStats.activeUsers) * 100) : 0}%)</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    background: 'var(--warning)',
                                    width: `${gaStats?.activeUsers ? (((gaStats.devices?.tablet || 0) / gaStats.activeUsers) * 100) : 0}%`,
                                    borderRadius: '3px',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Traffic Sources */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Traffic Acquisition</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Traffic distribution by default channel group</p>
                        </div>
                        {loadingGaStats ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Loading traffic sources...
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', flex: 1 }}>
                            {Object.entries(gaStats?.trafficSources || {}).length === 0 ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                                No traffic source data available
                              </div>
                            ) : (
                              Object.entries(gaStats.trafficSources as Record<string, number>)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 4)
                                .map(([source, count]) => {
                                  const percentage = gaStats?.activeUsers ? Math.round((count / gaStats.activeUsers) * 100) : 0;
                                  let tooltipText = `Traffic classified as ${source} under Google Analytics default channel groupings.`;
                                  const sLower = source.toLowerCase();
                                  if (sLower.includes('direct')) {
                                    tooltipText = "Direct traffic. Users typed the URL directly, clicked a bookmark, or accessed the site via links in untracked apps (PDFs, WhatsApp, Slack, emails without UTM parameters).";
                                  } else if (sLower.includes('organic social')) {
                                    tooltipText = "Organic Social media traffic. Users clicked on links on social networks like Facebook, X/Twitter, Instagram, or LinkedIn without paid promotion.";
                                  } else if (sLower.includes('organic search')) {
                                    tooltipText = "Organic Search engine traffic. Users clicked on unpaid listings on search engines like Google, Bing, or Yahoo.";
                                  } else if (sLower.includes('referral')) {
                                    tooltipText = "Referral traffic from external websites. Users clicked a link on another website that points to your site.";
                                  } else if (sLower.includes('email')) {
                                    tooltipText = "Email traffic. Traffic originating from email campaigns or email clients, typically tagged with UTM parameters.";
                                  }

                                  return (
                                    <div key={source}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
                                          {source}
                                          <InfoTooltip text={tooltipText} />
                                        </span>
                                        <span>{count} ({percentage}%)</span>
                                      </div>
                                      <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                        <div
                                          style={{
                                            height: '100%',
                                            background: '#3b82f6',
                                            width: `${percentage}%`,
                                            borderRadius: '3px',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Top Referring Sites */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Referring Sites</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>External websites sending traffic to your platform</p>
                        </div>
                        {loadingGaStats ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Loading referrals...
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flex: 1 }}>
                            {(!gaStats?.topReferrals || gaStats.topReferrals.length === 0) ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                                No referral traffic recorded
                              </div>
                            ) : (
                              gaStats.topReferrals.slice(0, 5).map((ref: { source: string; count: number }) => {
                                const percentage = gaStats?.activeUsers ? Math.round((ref.count / gaStats.activeUsers) * 100) : 0;
                                return (
                                  <div key={ref.source}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                      <span style={{ fontFamily: 'monospace', color: 'var(--text)', fontSize: '11px' }}>{ref.source}</span>
                                      <span>{ref.count} ({percentage}%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                      <div
                                        style={{
                                          height: '100%',
                                          background: 'var(--success)',
                                          width: `${percentage}%`,
                                          borderRadius: '3px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Visited Pages & Funnel Drop-off Diagnostic */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Visited Pages & drop-off diagnosis</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Monitor critical routes to diagnose onboarding drop-offs and traffic bottlenecks</p>
                      </div>
                      {loadingGaStats ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          Loading popular pages...
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {((gaStats?.topPages || []).slice(0, showAllPages ? 50 : 5)).map((page: any, idx: number) => {
                            let pathLabel = '';
                            let badgeColor = '';
                            let badgeBg = '';
                            
                            if (page.path.includes('login')) {
                              pathLabel = 'Login Gate';
                              badgeColor = 'var(--success)';
                              badgeBg = 'var(--success-faint)';
                            } else if (page.path.includes('signup') || page.path.includes('register')) {
                              pathLabel = 'Signup Funnel';
                              badgeColor = '#8b5cf6';
                              badgeBg = 'rgba(139, 92, 246, 0.08)';
                            } else if (page.path.includes('onboarding')) {
                              pathLabel = 'Onboarding Process';
                              badgeColor = '#3b82f6';
                              badgeBg = 'rgba(59, 130, 246, 0.08)';
                            } else if (page.path.includes('payment') || page.path.includes('rent')) {
                              pathLabel = 'Rent Checkout';
                              badgeColor = 'var(--accent)';
                              badgeBg = 'var(--accent-faint)';
                            } else if (page.path.includes('/pm/dashboard')) {
                              pathLabel = 'PM Dashboard';
                              badgeColor = 'var(--accent)';
                              badgeBg = 'var(--accent-faint)';
                            } else if (page.path.includes('/pay/dashboard')) {
                              pathLabel = 'Tenant Dashboard';
                              badgeColor = '#3b82f6';
                              badgeBg = 'rgba(59, 130, 246, 0.08)';
                            } else if (page.path === '/dashboard') {
                              pathLabel = 'Main Dashboard';
                              badgeColor = 'var(--text-secondary)';
                              badgeBg = 'var(--surface-hover)';
                            } else if (page.path === '/') {
                              pathLabel = 'Landing Page';
                              badgeColor = 'var(--text-secondary)';
                              badgeBg = 'var(--surface-hover)';
                            }

                            return (
                              <div
                                key={page.path}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  background: 'var(--white)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <span style={{ fontWeight: 800, color: 'var(--accent)', minWidth: '16px' }}>#{idx + 1}</span>
                                  <span style={{ fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '12px' }}>
                                    {page.path}
                                  </span>
                                  {pathLabel && (
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      color: badgeColor,
                                      background: badgeBg,
                                      textTransform: 'uppercase',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {pathLabel}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0, fontSize: '12px' }}>
                                  {page.views.toLocaleString()} views
                                </span>
                              </div>
                            )
                          })}

                          {/* Toggle expand button */}
                          {(gaStats?.topPages || []).length > 5 && (
                            <button
                              type="button"
                              onClick={() => setShowAllPages(!showAllPages)}
                              className="btn btn-secondary"
                              style={{
                                alignSelf: 'center',
                                marginTop: '8px',
                                fontSize: '12px',
                                padding: '6px 16px',
                                height: 'auto',
                                width: 'fit-content',
                              }}
                            >
                              {showAllPages ? 'View Less' : `View More (${(gaStats?.topPages || []).length - 5} pages)`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Funnel & Sources Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr',
                      gap: '20px',
                      marginTop: '20px',
                    }}
                    className="grid-mobile-1"
                  >
                    {/* Left: User Conversion Funnel */}
                    <ConversionFunnel sessions={gaStats?.sessions || 0} events={gaStats?.funnelEvents} />

                    {/* Right: Geographic Distribution & Detailed Sources */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Top Cities */}
                      <TopCitiesCard cities={gaStats?.topCities} total={gaStats?.activeUsers} />

                      {/* Detailed Sources (Source / Medium) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source / Medium details</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0 0' }}>Granular user acquisition channels</p>
                        </div>
                        {loadingGaStats ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Loading sources...
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flex: 1 }}>
                            {(!gaStats?.granularSources || gaStats.granularSources.length === 0) ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                                No source details available
                              </div>
                            ) : (
                              gaStats.granularSources.slice(0, 5).map((src: { sourceMedium: string; count: number }) => {
                                const percentage = gaStats?.activeUsers ? Math.round((src.count / gaStats.activeUsers) * 100) : 0;
                                return (
                                  <div key={src.sourceMedium}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                      <span style={{ fontFamily: 'monospace', color: 'var(--text)', fontSize: '11px' }}>{src.sourceMedium}</span>
                                      <span>{src.count} ({percentage}%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                      <div
                                        style={{
                                          height: '100%',
                                          background: '#ef4444',
                                          width: `${percentage}%`,
                                          borderRadius: '3px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
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

            {/* Bulk Action Bar for Paying Users */}
            {selectedUserIds.size > 0 && (
              <div style={{
                background: 'var(--accent-faint)',
                border: '1px solid var(--accent-muted)',
                borderRadius: '10px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                fontSize: '13px',
              }}>
                <strong style={{ color: 'var(--accent)' }}>{selectedUserIds.size} selected</strong>
                <button
                  onClick={() => {
                    const selectedList = payingUsers.filter((u) => selectedUserIds.has(u.id))
                    const selectedUsers = selectedList.map((u) => ({
                      ...u.rawRecord,
                      id: u.id,
                      uuid: u.rawRecord?.uuid || u.id,
                      firstName: u.rawRecord?.firstName || u.name.split(' ')[0] || '',
                      lastName: u.rawRecord?.lastName || u.name.split(' ').slice(1).join(' ') || '',
                      email: u.email,
                      phone: u.rawRecord?.phone || '',
                      origin: u.source === 'Waitlist Converted' ? 'WAITLIST' : u.source === 'Invited Tenant' ? 'INVITED' : 'SELF_REGISTERED',
                    }))
                    navigate('/emails', { state: { selectedUsers } })
                  }}
                  className="btn"
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    background: 'var(--accent)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Mail size={13} /> Send Email
                </button>
                <button
                  onClick={() => setSelectedUserIds(new Set())}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Paying Users Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px 12px 20px', width: '44px' }}>
                        <button
                          onClick={() => {
                            const visibleIds = filteredPayingUsers.map((u) => u.id)
                            const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedUserIds.has(id))
                            if (allSelected) {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev)
                                visibleIds.forEach((id) => next.delete(id))
                                return next
                              })
                            } else {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev)
                                visibleIds.forEach((id) => next.add(id))
                                return next
                              })
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}
                        >
                          {filteredPayingUsers.length > 0 && filteredPayingUsers.every((u) => selectedUserIds.has(u.id)) ? (
                            <CheckSquare size={17} color="var(--accent)" />
                          ) : (
                            <Square size={17} />
                          )}
                        </button>
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tenant Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Registration Type</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Benefits Paid</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Total Paid</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Last Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayingUsers.length > 0 ? (
                      filteredPayingUsers.map((u, idx) => (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: idx < filteredPayingUsers.length - 1 ? '1px solid var(--border)' : 'none',
                            background: selectedUserIds.has(u.id) ? 'rgba(217,119,87,0.04)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '12px 8px 12px 20px' }}>
                            <button
                              onClick={() => {
                                setSelectedUserIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(u.id)) next.delete(u.id)
                                  else next.add(u.id)
                                  return next
                                })
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}
                            >
                              {selectedUserIds.has(u.id) ? (
                                <CheckSquare size={17} color="var(--accent)" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>
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
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                            {u.lastPaidAt ? new Date(u.lastPaidAt).toLocaleDateString() : new Date(u.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
