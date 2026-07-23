'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronRight, Eye, RefreshCw, Search, Users, X } from 'lucide-react'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Spinner } from '@/components/common/Spinner'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import {
  TENANT_HOME_REQUEST_PAGE_COPY,
  TENANT_HOME_REQUEST_STATUS_LABELS,
  TENANT_HOME_REQUEST_STATUS_OPTIONS,
} from '@/features/pm/constants/tenantHomeRequests'
import {
  listHomeRequests,
  type PmHomeRequest,
} from '@/features/pm/services/homeRequestService'
import {
  formatPropertyTypes,
  formatTenantHomeRequestBudget,
  formatTenantHomeRequestLocations,
  matchesHomeRequestSearch,
  statusLabelKey,
} from '@/features/pm/utils/tenantHomeRequests'
import '@/styles/home-requests.css'

function HomeRequestDetailsCell({ request }: { request: PmHomeRequest }) {
  const primaryType = formatPropertyTypes(request.propertyTypes)
  return (
    <div className="home-requests-table__details">
      <span
        className="home-requests-table__locations"
        title={formatTenantHomeRequestLocations(request.locations)}
      >
        {formatTenantHomeRequestLocations(request.locations)}
      </span>
      <span className="home-requests-table__brief">
        {request.beds} bed · {primaryType}
      </span>
      <span className="home-requests-table__budget">
        {formatTenantHomeRequestBudget(request.budgetMin, request.budgetMax)}
      </span>
    </div>
  )
}

function HomeRequestsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusCounts,
}: {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  statusCounts: Record<string, number>
}) {
  return (
    <div className="home-requests-toolbar">
      <div className="home-requests-toolbar__search">
        <Search size={18} className="home-requests-toolbar__search-icon" aria-hidden />
        <input
          type="search"
          className="home-requests-toolbar__search-input"
          placeholder={TENANT_HOME_REQUEST_PAGE_COPY.searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search home requests"
        />
        {searchQuery ? (
          <button
            type="button"
            className="home-requests-toolbar__search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div
        className="home-requests-toolbar__status"
        role="tablist"
        aria-label="Filter by status"
      >
        {TENANT_HOME_REQUEST_STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value
          const count = statusCounts[option.value] ?? 0
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`home-requests-status-tab${
                isActive ? ' home-requests-status-tab--active' : ''
              }`}
              onClick={() => onStatusChange(option.value)}
            >
              <span>{option.label}</span>
              <span className="home-requests-status-tab__count">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TenantHomeRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<PmHomeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listHomeRequests()
        if (!cancelled) setRequests(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load home requests')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const handleRetry = useCallback(() => setReloadToken((n) => n + 1), [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
  }, [])

  const stats = useMemo(() => {
    const submitted = requests.filter((r) => r.status === 'submitted').length
    const contacted = requests.filter((r) => r.status === 'contacted').length
    const assigned = requests.filter((r) => r.status === 'assigned').length
    const closed = requests.filter((r) => r.status === 'closed').length
    const myReveals = requests.filter((r) => r.contactRevealedByMe).length
    return { total: requests.length, submitted, contacted, assigned, closed, myReveals }
  }, [requests])

  const statusCounts = useMemo(
    () => ({
      all: stats.total,
      submitted: stats.submitted,
      contacted: stats.contacted,
      assigned: stats.assigned,
      closed: stats.closed,
    }),
    [stats],
  )

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (statusFilter !== 'all' && request.status !== statusFilter) return false
        return matchesHomeRequestSearch(request, searchQuery)
      }),
    [requests, searchQuery, statusFilter],
  )

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== 'all'

  const emptyStateNode = (
    <div className="home-requests-empty home-requests-empty--table">
      <div className="home-requests-empty__icon">
        <Search size={30} />
      </div>
      <h2>
        {hasActiveFilters
          ? TENANT_HOME_REQUEST_PAGE_COPY.filteredEmptyTitle
          : TENANT_HOME_REQUEST_PAGE_COPY.emptyTitle}
      </h2>
      <p>
        {hasActiveFilters
          ? TENANT_HOME_REQUEST_PAGE_COPY.filteredEmptyText
          : TENANT_HOME_REQUEST_PAGE_COPY.emptyText}
      </p>
      {hasActiveFilters && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
          Clear filters
        </button>
      )}
    </div>
  )

  const columns: Column<PmHomeRequest>[] = useMemo(
    () => [
      {
        header: 'Brief',
        width: '42%',
        render: (request) => <HomeRequestDetailsCell request={request} />,
      },
      {
        header: 'Move-in',
        width: '13%',
        render: (request) => (
          <span className="home-requests-table__nowrap">
            {request.moveInDate ? format(new Date(request.moveInDate), 'MMM d, yyyy') : 'Flexible'}
          </span>
        ),
      },
      {
        header: 'Interest',
        width: '12%',
        align: 'center',
        render: (request) => (
          <span
            className={`home-requests-reveal-pill${
              request.contactRevealedByMe ? ' home-requests-reveal-pill--mine' : ''
            }`}
            title={
              request.contactRevealedByMe
                ? 'You revealed contact'
                : `${request.contactRevealCount} PM reveals`
            }
          >
            {request.contactRevealedByMe ? <Eye size={13} /> : <Users size={13} />}
            {request.contactRevealCount}
          </span>
        ),
      },
      {
        header: 'Status',
        width: '14%',
        render: (request) => {
          const status = statusLabelKey(request.status)
          return (
            <span
              className={`home-request-status home-request-status--${status} home-requests-table__nowrap`}
            >
              {TENANT_HOME_REQUEST_STATUS_LABELS[status]}
            </span>
          )
        },
      },
      {
        header: '',
        width: '6%',
        align: 'right',
        render: () => (
          <span className="home-requests-table__review" aria-hidden>
            <ChevronRight size={18} />
          </span>
        ),
      },
    ],
    [],
  )

  const renderMobileCard = (request: PmHomeRequest) => {
    const status = statusLabelKey(request.status)
    return (
      <div className="home-requests-mobile-card">
        <div className="home-requests-mobile-card__top">
          <HomeRequestDetailsCell request={request} />
          <span className={`home-request-status home-request-status--${status}`}>
            {TENANT_HOME_REQUEST_STATUS_LABELS[status]}
          </span>
        </div>
        <div className="home-requests-mobile-card__meta">
          <span>
            Move-in {request.moveInDate ? format(new Date(request.moveInDate), 'MMM d') : 'Flexible'}
          </span>
          <span
            className={`home-requests-reveal-pill${
              request.contactRevealedByMe ? ' home-requests-reveal-pill--mine' : ''
            }`}
          >
            {request.contactRevealedByMe ? <Eye size={12} /> : <Users size={12} />}
            {request.contactRevealCount}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="home-requests-view animate-fade-in">
      <PageHeader
        title={TENANT_HOME_REQUEST_PAGE_COPY.listTitle}
        subtitle={TENANT_HOME_REQUEST_PAGE_COPY.listSubtitle}
      />

      {!loading && !error ? (
        <StatGrid>
          <StatCard label="Total briefs" value={String(stats.total)} />
          <StatCard label="New" value={String(stats.submitted)} />
          <StatCard label="Contacted" value={String(stats.contacted)} />
          <StatCard label="Your reveals" value={String(stats.myReveals)} />
        </StatGrid>
      ) : null}

      <HomeRequestsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusCounts={statusCounts}
      />

      {loading ? (
        <div className="home-requests-empty home-requests-empty--loading">
          <Spinner size={28} />
          <p>Loading home requests…</p>
        </div>
      ) : error ? (
        <div className="home-requests-empty home-requests-empty--error">
          <h2>Couldn’t load home requests</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleRetry}>
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequests}
          emptyMessage={emptyStateNode}
          onRowClick={(request) => router.push(`/home-requests/${request.uuid}`)}
          keyExtractor={(request) => request.uuid}
          pageSize={10}
          renderMobileCard={renderMobileCard}
        />
      )}
    </div>
  )
}
