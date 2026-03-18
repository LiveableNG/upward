import React, { useState, useEffect } from 'react'
import { Send, Filter, Users, Info } from 'lucide-react'
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

const EmailComposer: React.FC<EmailComposerProps> = ({ token }) => {
  const [targetQuery, setTargetQuery] = useState({ stage: 'All', role: 'All', session: 'All' })
  const [users, setUsers] = useState<DropOffUser[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

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

  const filteredUsers = users.filter((u) => {
    const matchesStage = targetQuery.stage === 'All' || u.drop_off_stage === targetQuery.stage
    const matchesRole = targetQuery.role === 'All' || u.role === targetQuery.role
    const matchesSession =
      targetQuery.session === 'All' || u.selectedSession === targetQuery.session
    return matchesStage && matchesRole && matchesSession
  })

  const handleSessionChange = (sessionName: string) => {
    setTargetQuery({ ...targetQuery, session: sessionName })
    if (sessionName !== 'All') {
      const selected = sessions.find((s) => s.name === sessionName)
      if (selected) {
        setSubject(`Reminder: ${selected.name}`)
        setContent(
          `Hi {{firstName}},\n\nThis is a reminder for our upcoming session: **${selected.name}**.\n\n📅 **Date:** ${new Date(selected.startTime).toLocaleDateString()}\n🕒 **Time:** ${new Date(selected.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n📹 **Meeting Link:** ${selected.googleMeetLink}\n\nWe look forward to seeing you there!\n\nBest regards,\nUpward Team`,
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
        {
          userIds: filteredUsers.map((u) => u.id),
          subject,
          content,
        },
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

  const stages = ['All', ...Array.from(new Set(users.map((u) => u.drop_off_stage)))]
  const roles = ['All', ...Array.from(new Set(users.filter((u) => u.role).map((u) => u.role!)))]

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="section-title">Email Composer</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Draft and send personalized emails to filtered user segments.
        </p>
      </div>

      <div
        className="email-composer-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '24px',
          alignItems: 'start',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <Info size={18} color="var(--accent)" style={{ marginTop: '2px' }} />
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

        <div
          className="email-sidebar"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
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
            </div>
          </div>

          <div
            className="card audience-card"
            style={{ backgroundColor: 'var(--accent-faint)', borderColor: 'var(--accent-muted)' }}
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
    </div>
  )
}

export default EmailComposer
