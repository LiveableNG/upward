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
} from 'lucide-react'
import { apiService } from '../services/api.service'

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
}

const Dashboard: React.FC<DashboardProps> = ({ token }) => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [allUsers, setAllUsers] = useState<WaitlistUser[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    role: 'All',
    country: 'All',
    city: 'All',
    selectedSession: 'All',
  })
  const [page, setPage] = useState(1)

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
    [token, filters, page],
  )

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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          {statItems.map((stat, idx) => (
            <div
              key={idx}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
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
              <div>
                <div className="section-label" style={{ marginBottom: '4px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Distributions Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <DistributionCard title="Role Distribution" data={stats.distributions?.roles || []} />
          <DistributionCard
            title="Country Distribution"
            data={stats.distributions?.countries || []}
          />
          <DistributionCard title="Top Cities" data={stats.distributions?.cities || []} />
        </div>

        {/* Filters Section */}
        <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Search Users
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Email or Name..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  appearance: 'none',
                  background: 'var(--white)',
                }}
              >
                <option value="All">All Roles</option>
                {filterOptions?.roles.map((r: string) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  appearance: 'none',
                  background: 'var(--white)',
                }}
              >
                <option value="All">All Countries</option>
                {filterOptions?.countries.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                City
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  appearance: 'none',
                  background: 'var(--white)',
                }}
              >
                <option value="All">All Cities</option>
                {filteredCities.map((city: string) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Session
              </label>
              <select
                value={filters.selectedSession}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, selectedSession: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  appearance: 'none',
                  background: 'var(--white)',
                }}
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
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Waitlist Members</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {allUsers.length} of {meta?.total || 0} members
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <th
                    style={{
                      padding: '16px 24px',
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
                    Last Active
                  </th>
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
                      style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}
                    >
                      <td style={{ padding: '16px 24px' }}>
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
                            }}
                          >
                            {user.firstName ? user.firstName[0] : user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {user.id.split('-')[0]}
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
                          {user.benefits?.length > 2 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              +{user.benefits.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px' }}>
                          {filterOptions?.sessions.find(
                            (s: { id: string; name: string }) => s.id === user.selectedSession,
                          )?.name || 'Not Selected'}
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

          {meta?.page < meta?.totalPages && (
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

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }
      `}</style>
    </div>
  )
}

export default Dashboard
