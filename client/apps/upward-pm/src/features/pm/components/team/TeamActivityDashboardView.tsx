'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  History,
  Users,
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import { useTeamActivityDashboard } from '../../hooks/useTeamActivity'
import { useTeam } from '../../hooks/useTeam'
import { formatDistanceToNow, format } from 'date-fns'
import { TeamActivityLogItem } from '../../services/teamActivityService'
import '@/styles/features/team-activity.css'

interface TeamActivityDashboardViewProps {
  initialMemberUuid?: string
}

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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PAYMENTS': return <CreditCard size={15} />
      case 'PROPERTIES': return <Building2 size={15} />
      case 'DOCUMENTS': return <FileText size={15} />
      case 'TEMPLATES': return <FileCode size={15} />
      case 'TENANTS': return <UserPlus size={15} />
      default: return <Activity size={15} />
    }
  }

  const getActionBadgeColor = (cat: string) => {
    switch (cat) {
      case 'PAYMENTS': return { bg: 'var(--forest-faint)', color: 'var(--forest)', border: 'var(--forest-glow)' }
      case 'PROPERTIES': return { bg: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.2)' }
      case 'DOCUMENTS': return { bg: 'var(--clay-faint)', color: 'var(--clay)', border: 'var(--clay-glow)' }
      case 'TEMPLATES': return { bg: 'rgba(147, 51, 234, 0.08)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.2)' }
      case 'TENANTS': return { bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: 'rgba(16, 185, 129, 0.2)' }
      default: return { bg: 'var(--bg)', color: 'var(--text-secondary)', border: 'var(--border)' }
    }
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

  const metrics = data?.metrics || {
    totalActions: 0,
    totalAllTime: 0,
    todayActions: 0,
    activeMembersCount: 0,
    totalTeamMembers: 0,
  }

  const categoryCounts = data?.categoryCounts || {
    PAYMENTS: 0,
    PROPERTIES: 0,
    DOCUMENTS: 0,
    TEMPLATES: 0,
    TENANTS: 0,
    OTHER: 0,
  }

  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryCounts)
    if (entries.length === 0) return 'None'
    entries.sort((a, b) => b[1] - a[1])
    return entries[0] && entries[0][1] > 0 ? entries[0][0] : 'None'
  }, [categoryCounts])

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1)

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
            <span>Activity Dashboard</span>
          </div>
          <h1 className="team-activity__title">Team Activity & Audit Reports</h1>
          <p className="team-activity__subtitle">
            Comprehensive audit logs and operational analytics for actions performed across your property portfolio.
          </p>
        </div>

        <div className="team-activity__actions">
          <button
            className="btn btn--secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            className="btn btn--secondary"
            onClick={handleExportCSV}
            disabled={!data?.logs || data.logs.length === 0}
            style={{ borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="team-activity__metrics">
        <div className="team-activity__metric-card">
          <div className="team-activity__metric-top">
            <span className="team-activity__metric-label">Total Actions Logged</span>
            <div className="team-activity__metric-icon team-activity__metric-icon--forest">
              <Activity size={18} />
            </div>
          </div>
          <div className="team-activity__metric-value">
            {isLoading ? '...' : metrics.totalActions.toLocaleString()}
          </div>
          <div className="team-activity__metric-subtext">
            <span>{timeRange === 'today' ? 'Today' : `In selected range (${timeRange})`}</span>
          </div>
        </div>

        <div className="team-activity__metric-card">
          <div className="team-activity__metric-top">
            <span className="team-activity__metric-label">Today's Volume</span>
            <div className="team-activity__metric-icon team-activity__metric-icon--clay">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="team-activity__metric-value">
            {isLoading ? '...' : metrics.todayActions.toLocaleString()}
          </div>
          <div className="team-activity__metric-subtext">
            <span>New actions recorded since midnight</span>
          </div>
        </div>

        <div className="team-activity__metric-card">
          <div className="team-activity__metric-top">
            <span className="team-activity__metric-label">Active Team Members</span>
            <div className="team-activity__metric-icon team-activity__metric-icon--blue">
              <Users size={18} />
            </div>
          </div>
          <div className="team-activity__metric-value">
            {isLoading ? '...' : `${metrics.activeMembersCount} / ${metrics.totalTeamMembers}`}
          </div>
          <div className="team-activity__metric-subtext">
            <span>Members active in this period</span>
          </div>
        </div>

        <div className="team-activity__metric-card">
          <div className="team-activity__metric-top">
            <span className="team-activity__metric-label">Top Category</span>
            <div className="team-activity__metric-icon">
              <Layers size={18} />
            </div>
          </div>
          <div className="team-activity__metric-value" style={{ fontSize: 22, textTransform: 'capitalize' }}>
            {isLoading ? '...' : topCategory.toLowerCase()}
          </div>
          <div className="team-activity__metric-subtext">
            <span>Highest volume operational sector</span>
          </div>
        </div>
      </div>

      {/* Overview Analytics & Trends Section */}
      <div className="team-activity__overview-grid">
        {/* Category Breakdown */}
        <div className="team-activity__panel">
          <div className="team-activity__panel-header">
            <h3 className="team-activity__panel-title">
              <BarChart3 size={18} color="var(--forest)" /> Action Breakdown by Category
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 30 Days</span>
          </div>

          <div className="team-activity__category-list">
            {[
              { key: 'PAYMENTS', label: 'Rent Invoicing & Payments', count: categoryCounts.PAYMENTS, color: 'var(--forest)' },
              { key: 'PROPERTIES', label: 'Properties & Units Management', count: categoryCounts.PROPERTIES, color: '#2563eb' },
              { key: 'DOCUMENTS', label: 'Documents & Delivery', count: categoryCounts.DOCUMENTS, color: 'var(--clay)' },
              { key: 'TEMPLATES', label: 'Document Templates (Created/Edited)', count: categoryCounts.TEMPLATES, color: '#9333ea' },
              { key: 'TENANTS', label: 'Tenant Onboarding & Invites', count: categoryCounts.TENANTS, color: '#059669' },
            ].map((cat) => {
              const pct = Math.round((cat.count / maxCategoryCount) * 100)
              return (
                <div key={cat.key} className="team-activity__category-row">
                  <div className="team-activity__category-meta">
                    <span className="team-activity__category-label">
                      {getCategoryIcon(cat.key)} {cat.label}
                    </span>
                    <span className="team-activity__category-count">{cat.count} actions</span>
                  </div>
                  <div className="team-activity__progress-bar">
                    <div
                      className="team-activity__progress-fill"
                      style={{ width: `${pct}%`, background: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Member Leaderboard */}
        <div className="team-activity__panel">
          <div className="team-activity__panel-header">
            <h3 className="team-activity__panel-title">
              <Users size={18} color="var(--clay)" /> Team Members
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {data?.membersSummary?.length || 0} Members
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 240, overflowY: 'auto' }}>
            {(!data?.membersSummary || data.membersSummary.length === 0) ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No team members invited yet.
              </div>
            ) : (
              data.membersSummary.map((m) => (
                <div
                  key={m.uuid}
                  onClick={() => setMemberUuid(memberUuid === m.uuid ? '' : m.uuid)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: memberUuid === m.uuid ? 'var(--bg)' : 'transparent',
                    border: memberUuid === m.uuid ? '1px solid var(--border-strong)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'var(--dark)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {m.name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {m.jobTitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)' }}>
                      {m.actionsCount} actions
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {m.lastActiveAt ? formatDistanceToNow(new Date(m.lastActiveAt), { addSuffix: true }) : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="team-activity__filter-bar">
        <div className="team-activity__filter-row">
          <div className="team-activity__search-box">
            <Search size={16} className="team-activity__search-icon" />
            <input
              type="text"
              placeholder="Search actions, property names, invoices, or templates..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="team-activity__search-input"
            />
          </div>

          <select
            value={memberUuid}
            onChange={(e) => {
              setMemberUuid(e.target.value)
              setPage(1)
            }}
            className="team-activity__member-select"
          >
            <option value="">All Team Members</option>
            {team.map((collab: any) => (
              <option key={collab.member.uuid} value={collab.member.uuid}>
                {collab.member.firstName ? `${collab.member.firstName} ${collab.member.lastName}` : collab.member.email}
              </option>
            ))}
          </select>

          <div className="team-activity__time-pills">
            {(['today', '7d', '30d', '90d', 'all'] as const).map((t) => (
              <button
                key={t}
                className={`team-activity__time-pill ${timeRange === t ? 'team-activity__time-pill--active' : ''}`}
                onClick={() => {
                  setTimeRange(t)
                  setPage(1)
                }}
              >
                {t === 'today' ? 'Today' : t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="team-activity__category-pills">
          {[
            { key: 'ALL', label: 'All Categories' },
            { key: 'PAYMENTS', label: 'Payments & Invoices' },
            { key: 'PROPERTIES', label: 'Properties & Units' },
            { key: 'DOCUMENTS', label: 'Documents & Reports' },
            { key: 'TEMPLATES', label: 'Document Templates' },
            { key: 'TENANTS', label: 'Tenants' },
          ].map((cat) => (
            <button
              key={cat.key}
              className={`team-activity__cat-pill ${category === cat.key ? 'team-activity__cat-pill--active' : ''}`}
              onClick={() => {
                setCategory(cat.key)
                setPage(1)
              }}
            >
              {cat.key !== 'ALL' && getCategoryIcon(cat.key)}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Logs Timeline / Table */}
      <div className="team-activity__feed-container">
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading team activity records...</p>
          </div>
        ) : (!data?.logs || data.logs.length === 0) ? (
          <div className="team-activity__empty-state">
            <div style={{ color: 'var(--text-muted)', opacity: 0.25, marginBottom: 8 }}>
              <History size={56} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--dark)' }}>No actions recorded</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 360, margin: 0 }}>
              {search || memberUuid || category !== 'ALL'
                ? 'No activities match the current filter criteria. Try resetting filters.'
                : 'When team members perform operations on properties, invoices, and documents, they will appear here.'}
            </p>
          </div>
        ) : (
          <div>
            {data.logs.map((log: TeamActivityLogItem) => {
              const badgeStyle = getActionBadgeColor(log.category)
              const isExpanded = !!expandedLogs[log.uuid]

              return (
                <div key={log.uuid} className="team-activity__log-item">
                  <div className="team-activity__performer-avatar">
                    {log.performer?.name?.charAt(0) || 'U'}
                  </div>

                  <div className="team-activity__log-content">
                    <div className="team-activity__log-header">
                      <div className="team-activity__log-title-row">
                        <span className="team-activity__performer-name">
                          {log.performer?.name || 'Team Member'}
                        </span>
                        <span className={`team-activity__role-badge ${log.performer?.role === 'ADMIN' ? 'team-activity__role-badge--admin' : 'team-activity__role-badge--employee'}`}>
                          {log.performer?.role || 'EMPLOYEE'}
                        </span>
                        <span
                          className="team-activity__cat-tag"
                          style={{ background: badgeStyle.bg, color: badgeStyle.color, borderColor: badgeStyle.border }}
                        >
                          {log.category}
                        </span>
                      </div>

                      <span className="team-activity__time" title={format(new Date(log.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="team-activity__description">
                      {log.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="team-activity__meta-badge">
                        Target: {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                      </span>

                      {log.metadata && (
                        <button
                          type="button"
                          className="team-activity__metadata-toggle"
                          onClick={() => toggleExpand(log.uuid)}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isExpanded ? 'Hide Payload' : 'View Details'}
                        </button>
                      )}
                    </div>

                    {isExpanded && log.metadata && (
                      <div className="team-activity__metadata-box">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination Controls */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="team-activity__pagination">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing {(page - 1) * data.pagination.limit + 1} - {Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} actions
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="team-activity__page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>
                    Page {page} of {data.pagination.totalPages}
                  </span>

                  <button
                    className="team-activity__page-btn"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={14} />
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
