import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  Search,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  Download,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  CalendarDays,
  Filter,
  X,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { formatName } from '@upward/common-utils'

interface Stats {
  totalUsers: number
  joinedLast24h: number
  convertedCount: number
  joinedFromInviteCount: number
  selfSignupCount: number
  launchEmailsSent: number
  launchEmailsFailed: number
  conversionRate: number
}

interface User {
  id: string
  uuid: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  isFromWaitlist: boolean
  isFromInvite: boolean
  unsubscribed: boolean
  updatedAt: string
  createdAt: string
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface DashboardProps {
  token: string
  adminRole?: string
}

const Dashboard: React.FC<DashboardProps> = ({ token, adminRole }) => {
  const isSuperadmin = adminRole === 'SUPERADMIN'
  const [stats, setStats] = useState<Stats | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({
    show: false,
    ids: [],
  })

  const [filters, setFilters] = useState({
    search: '',
    isWaitlist: 'all' as 'all' | 'true' | 'false',
    isInvited: 'all' as 'all' | 'true' | 'false',
    unsubscribed: 'all' as 'all' | 'true' | 'false',
  })
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | '2days' | '1week'>(
    'all',
  )
  const [page, setPage] = useState(1)

  // Compute date bounds from dateRange
  const dateBounds = useMemo(() => {
    const now = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const endOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    if (dateRange === 'today') {
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
    }
    if (dateRange === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() }
    }
    if (dateRange === '2days') {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() }
    }
    if (dateRange === '1week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() }
    }
    return null
  }, [dateRange])

  // Fetch Stats
  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
        ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
        ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
        ...(dateBounds?.from && { createdFrom: dateBounds.from }),
        ...(dateBounds?.to && { createdTo: dateBounds.to }),
      })
      const statsRes = await apiService.get(`/admin/analytics?${params.toString()}`, token)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    }
  }, [token, filters, dateBounds])

  // Fetch Users based on filters and page
  const fetchUsers = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      setLoadingUsers(true)
      try {
        const params = new URLSearchParams({
          page: pageToFetch.toString(),
          limit: '20',
          ...(filters.search && { search: filters.search }),
          ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
          ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
          ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
          ...(dateBounds?.from && { createdFrom: dateBounds.from }),
          ...(dateBounds?.to && { createdTo: dateBounds.to }),
        })

        const res = await apiService.get(`/admin/users?${params.toString()}`, token)

        if (isLoadMore) {
          setAllUsers((prev) => [...prev, ...res.data])
        } else {
          setAllUsers(res.data)
        }
        setPage(pageToFetch)
        setMeta(res.meta)
      } catch (err) {
        console.error('Failed to fetch users', err)
      } finally {
        setLoadingUsers(false)
        setLoading(false)
      }
    },
    [token, filters, dateBounds],
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAnalytics()
    }, 500)
    return () => clearTimeout(timeout)
  }, [fetchAnalytics])

  // Trigger search on filter change
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(1, false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [
    filters.search,
    filters.isWaitlist,
    filters.isInvited,
    filters.unsubscribed,
    dateRange,
    fetchUsers,
  ])

  const handleExportCSV = async () => {
    if (allUsers.length === 0) return

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'From Waitlist',
      'From Invite',
      'Unsubscribed',
      'Updated At',
    ].join(',')

    const rows = allUsers.map((user) => {
      return [
        `"${formatName(user.firstName || '').replace(/"/g, '""')}"`,
        `"${formatName(user.lastName || '').replace(/"/g, '""')}"`,
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.phone || '').replace(/"/g, '""')}"`,
        user.isFromWaitlist ? 'Yes' : 'No',
        user.isFromInvite ? 'Yes' : 'No',
        user.unsubscribed ? 'Yes' : 'No',
        new Date(user.updatedAt).toLocaleString(),
      ].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')

    // Log export event
    try {
      await apiService.post(
        '/admin/logs/event',
        {
          action: 'EXPORT_CSV',
          details: `Exported ${allUsers.length} users to CSV`,
        },
        token,
      )
    } catch (err) {
      console.error('Failed to log export event:', err)
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `upward_users_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${allUsers.length} users to CSV`)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === allUsers.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(allUsers.map((u) => u.id)))
  }

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await apiService.post('/admin/users/batch-delete', { ids }, token)
      setAllUsers((prev) => prev.filter((u) => !ids.includes(u.id)))
      setSelectedIds(new Set())
      setDeleteModal({ show: false, ids: [] })
      showToast(`${ids.length} user${ids.length === 1 ? '' : 's'} deleted`)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete users', true)
    }
  }

  const handleEmailFiltered = async () => {
    if (!meta || meta.total === 0) return

    setLoadingUsers(true)
    try {
      // Fetch ALL IDs for the current filters by setting a high limit
      const params = new URLSearchParams({
        page: '1',
        limit: meta.total.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
        ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
        ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
        ...(dateBounds?.from && { createdFrom: dateBounds.from }),
        ...(dateBounds?.to && { createdTo: dateBounds.to }),
      })

      const res = await apiService.get(`/admin/users?${params.toString()}`, token)
      const allFilteredIds = res.data.map((u: User) => u.id)

      navigate('/emails', { state: { userIds: allFilteredIds } })
    } catch (err) {
      console.error('Failed to prepare filtered emails', err)
      showToast('Failed to prepare audience list', true)
    } finally {
      setLoadingUsers(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="page-container">
        <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
      </div>
    )
  }

  const statItems = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#d97757' },
    {
      label: 'Joined from Waitlist',
      value: stats.convertedCount,
      icon: CheckCircle2,
      color: '#10b981',
    },
    {
      label: 'Joined from Invitation',
      value: stats.joinedFromInviteCount,
      icon: UserPlus,
      color: '#a855f7',
    },
    {
      label: 'Self Sign-ups',
      value: stats.selfSignupCount,
      icon: Users,
      color: '#ec4899',
    },
    {
      label: 'Launch Emails Sent',
      value: stats.launchEmailsSent,
      icon: Mail,
      color: '#6366f1',
    },
    {
      label: 'Launch Emails Failed',
      value: stats.launchEmailsFailed,
      icon: AlertTriangle,
      color: '#f59e0b',
    },
  ]

  const activeFilterCount =
    (filters.isWaitlist !== 'all' ? 1 : 0) +
    (filters.isInvited !== 'all' ? 1 : 0) +
    (filters.unsubscribed !== 'all' ? 1 : 0)

  return (
    <div className="page-container fade-in" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ marginBottom: '20px' }}>
          Admin Dashboard
        </h2>

        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          {statItems.map((stat, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '24px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: `${stat.color}10`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                <stat.icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Sign-up Period
              </span>
            </div>
            <div className="date-chips">
              {(
                [
                  { key: 'all', label: 'All Time' },
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: '2days', label: 'Last 2 Days' },
                  { key: '1week', label: 'Last 7 Days' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${dateRange === key ? ' active' : ''}`}
                  onClick={() => setDateRange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <Users size={16} style={{ color: 'var(--text-muted)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Waitlist Status
              </span>
            </div>
            <div className="date-chips">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'true' as const, label: 'From Waitlist' },
                { key: 'false' as const, label: 'Self Signed-up' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${filters.isWaitlist === key ? ' active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, isWaitlist: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <UserPlus size={16} style={{ color: 'var(--text-muted)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Invitation Status
              </span>
            </div>
            <div className="date-chips">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'true' as const, label: 'From Invite' },
                { key: 'false' as const, label: 'Not Invited' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${filters.isInvited === key ? ' active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, isInvited: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <Mail size={16} style={{ color: 'var(--text-muted)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Subscription Status
              </span>
            </div>
            <div className="date-chips">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'true' as const, label: 'Unsubscribed' },
                { key: 'false' as const, label: 'Subscribed' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${filters.unsubscribed === key ? ' active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, unsubscribed: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                flex: 1,
              }}
            >
              Filters
              {activeFilterCount > 0 && (
                <span
                  style={{
                    marginLeft: '8px',
                    background: 'var(--accent)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    isWaitlist: 'all',
                    isInvited: 'all',
                    unsubscribed: 'all',
                  }))
                }
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
          <div className="filter-bar">
            <div className="filter-field search-field" style={{ flex: 1 }}>
              <label>Search</label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Email, name or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Users List</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing {allUsers.length} of {meta?.total || 0} users
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {isSuperadmin && selectedIds.size > 0 && (
                <button
                  onClick={() => setDeleteModal({ show: true, ids: Array.from(selectedIds) })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={16} /> Delete Selected ({selectedIds.size})
                </button>
              )}
              {meta && meta.total > 0 && (
                <button
                  onClick={handleEmailFiltered}
                  disabled={loadingUsers}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    transition: 'all 0.2s',
                    cursor: loadingUsers ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <Mail size={16} style={{ color: 'var(--accent)' }} />
                  Email Filtered ({meta.total})
                </button>
              )}
              <button
                onClick={handleExportCSV}
                disabled={allUsers.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: allUsers.length === 0 ? 0.5 : 1,
                  cursor: allUsers.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {isSuperadmin && (
                    <th style={{ padding: '16px 8px 16px 24px', width: '40px' }}>
                      <button
                        onClick={toggleSelectAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {selectedIds.size === allUsers.length && allUsers.length > 0 ? (
                          <CheckSquare size={18} color="var(--accent)" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                  )}
                  <th
                    style={{
                      padding: isSuperadmin ? '16px 16px 16px 8px' : '16px 24px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Member
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Contact
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Origin
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Subscription
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Joined Date
                  </th>
                  {isSuperadmin && (
                    <th
                      style={{
                        padding: '16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        width: '60px',
                      }}
                    />
                  )}
                </tr>
              </thead>
              <tbody>
                {allUsers.length === 0 && !loadingUsers ? (
                  <tr>
                    <td
                      colSpan={isSuperadmin ? 7 : 5}
                      style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  allUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        verticalAlign: 'top',
                        backgroundColor: selectedIds.has(user.id)
                          ? 'var(--accent-faint)'
                          : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {isSuperadmin && (
                        <td style={{ padding: '16px 8px 16px 24px', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => toggleSelect(user.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {selectedIds.has(user.id) ? (
                              <CheckSquare size={18} color="var(--accent)" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                      )}
                      <td style={{ padding: isSuperadmin ? '16px 16px 16px 8px' : '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              background: 'var(--surface-hover)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              flexShrink: 0,
                            }}
                          >
                            {user.firstName
                              ? formatName(user.firstName)[0]
                              : user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                              {formatName(user.firstName || '')} {formatName(user.lastName || '')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                            }}
                          >
                            <Mail size={14} color="var(--text-muted)" /> {user.email}
                          </div>
                          {user.phone && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                              }}
                            >
                              <Phone size={14} color="var(--text-muted)" /> {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {user.isFromWaitlist && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontWeight: 700,
                              }}
                            >
                              Waitlist
                            </span>
                          )}
                          {user.isFromInvite && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#f3e8ff',
                                color: '#6b21a8',
                                fontWeight: 700,
                              }}
                            >
                              Invitation
                            </span>
                          )}
                          {!user.isFromWaitlist && !user.isFromInvite && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 700,
                              }}
                            >
                              Self Sign-up
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {user.unsubscribed ? (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                            }}
                          >
                            Unsubscribed
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                            }}
                          >
                            Subscribed
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {new Date(user.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </td>
                      {isSuperadmin && (
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => setDeleteModal({ show: true, ids: [user.id] })}
                              title="Delete user"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '6px',
                                transition: 'color 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = 'var(--text-muted)')
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {loadingUsers && (
                  <tr>
                    <td
                      colSpan={isSuperadmin ? 7 : 5}
                      style={{ padding: '24px', textAlign: 'center' }}
                    >
                      <div
                        className="loader"
                        style={{
                          margin: '0 auto',
                          border: '3px solid var(--border)',
                          borderTop: '3px solid var(--accent)',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          animation: 'spin 1s linear infinite',
                        }}
                      ></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.page < meta.totalPages && (
            <div
              style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => fetchUsers(page + 1, true)}
                disabled={loadingUsers}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loadingUsers ? 'Loading...' : 'Show More Users'}
                {!loadingUsers && <ChevronDown size={18} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteModal.show && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'center' }}
          onClick={() => setDeleteModal({ show: false, ids: [] })}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Delete {deleteModal.ids.length > 1 ? `${deleteModal.ids.length} users` : 'user'}?
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  marginBottom: '32px',
                  lineHeight: 1.6,
                }}
              >
                This action cannot be undone. The selected user{' '}
                {deleteModal.ids.length === 1 ? 'record' : 'records'} will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setDeleteModal({ show: false, ids: [] })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBatchDelete(deleteModal.ids)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: '#dc2626',
                    color: 'white',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default Dashboard
