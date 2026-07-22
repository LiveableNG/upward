import React, { useState, useEffect, useRef, useMemo } from 'react'
import { apiService } from '../services/api.service'
import {
  Mail,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  Clock,
  Search,
  RefreshCcw,
  ArrowLeft,
  ArrowRight,
  Layers,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface TrackerData {
  recipient: string
  allRecipients: string[]
  tenantName: string
  pmName: string
  totalSent: number
  channelsUsed: string[]
  channelCounts: Record<string, number>
  lastSentChannel: string
  lastSentDate: string
  status: 'PENDING' | 'SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID'
}

interface Summary {
  EMAIL: { sent: number; converted: number }
  SMS: { sent: number; converted: number }
  WHATSAPP: { sent: number; converted: number }
}

interface InvitationTrackerProps {
  token: string
}

const PAGE_SIZE = 20

const CHANNEL_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  EMAIL: {
    label: 'Email',
    icon: <Mail size={14} />,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  SMS: {
    label: 'SMS',
    icon: <MessageCircle size={14} />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  WHATSAPP: {
    label: 'WhatsApp',
    icon: <Smartphone size={14} />,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
}

type SortKey = 'lastSentDate' | 'totalSent' | 'tenantName'
type SortDir = 'asc' | 'desc'

const InvitationTracker: React.FC<InvitationTrackerProps> = ({ token }) => {
  const [allRecords, setAllRecords] = useState<TrackerData[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [pmFilter, setPmFilter] = useState('All')

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('lastSentDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(1)

  // Channel popup
  const [channelPopup, setChannelPopup] = useState<{
    record: TrackerData
    anchorRect: DOMRect
  } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await apiService.get('/admin/invitation-tracker', token)
      setAllRecords(res.data || [])
      setSummary(res.summary || null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, pmFilter, sortKey, sortDir])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setChannelPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pmOptions = useMemo(() => {
    const names = Array.from(new Set(allRecords.map((r) => r.pmName).filter(Boolean)))
    return names.sort()
  }, [allRecords])

  const filtered = useMemo(() => {
    let list = allRecords.filter((r) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const allContacts = (r.allRecipients || [r.recipient]).join(' ').toLowerCase()
        if (
          !allContacts.includes(q) &&
          !r.tenantName.toLowerCase().includes(q) &&
          !r.pmName.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter !== 'All') {
        const converted = r.status !== 'PENDING'
        if (statusFilter === 'converted' && !converted) return false
        if (statusFilter === 'pending' && converted) return false
      }
      if (pmFilter !== 'All' && r.pmName !== pmFilter) return false
      return true
    })

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'lastSentDate')
        cmp = new Date(a.lastSentDate).getTime() - new Date(b.lastSentDate).getTime()
      else if (sortKey === 'totalSent') cmp = a.totalSent - b.totalSent
      else if (sortKey === 'tenantName')
        cmp = (a.tenantName || '').localeCompare(b.tenantName || '')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [allRecords, debouncedSearch, statusFilter, pmFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  const getStatusBadge = (status: string) => {
    const converted = status !== 'PENDING'
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: converted ? '#16a34a' : '#d97706',
          backgroundColor: converted ? '#f0fdf4' : '#fffbeb',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          border: `1px solid ${converted ? '#bbf7d0' : '#fde68a'}`,
        }}
      >
        {converted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
        {converted ? 'Converted' : 'Pending'}
      </span>
    )
  }

  const handleChannelClick = (e: React.MouseEvent<HTMLButtonElement>, record: TrackerData) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    setChannelPopup(channelPopup?.record === record ? null : { record, anchorRect: rect })
  }

  const inputStyle: React.CSSProperties = {
    padding: '11px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    fontSize: '14px',
    outline: 'none',
    color: 'var(--text)',
  }

  const thStyle = (col?: SortKey): React.CSSProperties => ({
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    cursor: col ? 'pointer' : 'default',
    userSelect: 'none',
  })

  return (
    <div className="page-container fade-in" style={{ padding: '24px', position: 'relative' }}>
      {/* Header */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mail size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Invitation Tracker
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track PM tenant invitations across Email, SMS, and WhatsApp.
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCcw size={16} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {(['EMAIL', 'SMS', 'WHATSAPP'] as const).map((ch) => {
            const meta = CHANNEL_META[ch]
            const stat = summary[ch]
            return (
              <div
                key={ch}
                className="card"
                style={{ padding: '20px', borderTop: `3px solid ${meta.color}` }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color,
                    }}
                  >
                    {ch === 'EMAIL' ? (
                      <Mail size={18} />
                    ) : ch === 'SMS' ? (
                      <MessageCircle size={18} />
                    ) : (
                      <Smartphone size={18} />
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>{stat.sent}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  total invites sent
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#16a34a',
                  }}
                >
                  <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {stat.converted} converted
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search recipient, tenant or PM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingLeft: '42px' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 180px' }}
          >
            <option value="All">All Statuses</option>
            <option value="converted">Converted</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={pmFilter}
            onChange={(e) => setPmFilter(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 220px' }}
          >
            <option value="All">All Property Managers</option>
            {pmOptions.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle()}>Recipient</th>
                <th style={thStyle('tenantName')} onClick={() => handleSort('tenantName')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Tenant Name <SortIcon col="tenantName" />
                  </span>
                </th>
                <th style={thStyle()}>Property Manager</th>
                <th style={thStyle()}>Channels</th>
                <th style={thStyle('totalSent')} onClick={() => handleSort('totalSent')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Total Sent <SortIcon col="totalSent" />
                  </span>
                </th>
                <th style={thStyle()}>Last Channel</th>
                <th style={thStyle('lastSentDate')} onClick={() => handleSort('lastSentDate')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Last Sent <SortIcon col="lastSentDate" />
                  </span>
                </th>
                <th style={thStyle()}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}
                  >
                    Failed to load. Try refreshing.
                  </td>
                </tr>
              )}
              {!loading && !error && paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No invitations match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                paginated.map((record, index) => (
                  <tr
                    key={index}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: index % 2 === 0 ? 'var(--white)' : 'var(--bg)',
                    }}
                  >
                    {/* Recipient */}
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 500 }}>
                      <div>{record.recipient}</div>
                      {record.allRecipients && record.allRecipients.length > 1 && (
                        <div
                          style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}
                        >
                          +{record.allRecipients.length - 1} more contact
                          {record.allRecipients.length - 1 > 1 ? 's' : ''}
                        </div>
                      )}
                    </td>

                    {/* Tenant Name */}
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      {record.tenantName || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>

                    {/* PM */}
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {record.pmName}
                    </td>

                    {/* Channels — single badge, click to expand */}
                    <td style={{ padding: '14px 16px', position: 'relative' }}>
                      <button
                        onClick={(e) => handleChannelClick(e, record)}
                        title="Click to view channels"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Layers size={14} /> {record.channelsUsed.length}
                      </button>
                    </td>

                    {/* Total Sent */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '15px' }}>
                      {record.totalSent}
                    </td>

                    {/* Last Channel */}
                    <td style={{ padding: '14px 16px' }}>
                      {(() => {
                        const meta = CHANNEL_META[record.lastSentChannel] || CHANNEL_META['EMAIL']
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: meta.color,
                            }}
                          >
                            {meta.icon} {meta.label}
                          </span>
                        )
                      })()}
                    </td>

                    {/* Last Sent */}
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(record.lastSentDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <span
                        style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}
                      >
                        {new Date(record.lastSentDate).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>{getStatusBadge(record.status)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--surface)',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: page === 1 ? 0.4 : 1,
                cursor: page === 1 ? 'default' : 'pointer',
              }}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Page {page} of {totalPages}{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                ({filtered.length} records)
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: page === totalPages ? 0.4 : 1,
                cursor: page === totalPages ? 'default' : 'pointer',
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Channel Popup */}
      {channelPopup && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: channelPopup.anchorRect.bottom + 8,
            left: Math.min(channelPopup.anchorRect.left, window.innerWidth - 240),
            zIndex: 9999,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '16px',
            minWidth: '220px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}
            >
              Channels Used
            </span>
            <button
              onClick={() => setChannelPopup(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(channelPopup.record.channelCounts).map(([ch, count]) => {
              const meta = CHANNEL_META[ch] || {
                label: ch,
                icon: <Mail size={14} />,
                color: '#666',
                bg: '#f5f5f5',
                border: '#e5e5e5',
              }
              return (
                <div
                  key={ch}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: meta.color,
                    }}
                  >
                    {meta.icon} {meta.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: meta.color }}>
                    {count}×
                  </span>
                </div>
              )
            })}
          </div>

          {channelPopup.record.allRecipients && channelPopup.record.allRecipients.length > 1 && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                Contacts
              </div>
              {channelPopup.record.allRecipients.map((r) => (
                <div
                  key={r}
                  style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}
                >
                  {r}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              textAlign: 'right',
            }}
          >
            {channelPopup.record.totalSent} total send
            {channelPopup.record.totalSent !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

export default InvitationTracker
