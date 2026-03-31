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
  <style>
    body { background-color: #F9FAFB; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
    .main { padding: 40px 20px; }
    .card { 
      max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; 
      border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
    }
    @media (max-width: 600px) {
      .main { padding: 20px 0; }
      .card { border-radius: 0; border-left: none; border-right: none; }
      .inner { padding: 32px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="main">
    <div class="card">
      <div style="height:4px; background:#d97757;"></div>
      <div class="inner" style="padding: 48px 40px;">
        <div style="margin-bottom:40px;">
          <span style="color:#d97757; font-size:14px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280; font-size:12px; margin-top:4px;">by GoodTenants</div>
        </div>
        ${
          subject
            ? `<div style="color: #111827; font-size: 24px; font-weight: 800; line-height: 1.3; margin-bottom: 24px;">${subject}</div>`
            : ''
        }
        <div style="color:#374151; font-size:16px; line-height:1.7; white-space:pre-wrap;">${content
          .replace(/{{firstName}}/g, 'Alex')
          .replace(/{{email}}/g, 'alex@example.com')}</div>
        
        <div style="margin-top: 40px; border-top: 1px solid #F3F4F6; padding-top: 32px;">
          <p style="margin:0; color:#111827; font-weight:600; font-size:16px;">The Upward Team</p>
          <p style="margin:4px 0 0 0; color:#6B7280; font-size:14px;">Building your pathway home.</p>
        </div>
      </div>
    </div>
  </div>
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
  const [previewWidth, setPreviewWidth] = useState(window.innerWidth > 1400 ? 540 : 400)
  const [composerMode, setComposerMode] = useState<'BULK' | 'SIGNUP_CONFIRMATION'>('BULK')
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [testEmails, setTestEmails] = useState('')
  const [testSending, setTestSending] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (composerMode === 'SIGNUP_CONFIRMATION') {
      fetchSignupTemplate()
    } else {
      setSubject('')
      setContent('')
    }
  }, [composerMode])

  const fetchSignupTemplate = async () => {
    try {
      const result = await apiService.get('/admin/system-email/SIGNUP_CONFIRMATION', token)
      if (result.data) {
        setSubject(result.data.subject)
        setContent(result.data.htmlContent)
      }
    } catch (err) {
      console.error('Failed to fetch signup template', err)
    }
  }

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
    if (composerMode === 'SIGNUP_CONFIRMATION') {
      handleSaveTemplate()
      return
    }

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

  const handleSaveTemplate = async () => {
    setSending(true)
    try {
      await apiService.post(
        '/admin/system-email/SIGNUP_CONFIRMATION',
        { subject, htmlContent: content },
        token,
      )
      showToast('Signup template updated successfully! ✓')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || 'Failed to update template', true)
    } finally {
      setSending(false)
    }
  }

  const handleTestSend = async () => {
    const emails = testEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'))

    if (emails.length === 0) {
      showToast('Please enter at least one valid test email address', true)
      return
    }

    if (!subject || !content) {
      showToast('Subject and email body are required for testing', true)
      return
    }

    setTestSending(true)
    try {
      await apiService.post('/admin/email/test-send', { emails, subject, content }, token)
      showToast(
        `Test email dispatched to ${emails.length} recipient${emails.length === 1 ? '' : 's'}! ✓`,
      )
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || 'Failed to send test emails', true)
    } finally {
      setTestSending(false)
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setComposerMode('BULK')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: composerMode === 'BULK' ? 'var(--white)' : 'transparent',
                boxShadow: composerMode === 'BULK' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                color: composerMode === 'BULK' ? 'var(--text)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Bulk Email
            </button>
            <button
              onClick={() => setComposerMode('SIGNUP_CONFIRMATION')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: composerMode === 'SIGNUP_CONFIRMATION' ? 'var(--white)' : 'transparent',
                boxShadow:
                  composerMode === 'SIGNUP_CONFIRMATION' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                color: composerMode === 'SIGNUP_CONFIRMATION' ? 'var(--text)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Signup Template
            </button>
          </div>
          <button
            onClick={() => {
              const next = !showPreview
              setShowPreview(next)
              if (next && isMobile) setActiveTab('PREVIEW')
            }}
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
            {isMobile
              ? showPreview
                ? 'Stop Previewing'
                : 'Preview Email'
              : showPreview
                ? 'Hide Preview'
                : 'Live Preview'}
          </button>
        </div>
      </div>

      {isMobile && showPreview && (
        <div
          style={{
            display: 'flex',
            marginBottom: '20px',
            background: 'var(--surface)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveTab('EDIT')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'EDIT' ? 'var(--white)' : 'transparent',
              boxShadow: activeTab === 'EDIT' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '13px',
              color: activeTab === 'EDIT' ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Composer
          </button>
          <button
            onClick={() => setActiveTab('PREVIEW')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'PREVIEW' ? 'var(--white)' : 'transparent',
              boxShadow: activeTab === 'PREVIEW' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '13px',
              color: activeTab === 'PREVIEW' ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Live Preview
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: '0',
          alignItems: 'flex-start',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Composer + sidebar — shrinks to make room for preview */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: isMobile && showPreview && activeTab === 'PREVIEW' ? 'none' : 'grid',
            gridTemplateColumns:
              isMobile || (showPreview && window.innerWidth < 1400) ? '1fr' : 'minmax(0,1fr) 300px',
            gap: '24px',
            alignItems: 'start',
            width: '100%',
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
                rows={12}
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
                  minHeight: '300px',
                  backgroundColor: 'var(--white)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
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
              disabled={sending || (composerMode === 'BULK' && filteredUsers.length === 0)}
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
                opacity:
                  sending || (composerMode === 'BULK' && filteredUsers.length === 0) ? 0.6 : 1,
                cursor:
                  sending || (composerMode === 'BULK' && filteredUsers.length === 0)
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {sending ? (
                'Processing...'
              ) : composerMode === 'SIGNUP_CONFIRMATION' ? (
                'Save Template Changes'
              ) : (
                <>
                  Send to {filteredUsers.length} Recipients
                  <Send size={18} />
                </>
              )}
            </button>
          </div>

          {composerMode === 'BULK' && (
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
                          onChange={(e) =>
                            setTargetQuery({ ...targetQuery, stage: e.target.value })
                          }
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
                  backgroundColor: 'rgba(217,119,87,0.04)',
                  borderColor: 'rgba(217,119,87,0.2)',
                  borderStyle: 'solid',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    opacity: 0.05,
                  }}
                />
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--text)',
                  }}
                >
                  <Users size={18} color="var(--accent)" /> Total Audience
                </h3>
                <div
                  className="audience-number"
                  style={{
                    fontSize: '42px',
                    fontWeight: 800,
                    color: 'var(--accent)',
                    lineHeight: 1,
                  }}
                >
                  {filteredUsers.length}
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    marginTop: '8px',
                    fontWeight: 500,
                  }}
                >
                  match your current filters
                </p>
              </div>

              {/* TEST SEND SECTION */}
              <div
                className="card"
                style={{
                  marginTop: '16px',
                  borderColor: 'var(--border)',
                  borderStyle: 'dashed',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Send size={16} color="var(--accent)" /> Test Recipients
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Bulk upload: Separate emails with new lines or commas.
                </p>
                <textarea
                  rows={4}
                  placeholder="test@example.com&#10;admin@upward.africa"
                  value={testEmails}
                  onChange={(e) => setTestEmails(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical',
                    marginBottom: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={handleTestSend}
                  disabled={testSending || !testEmails.trim() || !subject || !content}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--text)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor:
                      testSending || !testEmails.trim() || !subject || !content
                        ? 'not-allowed'
                        : 'pointer',
                    transition: 'var(--transition)',
                    opacity: testSending || !testEmails.trim() || !subject || !content ? 0.6 : 1,
                  }}
                >
                  {testSending ? 'Sending Tests...' : 'Send Test Emails'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drag handle + preview pane */}
        {showPreview && (!isMobile || activeTab === 'PREVIEW') && (
          <>
            {/* Drag handle */}
            {!isMobile && (
              <div
                onMouseDown={onDragStart}
                style={{
                  width: '24px',
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
                    height: '64px',
                    borderRadius: '4px',
                    background: 'var(--border)',
                  }}
                />
              </div>
            )}

            {/* Preview card */}
            <div
              className="card"
              style={{
                flexShrink: 0,
                width: isMobile ? '100%' : `${previewWidth}px`,
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: isMobile ? 'none' : '1px solid var(--border)',
                boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                borderRadius: isMobile ? '0' : '16px',
                position: 'sticky',
                top: '24px',
              }}
            >
              <div
                style={{
                  padding: '12px 20px',
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
                {!isMobile && (
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
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  background: '#f3f4f6',
                  minHeight: isMobile ? 'calc(100vh - 300px)' : '600px',
                }}
              >
                {content.trim() || subject.trim() ? (
                  <iframe
                    srcDoc={buildPreviewHtml(content, subject)}
                    title="Email preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: isMobile ? 'calc(100vh - 300px)' : '600px',
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
