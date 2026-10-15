import React, { useState, useEffect } from 'react'
import {
  X,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  LogIn,
  Eye,
  Activity,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '94%',
          maxHeight: '90vh',
          padding: '24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'var(--accent-faint)',
                  color: 'var(--accent)',
                }}
              >
                Session Journey
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {sessionId}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(sessionId)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                }}
                title="Copy Session ID"
              >
                {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              </button>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              {sessionData?.userEmail || (sessionData?.userId ? `User #${sessionData.userId}` : 'Guest Visitor')}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            Loading session events timeline...
          </div>
        ) : !sessionData ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            Session details not found.
          </div>
        ) : (
          <>
            {/* Session Metadata Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Platform</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                  {sessionData.platform || 'web'} ({sessionData.clientType || 'browser'})
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Location & IP</span>
                <span style={{ fontWeight: 600 }}>
                  {sessionData.city ? `${sessionData.city}, ` : ''}{sessionData.countryCode || 'Unknown'}
                  {sessionData.ipAddress && ` (${sessionData.ipAddress})`}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Duration & Events</span>
                <span style={{ fontWeight: 600 }}>
                  {formatDuration(sessionData.durationSeconds)} • {sessionData.events?.length || sessionData.eventCount || 0} events
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Drop-off Status</span>
                {sessionData.dropOffStage ? (
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

            {/* Events Timeline Container */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 800, margin: '8px 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Activity Playback Timeline ({sessionData.events?.length || 0})
              </h4>

              {(!sessionData.events || sessionData.events.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No breadcrumb events recorded for this session yet.
                </div>
              ) : (
                sessionData.events.map((evt: any, idx: number) => {
                  const badge = getEventBadge(evt.eventName)
                  const Icon = badge.icon
                  const isExpanded = !!expandedSteps[evt.stepNumber]
                  const prevEvt = idx > 0 ? sessionData.events[idx - 1] : null
                  let deltaSecs: number | null = null
                  if (prevEvt && evt.clientTimestamp && prevEvt.clientTimestamp) {
                    deltaSecs = Math.max(0, Math.round((new Date(evt.clientTimestamp).getTime() - new Date(prevEvt.clientTimestamp).getTime()) / 1000))
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
                            <span>{new Date(evt.clientTimestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Expandable Metadata */}
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => toggleExpand(evt.stepNumber)}
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
      </div>
    </div>
  )
}
