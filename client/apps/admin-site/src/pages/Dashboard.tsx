import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Users,
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
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Stats {
  totalWaitlist: number
  joinedLast24h: number
  totalCompleted: number
  totalIncomplete: number
  completedYesterday: number
  incompleteYesterday: number
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
    roles: [] as string[],
    countries: [] as string[],
    cities: [] as string[],
    selectedSessions: [] as string[],
    completed: 'all' as 'all' | 'true' | 'false',
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
          ...(filters.roles.length > 0 && { role: filters.roles.join(',') }),
          ...(filters.countries.length > 0 && { country: filters.countries.join(',') }),
          ...(filters.cities.length > 0 && { city: filters.cities.join(',') }),
          ...(filters.selectedSessions.length > 0 && {
            selectedSession: filters.selectedSessions.join(','),
          }),
          ...(filters.completed !== 'all' && { completed: filters.completed }),
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

  const handleEmailFiltered = async () => {
    if (!meta || meta.total === 0) return

    setLoadingUsers(true)
    try {
      // Fetch ALL IDs for the current filters by setting a high limit
      const params = new URLSearchParams({
        page: '1',
        limit: meta.total.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.roles.length > 0 && { role: filters.roles.join(',') }),
        ...(filters.countries.length > 0 && { country: filters.countries.join(',') }),
        ...(filters.cities.length > 0 && { city: filters.cities.join(',') }),
        ...(filters.selectedSessions.length > 0 && {
          selectedSession: filters.selectedSessions.join(','),
        }),
        ...(filters.completed !== 'all' && { completed: filters.completed }),
        ...(dateBounds?.from && { createdFrom: dateBounds.from }),
        ...(dateBounds?.to && { createdTo: dateBounds.to }),
      })

      const res = await apiService.get(`/admin/users?${params.toString()}`, token)
      const allFilteredIds = res.data.map((u: WaitlistUser) => u.id)

      navigate('/emails', { state: { userIds: allFilteredIds } })
    } catch (err) {
      console.error('Failed to prepare filtered emails', err)
      showToast('Failed to prepare audience list', true)
    } finally {
      setLoadingUsers(false)
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
    filters.roles,
    filters.countries,
    filters.cities,
    filters.selectedSessions,
    filters.completed,
    dateRange,
    fetchUsers,
  ])

  const filteredCities = useMemo(() => {
    if (!filterOptions) return []
    if (filters.countries.length === 0)
      return Array.from(
        new Set(filterOptions.cities.map((c: { city: string }) => c.city)),
      ).sort() as string[]
    return filterOptions.cities
      .filter((c: { country: string }) => filters.countries.includes(c.country))
      .map((c: { city: string }) => c.city)
      .sort()
  }, [filterOptions, filters.countries])

  // Remove cities from filter that are no longer valid when countries change
  useEffect(() => {
    if (filters.cities.length > 0) {
      const validCities = new Set(filteredCities)
      const stillValid = filters.cities.filter((c) => validCities.has(c))
      if (stillValid.length !== filters.cities.length) {
        setFilters((prev) => ({ ...prev, cities: stillValid }))
      }
    }
  }, [filters.countries, filteredCities])

  if (loading || !stats) {
    return (
      <div className="page-container">
        <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
      </div>
    )
  }

  const statItems = [
    { label: 'Total Waitlist', value: stats.totalWaitlist, icon: Users, color: '#d97757' },
    {
      label: 'Complete Reg.',
      value: stats.totalCompleted,
      icon: CheckCircle2,
      color: '#10b981',
    },
    {
      label: 'Incomplete Reg.',
      value: stats.totalIncomplete,
      icon: AlertTriangle,
      color: '#f59e0b',
    },
    {
      label: 'Complete (Yesterday)',
      value: stats.completedYesterday,
      icon: CalendarDays,
      color: '#3b82f6',
    },
    {
      label: 'Incomplete (Yesterday)',
      value: stats.incompleteYesterday,
      icon: Clock,
      color: '#6366f1',
    },
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

  // ---- Multi-select dropdown component ----
  const MultiSelect = ({
    label,
    options,
    selected,
    onChange,
    placeholder,
  }: {
    label: string
    options: { value: string; label: string }[]
    selected: string[]
    onChange: (vals: string[]) => void
    placeholder?: string
  }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggle = (val: string) => {
      onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
    }

    const displayText =
      selected.length === 0
        ? placeholder || 'All'
        : selected.length === 1
          ? options.find((o) => o.value === selected[0])?.label || selected[0]
          : `${selected.length} selected`

    return (
      <div className="filter-field" ref={ref} style={{ position: 'relative' }}>
        <label>{label}</label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            cursor: 'pointer',
            color: selected.length === 0 ? 'var(--text-muted)' : 'var(--text)',
            gap: '8px',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {displayText}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {selected.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </span>
            )}
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: open ? 'rotate(180deg)' : undefined,
                transition: 'transform 0.2s',
              }}
            />
          </div>
        </button>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100,
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {options.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                No options
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = selected.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: isSelected ? 'var(--accent-faint)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {isSelected ? (
                      <CheckSquare size={14} color="var(--accent)" />
                    ) : (
                      <Square size={14} color="var(--text-muted)" />
                    )}
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {opt.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  const activeFilterCount =
    filters.roles.length +
    filters.countries.length +
    filters.cities.length +
    filters.selectedSessions.length +
    (filters.completed !== 'all' ? 1 : 0)

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
            gridTemplateColumns: `repeat(${Math.ceil(statItems.length / 2)}, 1fr)`,
            gridAutoRows: '1fr',
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

          {/* Completion status filter */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--text-muted)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Completion Status
              </span>
            </div>
            <div className="date-chips">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'true' as const, label: '✓ Completed' },
                { key: 'false' as const, label: '✗ Not Completed' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${filters.completed === key ? ' active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, completed: key }))}
                  style={{
                    ...(filters.completed === key && key === 'true'
                      ? { background: '#10b98120', borderColor: '#10b981', color: '#10b981' }
                      : {}),
                    ...(filters.completed === key && key === 'false'
                      ? { background: '#ef444420', borderColor: '#ef4444', color: '#ef4444' }
                      : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Field filters */}
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
                    roles: [],
                    countries: [],
                    cities: [],
                    selectedSessions: [],
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

            <MultiSelect
              label="Role"
              placeholder="All Roles"
              options={(filterOptions?.roles || []).map((r: string) => ({ value: r, label: r }))}
              selected={filters.roles}
              onChange={(vals) => setFilters((prev) => ({ ...prev, roles: vals }))}
            />

            <MultiSelect
              label="Country"
              placeholder="All Countries"
              options={(filterOptions?.countries || []).map((c: string) => ({
                value: c,
                label: c,
              }))}
              selected={filters.countries}
              onChange={(vals) => setFilters((prev) => ({ ...prev, countries: vals }))}
            />

            <MultiSelect
              label="City"
              placeholder="All Cities"
              options={filteredCities.map((city: string) => ({ value: city, label: city }))}
              selected={filters.cities}
              onChange={(vals) => setFilters((prev) => ({ ...prev, cities: vals }))}
            />

            <MultiSelect
              label="Session"
              placeholder="All Sessions"
              options={(filterOptions?.sessions || []).map((s: { id: string; name: string }) => ({
                value: s.id,
                label: s.name,
              }))}
              selected={filters.selectedSessions}
              onChange={(vals) => setFilters((prev) => ({ ...prev, selectedSessions: vals }))}
            />
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
