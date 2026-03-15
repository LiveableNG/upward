import { useState, useEffect } from 'react'
import { Send, Filter, CheckCircle } from 'lucide-react'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  benefits?: string[]
  confirmationSent?: boolean
  selectedSession?: string
}

interface Session {
  id: string
  name: string
}

export default function EmailComposer() {
  const [target, setTarget] = useState('selected') // all, selected, incomplete, conf-pending, session
  const [selectedSession, setSelectedSession] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/users`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/sessions`),
      ])
      const uData = await uRes.json()
      const sData = await sRes.json()
      setUsers(uData.data || [])
      setSessions(sData.data || [])
    } catch (err) {
      console.error('Failed to fetch data', err)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (target === 'all') return true
    if (target === 'incomplete') {
      return !(
        user.firstName &&
        user.lastName &&
        user.phone &&
        user.benefits &&
        user.benefits.length > 0
      )
    }
    if (target === 'conf-pending') return !user.confirmationSent
    if (target === 'session') return user.selectedSession === selectedSession
    return false
  })

  const handleSend = async () => {
    if (!subject || !content || filteredUsers.length === 0) return

    setSending(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/email/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: filteredUsers.map((u) => u.id),
            subject,
            content,
            sessionId:
              target === 'session'
                ? sessions.find((s) => s.name === selectedSession)?.id
                : undefined,
          }),
        },
      )
      if (res.ok) {
        alert('Emails sent successfully!')
        setSubject('')
        setContent('')
      }
    } catch (err) {
      console.error('Failed to send bulk email', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '4px' }}>Email Composer</h2>
        <p style={{ color: 'var(--muted)' }}>Send high-reach emails to your waitlist</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Welcome to Upward!"
              style={{ width: '100%' }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Email Content (HTML Supported)
            </label>
            <textarea
              rows={12}
              placeholder="Hello there..."
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                padding: '12px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <button
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            disabled={sending || filteredUsers.length === 0}
            onClick={handleSend}
          >
            <Send size={18} /> {sending ? 'Sending...' : `Send to ${filteredUsers.length} Users`}
          </button>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Filter size={18} /> Recipients
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="target"
                  checked={target === 'all'}
                  onChange={() => setTarget('all')}
                />{' '}
                All Users
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="target"
                  checked={target === 'incomplete'}
                  onChange={() => setTarget('incomplete')}
                />{' '}
                Incomplete waitlist
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="target"
                  checked={target === 'conf-pending'}
                  onChange={() => setTarget('conf-pending')}
                />{' '}
                Conf. Not Sent
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="target"
                  checked={target === 'session'}
                  onChange={() => setTarget('session')}
                />{' '}
                By Session
              </label>
            </div>

            {target === 'session' && (
              <select
                style={{ width: '100%', marginTop: '16px' }}
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="card">
            <h3
              style={{
                fontSize: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={18} /> Tips
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Use HTML for rich formatting. Inline styles are recommended for email clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
