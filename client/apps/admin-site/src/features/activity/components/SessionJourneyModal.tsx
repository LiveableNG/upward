import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  LogIn,
  Eye,
  Activity,
  Search,
  ArrowUpDown,
  X,
  Layers,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'
import { Modal } from '../../../components/common/modal/Modal'

interface SessionJourneyModalProps {
  sessionId: string | null
  token?: string
  onClose: () => void
}

export const SessionJourneyModal: React.FC<SessionJourneyModalProps> = ({
  sessionId,
  token,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SCREENS' | 'AUTH' | 'PAYMENTS' | 'ERRORS'>('ALL')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!sessionId) {
      setSessionData(null)
      return
    }

    const fetchJourney = async () => {
      setLoading(true)
      try {
        const res = await apiService.get(`/admin/app-activity/sessions?sessionId=${sessionId}`, token)
        if (res && res.session) {
          setSessionData(res.session)
        }
      } catch (err) {
        console.error('Failed to fetch session journey details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchJourney()
  }, [sessionId, token])

  if (!sessionId) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpand = (stepNumber: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }))
  }

  const toggleExpandAll = (expand: boolean) => {
    if (!sessionData?.events) return
    const next: Record<number, boolean> = {}
    sessionData.events.forEach((e: any, idx: number) => {
      next[e.stepNumber || idx] = expand
    })
    setExpandedSteps(next)
  }

  const getEventBadge = (name: string) => {
    if (name.includes('PAYMENT_SUCCESS') || name.includes('COMPLETE')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', icon: CheckCircle }
    }
    if (name.includes('ERROR') || name.includes('FAILED')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', icon: AlertCircle }
    }
    if (name.includes('CANCEL') || name.includes('CLOSED_UNPAID') || name.includes('ABANDON')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', icon: AlertCircle }
    }
    if (name.includes('IDENTIF') || name.includes('LOGIN') || name.includes('SIGNUP')) {
      return { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', icon: LogIn }
    }
    if (name.includes('PAYSTACK') || name.includes('CHECKOUT') || name.includes('DEPOSIT')) {
      return { bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', icon: CreditCard }
    }
    if (name.includes('SCREEN') || name.includes('VIEW')) {
      return { bg: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-secondary)', icon: Eye }
    }
    return { bg: 'rgba(100, 116, 139, 0.08)', color: 'var(--text-muted)', icon: Activity }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Raw chronologically sorted events
  const chronologicalEvents = useMemo(() => {
    if (!sessionData?.events || !Array.isArray(sessionData.events)) return []
    return [...sessionData.events].sort((a, b) => {
      const timeA = new Date(a.clientTimestamp || a.createdAt).getTime()
      const timeB = new Date(b.clientTimestamp || b.createdAt).getTime()
      return timeA - timeB
    })
  }, [sessionData?.events])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: chronologicalEvents.length, SCREENS: 0, AUTH: 0, PAYMENTS: 0, ERRORS: 0 }
    chronologicalEvents.forEach((e) => {
      const n = (e.eventName || '').toUpperCase()
      if (n.includes('SCREEN') || n.includes('VIEW')) counts.SCREENS++
      if (n.includes('LOGIN') || n.includes('SIGNUP') || n.includes('IDENTIF') || n.includes('LOGOUT')) counts.AUTH++
      if (n.includes('PAY') || n.includes('DEPOSIT') || n.includes('CHECKOUT')) counts.PAYMENTS++
      if (n.includes('ERROR') || n.includes('FAILED') || e.metadata?.error) counts.ERRORS++
    })
    return counts
  }, [chronologicalEvents])

  // Filtered and Sorted Events
  const displayedEvents = useMemo(() => {
    let list = chronologicalEvents

    // Category filter
    if (categoryFilter === 'SCREENS') {
      list = list.filter((e) => (e.eventName || '').includes('SCREEN') || (e.eventName || '').includes('VIEW'))
    } else if (categoryFilter === 'AUTH') {
      list = list.filter((e) => {
        const n = (e.eventName || '').toUpperCase()
        return n.includes('LOGIN') || n.includes('SIGNUP') || n.includes('IDENTIF') || n.includes('LOGOUT')
      })
    } else if (categoryFilter === 'PAYMENTS') {
      list = list.filter((e) => {
        const n = (e.eventName || '').toUpperCase()
        return n.includes('PAY') || n.includes('DEPOSIT') || n.includes('CHECKOUT')
      })
    } else if (categoryFilter === 'ERRORS') {
      list = list.filter((e) => {
        const n = (e.eventName || '').toUpperCase()
        return n.includes('ERROR') || n.includes('FAILED') || e.metadata?.error
      })
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((e) => {
        const nameMatch = (e.eventName || '').toLowerCase().includes(q)
        const screenMatch = (e.screenName || '').toLowerCase().includes(q)
        const metaMatch = e.metadata ? JSON.stringify(e.metadata).toLowerCase().includes(q) : false
        return nameMatch || screenMatch || metaMatch
      })
    }

    if (sortOrder === 'desc') {
      return [...list].reverse()
    }
    return list
  }, [chronologicalEvents, categoryFilter, searchQuery, sortOrder])

  return (
    <Modal
      isOpen={!!sessionId}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{sessionData?.userEmail || (sessionData?.userId ? `User #${sessionData.userId}` : 'Guest Visitor')}</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
            }}
          >
            Session Journey
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '580px', maxWidth: '780px' }}>
        {loading && !sessionData ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading timeline breadcrumbs...
          </div>
        ) : !sessionData ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Session not found or has been removed.
          </div>
        ) : (
          <>
            {/* Session Metadata Card */}
            <div
              style={{
                background: 'var(--surface-highlight)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Platform
                </span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                  {sessionData.platform} ({sessionData.clientType || 'App'})
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Location & IP
                </span>
                <span style={{ fontWeight: 700 }}>
                  {sessionData.countryCode || 'NG'} ({sessionData.ipAddress || 'Unknown IP'})
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Duration & Events
                </span>
                <span style={{ fontWeight: 700 }}>
                  {formatDuration(sessionData.durationSeconds)} • {sessionData.eventsCount || sessionData.events?.length || 0} events
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Drop-off Status
                </span>
                {sessionData.dropOffStage && sessionData.dropOffStage !== 'COMPLETED' ? (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '11px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#dc2626',
                    }}
                  >
                    Dropped off at: {sessionData.dropOffStage}
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontWeight: 700 }}>Active / Converted</span>
                )}
              </div>
            </div>

            {/* Controls Bar: Search, Category Filters, Sort, Expand All */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events, screens, metadata..."
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 30px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort & Expand Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-highlight)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                    title="Toggle chronological vs newest first"
                  >
                    <ArrowUpDown size={12} />
                    {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpandAll(Object.keys(expandedSteps).length < displayedEvents.length)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-highlight)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                  >
                    <Layers size={12} />
                    {Object.keys(expandedSteps).length > 0 ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Filter:
                </span>
                {(
                  [
                    { key: 'ALL', label: `All (${categoryCounts.ALL})` },
                    { key: 'SCREENS', label: `Screens (${categoryCounts.SCREENS})` },
                    { key: 'AUTH', label: `Auth (${categoryCounts.AUTH})` },
                    { key: 'PAYMENTS', label: `Payments (${categoryCounts.PAYMENTS})` },
                    { key: 'ERRORS', label: `Errors (${categoryCounts.ERRORS})` },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: categoryFilter === cat.key ? 'var(--text)' : 'var(--surface-hover)',
                      color: categoryFilter === cat.key ? 'var(--white)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Timeline Container */}
            <div
              style={{
                maxHeight: '440px',
                overflowY: 'auto',
                paddingRight: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 2px 0' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  Playback Timeline ({displayedEvents.length})
                </h4>
                {displayedEvents.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {sortOrder === 'asc' ? 'Chronological Order' : 'Reverse Chronological Order'}
                  </span>
                )}
              </div>

              {displayedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  {searchQuery || categoryFilter !== 'ALL'
                    ? 'No matching events found for this filter or search query.'
                    : 'No breadcrumb events recorded for this session yet.'}
                </div>
              ) : (
                displayedEvents.map((evt: any, idx: number) => {
                  const badge = getEventBadge(evt.eventName)
                  const Icon = badge.icon
                  const stepKey = evt.stepNumber || evt.id || idx
                  const isExpanded = !!expandedSteps[stepKey]

                  // Relative delta time calculation
                  let deltaSecs: number | null = null
                  const prevEvt = idx > 0 ? displayedEvents[idx - 1] : null
                  if (prevEvt && evt.clientTimestamp && prevEvt.clientTimestamp) {
                    const diff = Math.round(
                      (new Date(evt.clientTimestamp).getTime() - new Date(prevEvt.clientTimestamp).getTime()) / 1000
                    )
                    deltaSecs = Math.abs(diff)
                  }

                  return (
                    <div
                      key={evt.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Step Number Circle */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: badge.bg,
                          color: badge.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Icon size={14} />
                      </div>

                      {/* Event Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
                              {evt.eventName}
                            </span>
                            {evt.screenName && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'var(--surface-highlight)',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {evt.screenName}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {deltaSecs !== null && (
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                +{deltaSecs}s
                              </span>
                            )}
                            <span>{new Date(evt.clientTimestamp || evt.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Expandable Metadata */}
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => toggleExpand(stepKey)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--accent)',
                                cursor: 'pointer',
                              }}
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              {isExpanded ? 'Hide Payload' : 'View Payload & Error Info'}
                            </button>

                            {isExpanded && (
                              <pre
                                style={{
                                  margin: '8px 0 0 0',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  color: 'var(--text)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  maxHeight: '160px',
                                  overflowY: 'auto',
                                }}
                              >
                                {JSON.stringify(evt.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
          >
            Close Journey
          </button>
        </div>
      </div>
    </Modal>
  )
}
