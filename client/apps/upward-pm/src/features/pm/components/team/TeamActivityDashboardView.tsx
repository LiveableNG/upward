'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  CreditCard,
  Building2,
  FileText,
  FileCode,
  UserPlus,
  RefreshCw,
  ChevronDown,
  Activity,
} from 'lucide-react'
import { useTeamActivityDashboard } from '../../hooks/useTeamActivity'
import { useTeam } from '../../hooks/useTeam'
import { FormSelect, SelectOption } from '@/components/ui/Select/FormSelect'
import { formatDistanceToNow, format } from 'date-fns'
import { TeamActivityLogItem } from '../../services/teamActivityService'
import '@/styles/features/team-activity.css'

interface TeamActivityDashboardViewProps {
  initialMemberUuid?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; soft: string }> = {
  PAYMENTS: { label: 'Payments & Invoices', icon: CreditCard, color: 'var(--forest)', soft: 'var(--forest-faint)' },
  PROPERTIES: { label: 'Properties & Units', icon: Building2, color: '#3E5C8C', soft: 'rgba(62, 92, 140, 0.08)' },
  DOCUMENTS: { label: 'Documents & Delivery', icon: FileText, color: 'var(--clay)', soft: 'var(--clay-faint)' },
  TEMPLATES: { label: 'Document Templates', icon: FileCode, color: '#8A8477', soft: 'rgba(138, 132, 119, 0.1)' },
  TENANTS: { label: 'Tenant Onboarding', icon: UserPlus, color: '#059669', soft: 'rgba(5, 150, 105, 0.08)' },
}

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: 'all', label: 'All Time' },
] as const

export function TeamActivityDashboardView({ initialMemberUuid }: TeamActivityDashboardViewProps) {
  const [memberUuid, setMemberUuid] = useState<string>(initialMemberUuid || '')
  const [category, setCategory] = useState<string>('ALL')
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d')
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const { data: team = [] } = useTeam()

  const queryParams = useMemo(() => ({
    memberUuid: memberUuid || undefined,
    category: category !== 'ALL' ? category : undefined,
    timeRange,
    search: search.trim() || undefined,
    page,
    limit: 20,
  }), [memberUuid, category, timeRange, search, page])

  const { data, isLoading, isFetching, refetch } = useTeamActivityDashboard(queryParams)

  const toggleExpand = (logUuid: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logUuid]: !prev[logUuid],
    }))
  }

  const memberOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ label: 'All team members', value: '' }]
    if (data?.membersSummary && data.membersSummary.length > 0) {
      data.membersSummary.forEach((m) => {
        opts.push({
          label: m.actionsCount > 0 ? `${m.name} (${m.actionsCount} actions)` : m.name,
          shortLabel: m.name,
          value: m.uuid,
        })
      })
    } else if (team && team.length > 0) {
      team.forEach((collab: any) => {
        const name = collab.member?.firstName
          ? `${collab.member.firstName} ${collab.member.lastName}`.trim()
          : collab.member?.email || 'Team Member'
        opts.push({
          label: name,
          value: collab.member?.uuid || '',
        })
      })
    }
    return opts
  }, [data?.membersSummary, team])

  const getLogDetails = (log: TeamActivityLogItem): Array<[string, string]> => {
    if (!log.metadata) return []
    const SENSITIVE_KEYS = new Set([
      'sentUuid',
      'tenantUuid',
      'unitUuid',
      'propertyUuid',
      'userUuid',
      'userId',
      'pmId',
      'ownerPmId',
      'employeeId',
      'passwordHash',
      'emailHash',
      'phoneHash',
      'emailEncrypted',
      'phoneEncrypted',
      'templateId',
    ])

    const formatKeyName = (k: string): string => {
      return k
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
    }

    const details: Array<[string, string]> = []

    Object.entries(log.metadata).forEach(([key, val]) => {
      if (SENSITIVE_KEYS.has(key) || val === undefined || val === null || val === '') return

      if (key === 'unitDetails' && typeof val === 'object' && !Array.isArray(val)) {
        const u = val as Record<string, any>
        const location = [u.address, u.area, u.state, u.country].filter(Boolean).join(', ')
        if (location) details.push(['Location', location])
        if (u.rentAmount) {
          const amountStr = `₦${Number(u.rentAmount).toLocaleString()}${u.rentType ? ` (${u.rentType})` : ''}`
          details.push(['Rent', amountStr])
        }
        if (u.initialAmountPaid) {
          details.push(['Initial Paid', `₦${Number(u.initialAmountPaid).toLocaleString()}`])
        }
        if (u.tenancyStatus) {
          details.push(['Tenancy Status', formatKeyName(u.tenancyStatus)])
        }
        if (u.rentStartDate && u.rentEndDate) {
          details.push(['Period', `${u.rentStartDate} → ${u.rentEndDate}`])
        }
        return
      }

      if (typeof val === 'object' && !Array.isArray(val)) {
        Object.entries(val).forEach(([subKey, subVal]) => {
          if (!SENSITIVE_KEYS.has(subKey) && subVal !== undefined && subVal !== null && subVal !== '') {
            details.push([formatKeyName(subKey), String(subVal)])
          }
        })
        return
      }

      if (Array.isArray(val)) {
        details.push([formatKeyName(key), `${val.length} items`])
        return
      }

      if (typeof val === 'boolean') {
        details.push([formatKeyName(key), val ? 'Yes' : 'No'])
        return
      }

      details.push([formatKeyName(key), String(val)])
    })

    return details
  }

  const handleExportCSV = () => {
    if (!data?.logs || data.logs.length === 0) return

    const headers = ['Timestamp', 'Performer Name', 'Performer Role', 'Category', 'Action', 'Description', 'Entity Type', 'Entity ID']
    const rows = data.logs.map((log) => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      `"${log.performer?.name || 'Unknown'}"`,
      log.performer?.role || 'EMPLOYEE',
      log.category,
      log.action,
      `"${log.description.replace(/"/g, '""')}"`,
      log.entityType,
      log.entityId || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `team-activity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="team-activity animate-fade-in">
      {/* Header Section */}
      <div className="team-activity__header">
        <div className="team-activity__title-group">
          <div className="team-activity__breadcrumbs">
            <Link href="/settings">Settings</Link>
            <span>/</span>
            <Link href="/settings?tab=team">Team</Link>
            <span>/</span>
            <span style={{ color: 'var(--dark)' }}>Activity Dashboard</span>
          </div>
          <h1 className="team-activity__title">Team activity &amp; audit reports</h1>
          <p className="team-activity__subtitle">
            Audit logs and operational activity across your property portfolio.
          </p>
        </div>

        <div className="team-activity__actions">
          <button
            className="team-activity__btn"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            className="team-activity__btn team-activity__btn--primary"
            onClick={handleExportCSV}
            disabled={!data?.logs || data.logs.length === 0}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Member FormSelect & Time Range */}
      <div className="team-activity__toolbar">
        <div className="team-activity__toolbar-row">
          <div className="team-activity__search-wrap">
            <Search size={14} className="team-activity__search-icon" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search actions, properties, invoices..."
              className="team-activity__search-input"
            />
          </div>

          <div className="team-activity__member-select-wrap">
            <FormSelect
              value={memberUuid}
              onChange={(val) => {
                setMemberUuid(val)
                setPage(1)
              }}
              options={memberOptions}
              placeholder="All team members"
              triggerStyle={{ height: 40, borderRadius: 8, fontSize: 13, background: 'var(--bg)' }}
              portalOnDesktop
            />
          </div>

          <div className="team-activity__range-group">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setTimeRange(r.id)
                  setPage(1)
                }}
                className={`team-activity__range-btn ${timeRange === r.id ? 'team-activity__range-btn--active' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="team-activity__category-bar">
          <button
            onClick={() => {
              setCategory('ALL')
              setPage(1)
            }}
            className={`team-activity__category-chip ${category === 'ALL' ? 'team-activity__category-chip--active' : ''}`}
          >
            All categories
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, meta]) => {
            const Icon = meta.icon
            return (
              <button
                key={key}
                onClick={() => {
                  setCategory(key)
                  setPage(1)
                }}
                className={`team-activity__category-chip ${category === key ? 'team-activity__category-chip--active' : ''}`}
              >
                <Icon size={12} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Full-Width Activity Logs Table Card */}
      <div className="team-activity__table-card">
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: 13.5 }}>Loading activity logs...</p>
          </div>
        ) : (!data?.logs || data.logs.length === 0) ? (
          <div className="team-activity__empty-state">
            <div style={{ color: 'var(--text-muted)', opacity: 0.25, marginBottom: 8 }}>
              <History size={48} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--dark)' }}>No actions recorded</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: 0 }}>
              {search || memberUuid || category !== 'ALL'
                ? 'No activities match the current filter criteria. Try resetting filters.'
                : 'When team members perform operations on properties, invoices, and documents, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="team-activity__table-scroll">
            <table className="team-activity__table">
              <thead>
                <tr>
                  <th className="team-activity__th" style={{ width: 36 }}></th>
                  <th className="team-activity__th" style={{ width: 220 }}>Member</th>
                  <th className="team-activity__th" style={{ width: 180 }}>Category</th>
                  <th className="team-activity__th">Action</th>
                  <th className="team-activity__th" style={{ width: 180 }}>Target</th>
                  <th className="team-activity__th" style={{ width: 140, textAlign: 'right' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log: TeamActivityLogItem) => {
                  const meta = CATEGORY_CONFIG[log.category] || {
                    label: log.category,
                    icon: Activity,
                    color: 'var(--text-secondary)',
                    soft: 'var(--bg)',
                  }
                  const Icon = meta.icon
                  const isOpen = !!expandedLogs[log.uuid]
                  const details = getLogDetails(log)
                  const hasDetails = details.length > 0 || log.description.length > 60
                  const targetDisplay = log.entityType + (log.entityId ? ` #${log.entityId.slice(0, 8)}` : '')

                  return (
                    <React.Fragment key={log.uuid}>
                      <tr
                        onClick={() => toggleExpand(log.uuid)}
                        className={`team-activity__tr ${hasDetails ? 'team-activity__tr--clickable' : ''}`}
                      >
                        <td className="team-activity__td" style={{ width: 36, paddingLeft: 16, paddingRight: 4 }}>
                          {hasDetails && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(log.uuid)
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                padding: 0,
                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s ease',
                              }}
                            >
                              <ChevronDown size={14} />
                            </button>
                          )}
                        </td>

                        <td className="team-activity__td">
                          <div className="team-activity__performer-cell">
                            <div className="team-activity__avatar">
                              {log.performer?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="team-activity__performer-name">
                                {log.performer?.name || 'Team Member'}
                              </div>
                              <div className="team-activity__performer-role">
                                {log.performer?.role || 'EMPLOYEE'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="team-activity__td">
                          <span
                            className="team-activity__category-badge"
                            style={{ backgroundColor: meta.soft, color: meta.color }}
                          >
                            <Icon size={11} />
                            {meta.label}
                          </span>
                        </td>

                        <td className="team-activity__td">
                          <div className="team-activity__action-text" title={log.description}>
                            {log.description}
                          </div>
                        </td>

                        <td className="team-activity__td">
                          <span className="team-activity__target-code">
                            {targetDisplay}
                          </span>
                        </td>

                        <td className="team-activity__td team-activity__time-cell" title={format(new Date(log.createdAt), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="team-activity__expanded-tr">
                          <td></td>
                          <td colSpan={5} className="team-activity__expanded-cell">
                            <div className="team-activity__expanded-desc">
                              {log.description}
                            </div>
                            {details.length > 0 && (
                              <div className="team-activity__details-grid">
                                {details.map(([label, val]) => (
                                  <div key={label} className="team-activity__detail-item">
                                    <div className="team-activity__detail-key">{label}</div>
                                    <div className="team-activity__detail-val">{val}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="team-activity__pagination-bar">
                <span className="team-activity__pagination-info">
                  Showing {(page - 1) * data.pagination.limit + 1} - {Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} actions
                </span>

                <div className="team-activity__pagination-actions">
                  <button
                    className="team-activity__btn"
                    style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>
                    Page {page} of {data.pagination.totalPages}
                  </span>

                  <button
                    className="team-activity__btn"
                    style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
