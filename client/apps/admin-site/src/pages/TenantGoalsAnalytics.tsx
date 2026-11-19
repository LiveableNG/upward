import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  Users,
  TrendingUp,
  Layers,
  RefreshCw,
  Search,
  ExternalLink,
  Award,
  Clock,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import type { GoalsOverview } from '../features/goals/types'

interface TenantGoalsAnalyticsProps {
  token?: string
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function TenantGoalsAnalytics({ token }: TenantGoalsAnalyticsProps) {
  const [data, setData] = useState<GoalsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiService.get('/admin/goals/overview', token)
      if (res && res.data) {
        setData(res.data)
      }
    } catch (err: unknown) {
      console.error('Failed to fetch tenant goals analytics:', err)
      setError('Unable to load tenant goals statistics.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalSelections = data?.activeUserGoals ?? data?.totalActiveUserGoals ?? 0
  const uniqueTenants = data?.uniqueTenantsWithGoals ?? 0
  const avgPerTenant = uniqueTenants > 0 ? (totalSelections / uniqueTenants).toFixed(1) : '0'
  const topGoals = data?.topGoals || []
  const categoryBreakdown = data?.categoryBreakdown || []
  const recentSelections = data?.recentSelections || []
  const topGoal = topGoals[0]

  const categoryOptions = useMemo(() => {
    const names = new Set<string>()
    topGoals.forEach((g) => {
      if (g.categoryName) names.add(g.categoryName)
    })
    return Array.from(names).sort()
  }, [topGoals])

  const filteredTopGoals = useMemo(() => {
    return topGoals.filter((g) => {
      if (selectedCategory !== 'ALL' && g.categoryName !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        return (
          g.title.toLowerCase().includes(q) ||
          (g.categoryName || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [topGoals, selectedCategory, searchQuery])

  const filteredRecent = useMemo(() => {
    if (!searchQuery.trim()) return recentSelections
    const q = searchQuery.trim().toLowerCase()
    return recentSelections.filter(
      (row) =>
        row.tenantName.toLowerCase().includes(q) ||
        (row.tenantEmail || '').toLowerCase().includes(q) ||
        row.goalTitle.toLowerCase().includes(q) ||
        row.categoryName.toLowerCase().includes(q),
    )
  }, [recentSelections, searchQuery])

  const maxGoalCount = Math.max(...topGoals.map((g) => g.userCount || g.count || 0), 1)
  const maxCategoryCount = Math.max(...categoryBreakdown.map((c) => c.selectionCount), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--accent-faint)',
              border: '1px solid var(--accent-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
              Tenant Goals Insights
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Live statistics on what tenants select in their Upward Pay goals setup
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
            style={{ height: '38px', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'loader' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/commerce/goals"
            className="btn btn-primary"
            style={{
              height: '38px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <span>Manage Goals Catalog</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            padding: '20px',
            borderColor: 'var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            fontSize: '13.5px',
          }}
        >
          {error}{' '}
          <button
            type="button"
            onClick={fetchData}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#10b981' }}>
              TENANTS WITH GOALS
            </span>
            <Users size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {loading ? '...' : uniqueTenants}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Unique tenants who completed goal setup
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: 'var(--accent)' }}>
              TOTAL GOAL SELECTIONS
            </span>
            <Target size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {loading ? '...' : totalSelections}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Avg {avgPerTenant} goals per active tenant
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#6366f1' }}>
              TOP SELECTED GOAL
            </span>
            <Award size={18} color="#6366f1" />
          </div>
          <div
            style={{
              fontSize: topGoal ? '17px' : '24px',
              fontWeight: 800,
              marginTop: '10px',
              color: 'var(--text)',
              lineHeight: 1.3,
            }}
          >
            {loading ? '...' : topGoal ? topGoal.title : '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {topGoal
              ? `${topGoal.userCount} ${topGoal.userCount === 1 ? 'tenant' : 'tenants'} selected`
              : 'No selections recorded yet'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label" style={{ color: '#f59e0b' }}>
              ACTIVE CATEGORIES
            </span>
            <Layers size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
            {loading ? '...' : `${categoryBreakdown.length} / ${data?.totalCategories ?? 0}`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Categories with at least one tenant goal
          </div>
        </div>
      </div>

      {/* Main Analytics Grid: Goal Distribution + Category Demand */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Full Goal Selection Ranking */}
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '18px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Goal Selection Breakdown
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Every goal selected by tenants ranked by popularity
              </p>
            </div>
            <TrendingUp size={18} color="var(--accent)" />
          </div>

          {/* Filter Row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search goal, category, or tenant..."
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '100%' }}
              />
            </div>

            {categoryOptions.length > 0 && (
              <select
                className="input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ height: '36px', fontSize: '13px', minWidth: '150px' }}
              >
                <option value="ALL">All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading goal selection statistics...
            </div>
          ) : filteredTopGoals.length === 0 ? (
            <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {topGoals.length === 0
                ? 'No tenant goal selections recorded yet. Once tenants choose goals on /dashboard/setup/goals, full selection stats will appear here.'
                : 'No goals match your current filter.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredTopGoals.map((item, idx) => {
                const count = item.userCount ?? item.count ?? 0
                const barWidth = Math.round((count / maxGoalCount) * 100)
                const sharePct = totalSelections > 0 ? Math.round((count / totalSelections) * 100) : 0
                return (
                  <div key={item.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            background: idx < 3 ? 'var(--accent-faint)' : 'var(--bg)',
                            color: idx < 3 ? 'var(--accent)' : 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </span>
                        {item.categoryName && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {count} {count === 1 ? 'tenant' : 'tenants'}{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({sharePct}%)</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '999px',
                        background: 'var(--surface-hover, #f3f1ed)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          borderRadius: '999px',
                          background: 'var(--accent)',
                          transition: 'width 0.35s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Category Interest Breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Demand by Category
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Which lifestyle areas tenants are prioritizing most
              </p>
            </div>
            <Layers size={18} color="#f59e0b" />
          </div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading category breakdown...
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Category breakdown will populate once tenants select goals.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categoryBreakdown.map((cat) => {
                const barWidth = Math.round((cat.selectionCount / maxCategoryCount) * 100)
                const sharePct =
                  totalSelections > 0 ? Math.round((cat.selectionCount / totalSelections) * 100) : 0
                return (
                  <div
                    key={cat.categoryId}
                    onClick={() =>
                      setSelectedCategory((prev) =>
                        prev === cat.categoryName ? 'ALL' : cat.categoryName,
                      )
                    }
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border:
                        selectedCategory === cat.categoryName
                          ? '1.5px solid var(--accent)'
                          : '1px solid var(--border)',
                      background:
                        selectedCategory === cat.categoryName
                          ? 'var(--accent-faint)'
                          : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                        {cat.categoryName}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                        {sharePct}% share
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                      }}
                    >
                      <span>{cat.selectionCount} selections</span>
                      <span>
                        {cat.uniqueTenants} unique {cat.uniqueTenants === 1 ? 'tenant' : 'tenants'}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '999px',
                        background: 'var(--surface-hover, #ebe7e0)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          borderRadius: '999px',
                          background: '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tenant Goal Selections Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              Recent Tenant Selections
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Latest active goals chosen by tenants (up to 40 most recent)
            </p>
          </div>
          <Clock size={18} color="var(--text-muted)" />
        </div>

        {loading ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading recent selections...
          </div>
        ) : filteredRecent.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No tenant goal selections found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tenant
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Selected Goal
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Category
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Selected On
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px' }}>
                      <Link
                        to={`/users/${row.userId}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--text)',
                          textDecoration: 'none',
                        }}
                      >
                        {row.tenantName}
                      </Link>
                      {row.tenantEmail && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {row.tenantEmail}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>
                      {row.goalTitle}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: 'var(--accent-faint)',
                          color: 'var(--accent)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.categoryName}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
