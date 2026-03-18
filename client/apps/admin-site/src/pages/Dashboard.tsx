import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  MapPin,
  Mail,
  Phone,
  Globe,
  Clock,
  ChevronDown,
  Download,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Stats {
  totalWaitlist: number
  joinedLast24h: number
  distributions?: {
    roles: { label: string; count: number }[]
    countries: { label: string; count: number }[]
    cities: { label: string; count: number }[]
  }
}

interface WaitlistUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: string
  country?: string
  city?: string
  benefits?: string[]
  selectedSession?: string
  selectedsession?: string
  wantsAmbassador?: boolean
  updatedAt: string
}

interface FilterOptions {
  roles: string[]
  countries: string[]
  cities: { country: string; city: string }[]
  sessions: { id: string; name: string }[]
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
  const [allUsers, setAllUsers] = useState<WaitlistUser[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({
    show: false,
    ids: [],
  })

  const [filters, setFilters] = useState({
    search: '',
    role: 'All',
    country: 'All',
    city: 'All',
    selectedSession: 'All',
  })
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

  // Fetch Stats & Filter Options once
  useEffect(() => {
    const init = async () => {
      try {
        const [statsRes, filtersRes] = await Promise.all([
          apiService.get('/admin/analytics', token),
          apiService.get('/admin/filters', token),
        ])
        setStats(statsRes.data)
        setFilterOptions(filtersRes) // Corrected: filtersRes is already the data
      } catch (err) {
        console.error('Failed to initialize dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [token])

  // Fetch Users based on filters and page
  const fetchUsers = useCallback(
    async (isLoadMore = false) => {
      setLoadingUsers(true)
      try {
        const currentPage = isLoadMore ? page + 1 : 1
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
          ...(filters.search && { search: filters.search }),
          ...(filters.role !== 'All' && { role: filters.role }),
          ...(filters.country !== 'All' && { country: filters.country }),
          ...(filters.city !== 'All' && { city: filters.city }),
          ...(filters.selectedSession !== 'All' && { selectedSession: filters.selectedSession }),
          ...(dateBounds?.from && { createdFrom: dateBounds.from }),
          ...(dateBounds?.to && { createdTo: dateBounds.to }),
        })

        const res = await apiService.get(`/admin/users?${params.toString()}`, token)

        if (isLoadMore) {
          setAllUsers((prev) => [...prev, ...res.data])
          setPage(currentPage)
        } else {
          setAllUsers(res.data)
          setPage(1)
        }
        setMeta(res.meta)
      } catch (err) {
        console.error('Failed to fetch users', err)
      } finally {
        setLoadingUsers(false)
      }
    },
    [token, filters, page, dateBounds],
  )

  const handleExportCSV = () => {
    if (allUsers.length === 0) return

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Role',
      'Country',
      'City',
      'Session',
      'Ambassador',
      'Updated At',
    ].join(',')

    const rows = allUsers.map((user) => {
      return [
        `"${(user.firstName || '').replace(/"/g, '""')}"`,
        `"${(user.lastName || '').replace(/"/g, '""')}"`,
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.phone || '').replace(/"/g, '""')}"`,
        `"${(user.role || '').replace(/"/g, '""')}"`,
        `"${(user.country || '').replace(/"/g, '""')}"`,
        `"${(user.city || '').replace(/"/g, '""')}"`,
        `"${(user.selectedSession || user.selectedsession || '').replace(/"/g, '""')}"`,
        user.wantsAmbassador ? 'Yes' : 'No',
        new Date(user.updatedAt).toLocaleString(),
      ].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `upward_waitlist_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${allUsers.length} members to CSV`)
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
      showToast(`${ids.length} member${ids.length === 1 ? '' : 's'} deleted`)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete members', true)
    }
  }

  // Trigger search on filter change
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(timeout)
  }, [
    filters.search,
    filters.role,
    filters.country,
    filters.city,
    filters.selectedSession,
    dateRange,
    fetchUsers,
  ])

  const filteredCities = useMemo(() => {
    if (!filterOptions) return []
    if (filters.country === 'All')
      return Array.from(
        new Set(filterOptions.cities.map((c: { city: string }) => c.city)),
      ).sort() as string[]
    return filterOptions.cities
      .filter((c: { country: string }) => c.country === filters.country)
      .map((c: { city: string }) => c.city)
      .sort()
  }, [filterOptions, filters.country])

  // Reset city if country changes and city is no longer valid
  useEffect(() => {
    if (filters.city !== 'All' && !filteredCities.includes(filters.city)) {
      setFilters((prev) => ({ ...prev, city: 'All' }))
    }
  }, [filters.country, filteredCities])

  if (loading || !stats) {
    return (
      <div className="page-container">
        <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
      </div>
    )
  }

  const statItems = [
    { label: 'Total Waitlist', value: stats.totalWaitlist, icon: Users, color: '#d97757' },
    { label: 'Joined 24h', value: stats.joinedLast24h, icon: UserPlus, color: '#10b981' },
  ]

  const DistributionCard = ({
    title,
    data,
  }: {
    title: string
    data: { label: string; count: number }[]
  }) => {
    const total = data.reduce((acc, curr) => acc + curr.count, 0)
    return (
      <div className="card" style={{ flex: 1, minWidth: '300px' }}>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '20px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              No data available
            </div>
          ) : (
            data.slice(0, 6).map((item, i) => {
              const percentage = Math.round((item.count / total) * 100)
              return (
                <div key={i}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'var(--surface-hover)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                      }}
                    ></div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ marginBottom: '20px' }}>
          Admin Dashboard
        </h2>

        {/* Stats Column Grid */}
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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

        {/* Distributions Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
          className="grid-mobile-1"
        >
          <DistributionCard title="Role Distribution" data={stats.distributions?.roles || []} />
          <DistributionCard
            title="Country Distribution"
            data={stats.distributions?.countries || []}
          />
          <DistributionCard title="Top Cities" data={stats.distributions?.cities || []} />
        </div>

        {/* Filters Section */}
        <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
          {/* Date range quick-filters */}
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

          {/* Field filters */}
          <div className="filter-bar">
            <div className="filter-field search-field">
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
                  placeholder="Email or name..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            <div className="filter-field">
              <label>Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="All">All Roles</option>
                {filterOptions?.roles.map((r: string) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label>Country</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
              >
                <option value="All">All Countries</option>
                {filterOptions?.countries.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label>City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
              >
                <option value="All">All Cities</option>
                {filteredCities.map((city: string) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label>Session</label>
              <select
                value={filters.selectedSession}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, selectedSession: e.target.value }))
                }
              >
                <option value="All">All Sessions</option>
                {filterOptions?.sessions.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Waitlist Table */}
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
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Waitlist Members</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing {allUsers.length} of {meta?.total || 0} members
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
                    Location
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
                    Role & Benefits
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
                    Session
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
                    Last Edited
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
                      colSpan={6}
                      style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No members found matching your criteria.
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
                            {user.firstName ? user.firstName[0] : user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                              {user.firstName} {user.lastName}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                            }}
                          >
                            <Globe size={14} color="var(--text-muted)" /> {user.country || '—'}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                            }}
                          >
                            <MapPin size={14} color="var(--text-muted)" /> {user.city || '—'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                          {user.role || '—'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {user.benefits?.slice(0, 2).map((b: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--surface-hover)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {b}
                            </span>
                          ))}
                          {(user.benefits?.length ?? 0) > 2 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              +{(user.benefits?.length ?? 0) - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px' }}>
                          {(() => {
                            const sessionValue = user.selectedSession || user.selectedsession
                            const foundSession = filterOptions?.sessions.find(
                              (s) => s.id === sessionValue || s.name === sessionValue,
                            )
                            return foundSession?.name || sessionValue || 'Not Selected'
                          })()}
                        </div>
                        {user.wantsAmbassador && (
                          <div style={{ marginTop: '4px' }}>
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
                              Ambassador
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> {new Date(user.updatedAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {new Date(user.updatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </td>
                      {isSuperadmin && (
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => setDeleteModal({ show: true, ids: [user.id] })}
                            title="Delete member"
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
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {loadingUsers && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>
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
                onClick={() => fetchUsers(true)}
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
                {loadingUsers ? 'Loading...' : 'Show More Members'}
                {!loadingUsers && <ChevronDown size={18} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
                Delete {deleteModal.ids.length > 1 ? `${deleteModal.ids.length} members` : 'member'}
                ?
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  marginBottom: '32px',
                  lineHeight: 1.6,
                }}
              >
                This action cannot be undone. The selected waitlist{' '}
                {deleteModal.ids.length === 1 ? 'entry' : 'entries'} will be permanently removed.
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
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }
      `}</style>
    </div>
  )
}

export default Dashboard
