import React, { useState, useEffect } from 'react'
import { Globe, Clock, AlertCircle, CheckCircle2, Activity, Eye, RefreshCcw } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { apiService } from '../../../services/api.service'

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.73 1.41-.57.65-1.07 1.71-1.02 2.76 1.05.08 2.13-.55 2.74-1.3z" />
  </svg>
)

const AndroidIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.73 4.29 5.56 5.96 5.51 7.9h12.98c-.05-1.94-1.22-3.61-2.96-4.74zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
  </svg>
)

interface UserSessionsModalProps {
  userEmail: string | null
  userName?: string
  token?: string
  isOpen: boolean
  onClose: () => void
  onInspectSession: (sessionId: string) => void
}

export const UserSessionsModal: React.FC<UserSessionsModalProps> = ({
  userEmail,
  userName,
  token,
  isOpen,
  onClose,
  onInspectSession,
}) => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !userEmail) return

    const fetchUserSessions = async () => {
      setLoading(true)
      try {
        const res = await apiService.get(
          `/admin/app-activity/sessions?search=${encodeURIComponent(userEmail)}&limit=50`,
          token,
        )
        if (res && res.data) {
          // Exact filter by email to prevent partial search matches
          const exact = res.data.filter(
            (s: any) => s.userEmail && s.userEmail.toLowerCase() === userEmail.toLowerCase(),
          )
          setSessions(exact.length > 0 ? exact : res.data)
        }
      } catch (err) {
        console.error('Failed to load user sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserSessions()
  }, [isOpen, userEmail, token])

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getPlatformBadge = (platform?: string) => {
    const p = (platform || '').toLowerCase()
    if (p.includes('ios')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(15, 23, 42, 0.08)',
            color: 'var(--text)',
          }}
        >
          <AppleIcon size={12} /> iOS
        </span>
      )
    }
    if (p.includes('android')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
          }}
        >
          <AndroidIcon size={12} color="#059669" /> Android
        </span>
      )
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '6px',
          background: 'rgba(59, 130, 246, 0.08)',
          color: '#2563eb',
        }}
      >
        <Globe size={12} /> Web
      </span>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userName ? `${userName}'s Sessions` : 'User Sessions'}
      description={`Device session history and activity timeline for ${userEmail}`}
      icon={<Activity size={22} />}
      maxWidth="760px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <RefreshCcw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Loading session records...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Activity size={32} style={{ opacity: 0.3, margin: '0 auto 10px auto' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              No sessions found for this user.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '55vh',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    {getPlatformBadge(s.platform)}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {s.deviceModel || 'Client Device'}
                    </span>
                    {s.osVersion && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ({s.osVersion})
                      </span>
                    )}
                    {s.hasError ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: 'var(--danger)',
                          fontWeight: 600,
                        }}
                      >
                        <AlertCircle size={12} /> Error Encountered
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: '#10b981',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={12} /> Normal
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(s.startedAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span>
                      Duration: <strong>{formatDuration(s.durationSeconds)}</strong>
                    </span>
                    <span>
                      Events: <strong>{s.eventsCount || 0}</strong>
                    </span>
                    {s.dropOffStage && (
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        Stage: {s.dropOffStage}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onInspectSession(s.sessionId)
                  }}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Eye size={14} />
                  Inspect Journey
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
