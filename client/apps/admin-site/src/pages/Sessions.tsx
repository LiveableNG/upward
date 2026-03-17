import { useState, useEffect } from 'react'
import { Video, ChevronRight, Check, Clock } from 'lucide-react'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface Attendance {
  userId: string
  attended: boolean
  user: User
}

interface Session {
  id: string
  name: string
  startTime: string
  googleMeetLink: string
  attendances?: Attendance[]
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/sessions`,
      )
      const { data } = await res.json()
      setSessions(data || [])
    } catch (err) {
      console.error('Failed to fetch sessions', err)
    }
  }

  const handleToggleAttendance = async (sessionId: string, userId: string, attended: boolean) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/sessions/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId, attended }),
        },
      )
      fetchSessions()
      if (selectedSession && selectedSession.id === sessionId) {
        // Refresh selected session view
        const updated = sessions.find((s) => s.id === sessionId)
        if (updated) setSelectedSession(updated)
      }
    } catch (err) {
      console.error('Failed to toggle attendance', err)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '4px' }}>Session Management</h2>
        <p style={{ color: 'var(--muted)' }}>Track Google Meet sessions and attendance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div>
          <h3
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '16px',
            }}
          >
            Upcoming & Past Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`card ${selectedSession?.id === session.id ? 'active' : ''}`}
                onClick={() =>
                  setSelectedSession((prev) => (prev?.id === session.id ? null : session))
                }
                style={{
                  cursor: 'pointer',
                  borderColor:
                    selectedSession?.id === session.id ? 'var(--accent)' : 'var(--border)',
                  background:
                    selectedSession?.id === session.id
                      ? 'rgba(217, 119, 87, 0.05)'
                      : 'var(--surface)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '4px' }}>
                      {session.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--muted)',
                      }}
                    >
                      <Clock size={14} /> {new Date(session.startTime).toLocaleString()}
                    </div>
                  </div>
                  <ChevronRight size={20} color="var(--muted)" />
                </div>
                <div
                  style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    className="badge"
                    style={{ background: 'var(--surface2)', color: 'var(--accent)' }}
                  >
                    {session.attendances?.length || 0} RSVPs
                  </span>
                  <a
                    href={session.googleMeetLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: 'var(--muted)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Video size={14} /> Join Link
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {selectedSession ? (
            <div>
              <h3
                style={{
                  fontSize: '14px',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                }}
              >
                Attendance: {selectedSession.name}
              </h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th style={{ textAlign: 'right' }}>Attended?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSession.attendances?.map((att) => (
                      <tr key={att.userId}>
                        <td style={{ fontSize: '13px' }}>
                          <div style={{ fontWeight: 500 }}>{att.user.email}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {att.user.firstName} {att.user.lastName}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              handleToggleAttendance(selectedSession.id, att.userId, !att.attended)
                            }
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: att.attended ? 'var(--accent)' : 'var(--surface2)',
                              color: att.attended ? '#141413' : 'var(--muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!selectedSession.attendances || selectedSession.attendances.length === 0) && (
                      <tr>
                        <td
                          colSpan={2}
                          style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}
                        >
                          No RSVPs for this session
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <Video size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Select a session to view attendance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
