import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Filter, Users, Info, Monitor, EyeOff } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface DropOffUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: string
  drop_off_stage: string
  selectedSession?: string
}

interface Session {
  id: string
  name: string
  startTime: string
  googleMeetLink: string
}

interface EmailComposerProps {
  token: string
}

const buildPreviewHtml = (content: string, subject: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background-color:#F9FAFB;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #E5E7EB;">
        <tr><td style="height:4px;background-color:#d97757;"></td></tr>
        <tr><td style="padding:16px 40px 8px;background:#fff;">
          <div style="color:#6B7280;font-size:12px;border-bottom:1px solid #F3F4F6;padding-bottom:12px;">
            <strong style="color:#111827;">Subject:</strong> ${subject || '(no subject)'}
          </div>
        </td></tr>
        <tr><td style="padding:32px 40px 40px;">
          <div style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${content
            .replace(/{{firstName}}/g, 'Alex')
            .replace(/{{email}}/g, 'alex@example.com')}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const MIN_PREVIEW_WIDTH = 300
const MAX_PREVIEW_FRACTION = 0.72

const EmailComposer: React.FC<EmailComposerProps> = ({ token }) => {
  const location = useLocation()
  const [targetQuery, setTargetQuery] = useState({ stage: 'All', role: 'All', session: 'All' })
  const [users, setUsers] = useState<DropOffUser[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [externalIds, setExternalIds] = useState<string[] | null>(location.state?.userIds || null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(540)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  useEffect(() => {
    fetchUsers()
    fetchSessions()
  }, [token])

  const fetchUsers = async () => {
    try {
      const result = await apiService.get('/admin/drop-off', token)
      setUsers(result.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSessions = async () => {
    try {
      const result = await apiService.get('/admin/sessions', token)
      setSessions(result.data)
    } catch (err) {
      console.error(err)
    }
  }

  const filteredUsers = useMemo(() => {
    if (externalIds) return users.filter((u) => externalIds.includes(u.id))
    return users.filter((u) => {
      const matchesStage = targetQuery.stage === 'All' || u.drop_off_stage === targetQuery.stage
      const matchesRole = targetQuery.role === 'All' || u.role === targetQuery.role
      const matchesSession =
        targetQuery.session === 'All' || u.selectedSession === targetQuery.session
      return matchesStage && matchesRole && matchesSession
    })
  }, [users, externalIds, targetQuery])

  const handleSessionChange = (sessionName: string) => {
    setTargetQuery({ ...targetQuery, session: sessionName })
    if (sessionName !== 'All') {
      const selected = sessions.find((s) => s.name === sessionName)
      if (selected) {
        setSubject(`Reminder: ${selected.name}`)
        setContent(
          `Hi {{firstName}},\n\nThis is a reminder for our upcoming session: **${selected.name}**.\n\nDate: ${new Date(selected.startTime).toLocaleDateString()}\nTime: ${new Date(selected.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nMeeting Link: ${selected.googleMeetLink}\n\nWe look forward to seeing you there!\n\nBest regards,\nUpward Team`,
        )
      }
    }
  }

  const handleSend = async () => {
    if (!subject || !content || filteredUsers.length === 0) {
      showToast('Please fill all fields and select recipients', true)
      return
    }
    setSending(true)
    try {
      await apiService.post(
        '/admin/email/bulk',
        { userIds: filteredUsers.map((u) => u.id), subject, content },
        token,
      )
      showToast(
        `Email sent to ${filteredUsers.length} recipient${filteredUsers.length === 1 ? '' : 's'}! ✓`,
      )
      setSubject('')
      setContent('')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || 'Failed to send emails', true)
    } finally {
      setSending(false)
    }
  }

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + ` {{${variable}}}`)
  }

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = previewWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [previewWidth],
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const delta = startX.current - e.clientX
      const next = Math.min(
        Math.max(startWidth.current + delta, MIN_PREVIEW_WIDTH),
        containerWidth * MAX_PREVIEW_FRACTION,
      )
      setPreviewWidth(Math.round(next))
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const stages = ['All', ...Array.from(new Set(users.map((u) => u.drop_off_stage)))]
  const roles = ['All', ...Array.from(new Set(users.filter((u) => u.role).map((u) => u.role!)))]

  return (
    <div className="page-container fade-in">
      <div
        style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 className="section-title">Email Composer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Draft and send personalized emails to filtered user segments.
          </p>
        </div>
        <button
          onClick={() => setShowPreview((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: showPreview ? 'rgba(217,119,87,0.08)' : 'var(--white)',
            color: showPreview ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showPreview ? <EyeOff size={15} /> : <Monitor size={15} />}
          {showPreview ? 'Hide Preview' : 'Preview Email'}
        </button>
      </div>

      <div ref={containerRef} style={{ display: 'flex', gap: '0', alignItems: 'flex-start' }}>
        {/* Composer + sidebar — shrinks to make room for preview */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 300px',
            gap: '24px',
            alignItems: 'start',
            marginRight: showPreview ? '0' : '0',
          }}
        >
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Subject Line</label>
              <input
                type="text"
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label style={{ fontSize: '14px', fontWeight: 600 }}>Email Body</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => insertVariable('firstName')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    + First Name
                  </button>
                  <button
                    onClick={() => insertVariable('email')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    + Email
                  </button>
                </div>
              </div>
              <textarea
                rows={8}
                placeholder="Write your email here... (HTML tags supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface)',
                borderRadius: '12px',
                border: '1px dashed var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <Info size={18} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <strong>Tip:</strong> You can use standard HTML tags like{' '}
                <code>&lt;a href="..."&gt;</code> for links. All links will be automatically tracked
                for engagement.
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || filteredUsers.length === 0}
              style={{
                padding: '14px',
                backgroundColor: 'var(--accent)',
                color: 'var(--white)',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '12px',
                transition: 'var(--transition)',
                opacity: sending || filteredUsers.length === 0 ? 0.6 : 1,
                cursor: sending || filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  Send to {filteredUsers.length} Recipients
                  <Send size={18} />
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Filter size={18} color="var(--accent)" /> Target Segment
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {externalIds ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--accent-faint)',
                      borderRadius: '8px',
                      border: '1px solid var(--accent-muted)',
                      fontSize: '13px',
                    }}
                  >
                    <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>
                      Dashboard Filter Active
                    </p>
                    <p
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      Segment filters are disabled while using target list from dashboard.
                    </p>
                    <button
                      onClick={() => setExternalIds(null)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Dashboard Filter
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="filter-field">
                      <label>Registered Session</label>
                      <select
                        value={targetQuery.session}
                        onChange={(e) => handleSessionChange(e.target.value)}
                      >
                        <option value="All">All Sessions</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-field">
                      <label>Progress Stage</label>
                      <select
                        value={targetQuery.stage}
                        onChange={(e) => setTargetQuery({ ...targetQuery, stage: e.target.value })}
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-field">
                      <label>User Role</label>
                      <select
                        value={targetQuery.role}
                        onChange={(e) => setTargetQuery({ ...targetQuery, role: e.target.value })}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className="card audience-card"
              style={{
                backgroundColor: 'var(--accent-faint)',
                borderColor: 'var(--accent-muted)',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Users size={18} color="var(--accent)" /> Audience
              </h3>
              <div
                className="audience-number"
                style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent)' }}
              >
                {filteredUsers.length}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                recipient{filteredUsers.length === 1 ? '' : 's'} match your filters.
              </p>
            </div>
          </div>
        </div>

        {/* Drag handle + preview pane */}
        {showPreview && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={onDragStart}
              style={{
                width: '16px',
                flexShrink: 0,
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'col-resize',
                borderRadius: '4px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'rgba(217,119,87,0.12)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
              }
            >
              <div
                style={{
                  width: '4px',
                  height: '48px',
                  borderRadius: '4px',
                  background: 'var(--border)',
                }}
              />
            </div>

            {/* Preview card */}
            <div
              className="card"
              style={{
                flexShrink: 0,
                width: `${previewWidth}px`,
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 20px',
                  background: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <Monitor size={14} color="var(--text-muted)" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Live Preview
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  {'{{firstName}}'} → "Alex"
                </span>
              </div>
              <div style={{ flex: 1, background: '#f3f4f6', minHeight: '500px' }}>
                {content.trim() || subject.trim() ? (
                  <iframe
                    srcDoc={buildPreviewHtml(content, subject)}
                    title="Email preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '500px',
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '500px',
                      gap: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Monitor size={36} color="var(--border)" />
                    <span style={{ fontSize: '13px' }}>Start writing to see a preview</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EmailComposer
