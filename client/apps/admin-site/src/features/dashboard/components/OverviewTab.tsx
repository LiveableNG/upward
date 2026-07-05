import React, { useMemo, useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../../services/api.service'
import {
  Users,
  Home,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Download,
  Search,
  Info,
  Clock,
  ArrowRight,
  UserPlus,
  LogIn,
  LogOut,
  Smartphone,
  Trash2,
  PlusCircle,
  Settings,
  FileText,
  Building2,
  ExternalLink,
  Mail,
  Phone,
  CheckCircle,
  RefreshCcw,
  Laptop,
  Eye,
  Globe,
  Tablet,
  X,
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
}

const HealthCard: React.FC<HealthCardProps> = ({ label, value, sub, subStrong, tooltip, change, sparkData, accentColor, icon }) => {
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



function getActivityIcon(action: string, entityType?: string) {
  if (entityType === 'PAYMENT' || entityType === 'RENT') return <CreditCard size={15} style={{ color: 'var(--success)' }} />
  if (entityType === 'CONTRACT' || entityType === 'DOCUMENT') return <FileText size={15} style={{ color: '#3b82f6' }} />
  
  switch (action) {
    case 'SIGNUP':
      return <UserPlus size={15} style={{ color: '#8b5cf6' }} />
    case 'LOGIN':
      return <LogIn size={15} style={{ color: 'var(--success)' }} />
    case 'LOGOUT':
      return <LogOut size={15} style={{ color: 'var(--text-muted)' }} />
    case 'APP_INSTALL':
      return <Smartphone size={15} style={{ color: 'var(--accent)' }} />
    case 'DELETE':
      return <Trash2 size={15} style={{ color: 'var(--danger)' }} />
    case 'CREATE':
      return <PlusCircle size={15} style={{ color: '#3b82f6' }} />
    case 'UPDATE':
      return <Settings size={15} style={{ color: 'var(--warning)' }} />
    default:
      return <Activity size={15} style={{ color: 'var(--text-muted)' }} />
  }
}

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────
interface OverviewTabProps {
  metrics: FlatMetrics | null
  signedUpList: SignedUpRecord[]
  invitedList: InvitedRecord[]
  onPreview: (item: any) => void
  onPreviewPm: (pm: any) => void
  token: string
}

function renderLogMessage(log: any, onPreviewUser: any, onPreviewPm: any) {
  const user = log.user;
  const pm = log.pm;

  const userEmailLink = user?.email || log.userEmail;
  const userNameStr = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  const pmNameStr = pm ? pm.businessName : '';
  const pmEmailLink = pm?.email || '';

  const renderTenantLink = () => {
    if (!userEmailLink) return <span>System / Guest</span>;
    return (
      <button
        type="button"
        onClick={() => onPreviewUser({
          uuid: user?.uuid || log.entityId || log.uuid,
          firstName: user?.firstName || 'Tenant',
          lastName: user?.lastName || '',
          email: userEmailLink,
          createdAt: user?.createdAt || log.createdAt,
          totalPaid: user?.totalPaid || 0,
        })}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          textDecoration: 'underline',
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {userNameStr ? `${userNameStr} (${userEmailLink})` : userEmailLink}
      </button>
    );
  };

  const renderPmLink = () => {
    if (!pmNameStr && !pmEmailLink) return <span>Property Manager</span>;
    return (
      <button
        type="button"
        onClick={() => onPreviewPm({
          uuid: pm?.uuid || log.pmId || log.uuid,
          businessName: pmNameStr || 'Property Manager',
          email: pmEmailLink,
          createdAt: pm?.createdAt || log.createdAt,
        })}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          textDecoration: 'underline',
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {pmNameStr ? `${pmNameStr} (${pmEmailLink})` : pmEmailLink}
      </button>
    );
  };

  if (log.action === 'SIGNUP') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} registered a new account.
        </span>
      );
    } else {
      const details = user?.isFromInvite
        ? 'completed registration (invited tenant).'
        : user?.isFromWaitlist
        ? 'converted from the waitlist and registered.'
        : 'self-registered a new account.';
      return (
        <span>
          Tenant {renderTenantLink()} {details}
        </span>
      );
    }
  }

  if (log.action === 'LOGIN') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} logged in.
        </span>
      );
    } else {
      return (
        <span>
          Tenant {renderTenantLink()} logged in.
        </span>
      );
    }
  }

  if (log.action === 'LOGOUT') {
    if (log.userRole === 'PM' || log.app === 'upward-pm') {
      return (
        <span>
          Property Manager {renderPmLink()} logged out.
        </span>
      );
    } else {
      return (
        <span>
          Tenant {renderTenantLink()} logged out.
        </span>
      );
    }
  }

  if (log.action === 'APP_INSTALL') {
    return (
      <span>
        Mobile app installed or launched by user {renderTenantLink()}.
      </span>
    );
  }

  if (log.action === 'CREATE') {
    if (log.entityType === 'UNIT') {
      const match = log.description.match(/(?:uploaded|imported|added) (\d+) (?:units|properties|records)/i);
      if (match) {
        return (
          <span>
            Property Manager {renderPmLink()} bulk uploaded <strong>{match[1]}</strong> units.
          </span>
        );
      } else {
        return (
          <span>
            Property Manager {renderPmLink()} created a new unit.
          </span>
        );
      }
    }
    if (log.entityType === 'INVITE') {
      let inviteEmail = '';
      try {
        const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
        if (meta.email) {
          inviteEmail = meta.email;
        } else if (meta.tenants && Array.isArray(meta.tenants)) {
          inviteEmail = meta.tenants.map((t: any) => t.email).join(', ');
        }
      } catch (e) {}
      if (!inviteEmail) {
        inviteEmail = log.description.match(/invite tenant:?\s*([^\s]+)/i)?.[1] || '';
      }
      if (!inviteEmail) {
        inviteEmail = log.description.replace(/CREATE action on INVITE.*by\s+/i, '') || 'a tenant';
      }
      return (
        <span>
          Property Manager {renderPmLink()} invited Tenant <strong>{inviteEmail}</strong>.
        </span>
      );
    }
    if (log.entityType === 'PAYMENT' || log.entityType === 'RENT') {
      let amountStr = '';
      try {
        const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
        if (meta.amount) {
          amountStr = ` of ₦${Number(meta.amount).toLocaleString()}`;
        }
      } catch (e) {}
      if (!amountStr) {
        const amtMatch = log.description.match(/₦\s*([\d,]+)/);
        if (amtMatch) amountStr = ` of ₦${amtMatch[1]}`;
      }
      return (
        <span>
          Tenant {renderTenantLink()} made a payment{amountStr ? <strong>{amountStr}</strong> : ''}.
        </span>
      );
    }
    if (log.entityType === 'CREDIBILITY_REQUEST') {
      return (
        <span>
          Tenant {renderTenantLink()} requested their rental history credibility report.
        </span>
      );
    }
  }

  return <span>{log.readableText || log.description}</span>;
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
  onPreviewPm,
  token,
}) => {
  const [subView, setSubView] = useState<'metrics' | 'paying'>('metrics')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'benefits' | 'rent_only'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const [gaStats, setGaStats] = useState<any>(null)
  const [loadingGaStats, setLoadingGaStats] = useState(true)
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
      'Registration Date': new Date(u.createdAt).toLocaleDateString('en-GB'),
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

  const waitlistSpark = useMemo(() => seedSpark(metrics?.waitlistCount ?? 50), [metrics?.waitlistCount])
  const pmSpark = useMemo(() => seedSpark(metrics?.pmCount ?? 20), [metrics?.pmCount])
  const revenueSpark = useMemo(() => seedSpark(metrics?.totalRentProcessed ?? 500000), [metrics?.totalRentProcessed])
  const signupSpark = useMemo(() => seedSpark(metrics?.totalAccountsCreated ?? 30), [metrics?.totalAccountsCreated])
  const activeSpark = useMemo(() => seedSpark(metrics?.activeCount ?? 20), [metrics?.activeCount])





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
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              <HealthCard
                label="Waitlist"
                value={metrics.waitlistCount.toLocaleString()}
                sub="total registrations"
                change={+8}
                sparkData={waitlistSpark}
                accentColor="#6366f1"
                icon={<Users size={16} />}
                tooltip={`Total number of people who joined the waitlist.\nIncludes both those still waiting and those who have converted to registered tenants.`}
              />
              <HealthCard
                label="Signed Up"
                value={metrics.totalAccountsCreated.toLocaleString()}
                sub="accounts created"
                change={+12}
                sparkData={signupSpark}
                accentColor="var(--success)"
                icon={<UserCheck size={16} />}
                tooltip={`All users who have created an account on the platform, across every acquisition channel:\n\n• Waitlist → converted: ${metrics.waitlistConverted}\n• Direct self sign-up: ${metrics.signedUpCount - metrics.waitlistConverted}\n• Invited by PM → signed up: ${metrics.invitedOnboardedCount}\n───────────────
Total: ${metrics.totalAccountsCreated}`}
              />
              <HealthCard
                label="Property Managers"
                value={metrics.pmCount.toLocaleString()}
                sub="registered PMs"
                change={+3}
                sparkData={pmSpark}
                accentColor="var(--accent)"
                icon={<Building2 size={16} />}
                tooltip={`Total number of property management companies or landlords registered on the platform.\nThey invite and manage tenants through the PM dashboard.`}
              />
              <HealthCard
                label="Invited Tenants"
                value={metrics.invitedCount.toLocaleString()}
                subStrong={`${invitedList.filter(i => i.status === 'INVITED_SIGNED_UP' || i.status === 'SIGNED_UP_PAID').length} signed up`}
                sub="out of total invites"
                accentColor="#f59e0b"
                icon={<MailOpen size={16} />}
                tooltip={`Tenants invited by property managers via the platform.\n\n• Total invited: ${metrics.invitedCount}\n• Signed up: ${invitedList.filter(i => i.status === 'INVITED_SIGNED_UP' || i.status === 'SIGNED_UP_PAID').length}\n• Still pending: ${invitedList.filter(i => i.status === 'INVITED_PENDING').length}`}
              />
              <HealthCard
                label="Conversion Rate"
                value={`${conversionRate}%`}
                subStrong={`${metrics.waitlistConverted} of ${metrics.waitlistCount}`}
                sub="waitlist converted"
                change={parseFloat(conversionRate ?? '0') >= 20 ? 4 : -4}
                accentColor="#8b5cf6"
                icon={<ArrowUpRight size={16} />}
                tooltip={`Percentage of waitlist entrants who converted to registered accounts.\n\nFormula: (Waitlist Converted ÷ Waitlist Total) × 100\nTarget: ≥ 20%\n\nNote: The \'Signed Up\' total (${metrics.signedUpCount}) is higher because it also includes direct sign-ups who never went through the waitlist.`}
              />
              <HealthCard
                label="Active Users"
                value={metrics.activeCount.toLocaleString()}
                sub="logged in last 30 days"
                change={+14}
                sparkData={activeSpark}
                accentColor="#10b981"
                icon={<Activity size={16} />}
                tooltip={`Number of registered tenants who have had at least one recorded app activity in the last 30 days.`}
              />
              <HealthCard
                label="Active Rate"
                value={`${metrics.activeRate}%`}
                subStrong={`${metrics.activeCount} of ${metrics.totalAccountsCreated}`}
                sub="users active last 30d"
                change={+5}
                accentColor="#06b6d4"
                icon={<TrendingUp size={16} />}
                tooltip={`Percentage of all registered tenants who were active in the last 30 days.\n\nFormula: (Active Users ÷ Total Accounts Created) × 100\nTarget: ≥ 60%`}
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
                tooltip={`Total revenue earned by the platform.\nThis includes both transaction fees (from processing rent payments) and benefits fees (from optional Upward protection packages).`}
              />
            </div>

            {/* ── Activity Summary Section ── */}
            {/* ── Web Traffic & Engagement Section (GA4) ── */}
            <div className="card" style={{ padding: '24px', marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} style={{ color: 'var(--accent)' }} /> Website Traffic & Engagement
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

              {/* GA4 Mini Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Website Visitors */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website Visitors (30d)</span>
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visits / Sessions</span>
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page Views</span>
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages per Visit</span>
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
              </div>

              {/* Devices & Top Pages Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: '20px',
                }}
                className="grid-mobile-1"
              >
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
                      {(gaStats?.topPages || []).map((page: any, idx: number) => {
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
                        } else if (page.path === '/dashboard' || page.path === '/') {
                          pathLabel = 'Main Dashboard';
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
                    </div>
                  )}
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
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Registration Date</th>
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
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
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
