import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Video, CheckCircle, Edit, Trash2, X } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Attendance {
  userId: string
  attended: boolean
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface Session {
  id: string
  name: string
  googleMeetLink: string
  startTime: string
  endTime: string
  attendances: Attendance[]
  isVirtual?: boolean
}

interface SessionsProps {
  token: string
}

const Sessions: React.FC<SessionsProps> = ({ token }) => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null)
  const [sessionForm, setSessionForm] = useState({
    name: '',
    googleMeetLink: '',
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    fetchSessions()
  }, [token])

  const fetchSessions = async (keepSelection = false) => {
    setLoading(true)
    try {
      const result = await apiService.get('/admin/sessions', token)
      setSessions(result.data)
      if (result.data.length > 0) {
        if (keepSelection && selectedSession) {
          const updated = result.data.find((s: Session) => s.id === selectedSession.id)
          if (updated) setSelectedSession(updated)
        } else if (!selectedSession) {
          setSelectedSession(result.data[0])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAttendance = async (userId: string, attended: boolean) => {
    if (!selectedSession) return
    try {
      await apiService.post(
        `/admin/sessions/${selectedSession.id}/attendance/${userId}`,
        { attended },
        token,
      )

      // Update local state
      const updatedSessions = sessions.map((s) => {
        if (s.id === selectedSession.id) {
          const newAttendances = s.attendances.map((a) =>
            a.userId === userId ? { ...a, attended } : a,
          )
          return { ...s, attendances: newAttendances }
        }
        return s
      })
      setSessions(updatedSessions)
      if (selectedSession) {
        const updatedSelected = updatedSessions.find((s) => s.id === selectedSession.id)
        if (updatedSelected) setSelectedSession(updatedSelected)
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to update attendance', true)
    }
  }

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (showModal === 'create') {
        await apiService.post('/admin/sessions', sessionForm, token)
      } else if (showModal === 'edit' && selectedSession) {
        await apiService.patch(`/admin/sessions/${selectedSession.id}`, sessionForm, token)
      }
      fetchSessions(true)
      setShowModal(null)
      setSessionForm({ name: '', googleMeetLink: '', startTime: '', endTime: '' })
      showToast(showModal === 'create' ? 'Session created!' : 'Session updated!')
    } catch (err) {
      console.error(err)
      showToast('Failed to save session', true)
    }
  }

  const handleDeleteSession = async () => {
    if (!selectedSession) return
    if (!window.confirm(`Are you sure you want to delete session "${selectedSession.name}"?`)) {
      return
    }

    try {
      await apiService.delete(`/admin/sessions/${selectedSession.id}`, token)
      showToast('Session deleted.')
      fetchSessions()
      setSelectedSession(null)
    } catch (err) {
      console.error(err)
      showToast('Failed to delete session', true)
    }
  }

  const openEditModal = () => {
    if (!selectedSession) return
    // Format dates for datetime-local input
    const formatForInput = (dateStr: string) => {
      const d = new Date(dateStr)
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }

    setSessionForm({
      name: selectedSession.name,
      googleMeetLink: selectedSession.googleMeetLink,
      startTime: formatForInput(selectedSession.startTime),
      endTime: formatForInput(selectedSession.endTime),
    })
    setShowModal('edit')
  }

  const openCreateModal = () => {
    setSessionForm({
      name: '',
      googleMeetLink: 'https://meet.google.com/',
      startTime: '',
      endTime: '',
    })
    setShowModal('create')
  }

  return (
    <div className="page-container fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
        className="page-header-row"
      >
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Session Tracking
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Monitor attendance and manage session schedules.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--accent)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Calendar size={18} /> Schedule Session
        </button>
      </div>

      <div className="sessions-grid">
        {/* Sessions List */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              All Sessions ({sessions.length})
            </h3>
          </div>
          <div
            className="sessions-list-scroll"
            style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
          >
            <div
              className="sessions-list-inner"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className="session-item"
                  onClick={() => setSelectedSession(s)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor:
                      selectedSession?.id === s.id ? 'var(--accent-faint)' : 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: selectedSession?.id === s.id ? 'var(--accent)' : 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.name}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Clock size={13} />
                    {s.isVirtual ? (
                      'Not Scheduled'
                    ) : (
                      <>
                        {new Date(s.startTime).toLocaleDateString()} ·{' '}
                        {new Date(s.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {sessions.length === 0 && !loading && (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                }}
              >
                No sessions found.
              </div>
            )}
          </div>
        </div>

        {/* Selected Session Details & Attendance */}
        {selectedSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div
                className="session-detail-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '20px',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <h3 style={{ fontSize: '24px', fontWeight: 800 }}>{selectedSession.name}</h3>
                    {!selectedSession.isVirtual && (
                      <>
                        <button
                          onClick={openEditModal}
                          style={{
                            background: 'var(--surface-hover)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                          title="Edit Session Details"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={handleDeleteSession}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                          title="Delete Session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '20px',
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {selectedSession.isVirtual ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} /> Time and Meet link not yet assigned
                      </span>
                    ) : (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={16} />{' '}
                          {new Date(selectedSession.startTime).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16} />{' '}
                          {new Date(selectedSession.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(selectedSession.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {selectedSession.googleMeetLink && (
                  <a
                    href={selectedSession.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Video size={16} /> Join Meeting
                  </a>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>
                    {selectedSession.attendances.length}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Registered
                  </div>
                </div>
                <div style={{ width: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                    {selectedSession.attendances.filter((a) => a.attended).length}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Attended
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '0' }}>
              <div
                style={{
                  padding: '20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Attendee List</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {selectedSession.isVirtual
                    ? 'Users who have not selected a session'
                    : 'Mark attendance manually'}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <th
                        style={{
                          padding: '16px 24px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Participant
                      </th>
                      <th
                        style={{
                          padding: '16px 20px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSession.attendances.map((att: Attendance) => (
                      <tr key={att.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                              {att.user.firstName} {att.user.lastName}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                wordBreak: 'break-all',
                                maxWidth: '200px',
                              }}
                            >
                              {att.user.email}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <button
                            disabled={selectedSession.isVirtual}
                            onClick={() => handleToggleAttendance(att.userId, !att.attended)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: selectedSession.isVirtual ? 'default' : 'pointer',
                              color: att.attended ? '#10b981' : 'var(--text-muted)',
                              opacity: selectedSession.isVirtual ? 0.5 : 1,
                            }}
                          >
                            {att.attended ? <CheckCircle size={24} /> : <CircleIcon size={24} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedSession.attendances.length === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            padding: '48px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                          }}
                        >
                          No attendees registered for this session from the waitlist.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px',
              color: 'var(--text-muted)',
            }}
          >
            <Calendar size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
            <p>Select a session to view details or mark attendance.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Session Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '32px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
                  {showModal === 'create' ? 'Schedule New Session' : 'Edit Session Details'}
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={handleSaveSession}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>
                    Session Name (Identifier)
                  </label>
                  <input
                    required
                    type="text"
                    value={sessionForm.name}
                    onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                    placeholder="e.g. Information Session #12"
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Matches 'selectedSession' in waitlist table.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Google Meet Link</label>
                  <input
                    required
                    type="url"
                    value={sessionForm.googleMeetLink}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, googleMeetLink: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  />
                </div>
                <div
                  className="flex-mobile-column"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600 }}>Start Time</label>
                    <input
                      required
                      type="datetime-local"
                      value={sessionForm.startTime}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, startTime: e.target.value })
                      }
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600 }}>End Time</label>
                    <input
                      required
                      type="datetime-local"
                      value={sessionForm.endTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(null)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: 'none',
                      background: 'var(--accent)',
                      color: 'var(--white)',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {showModal === 'create' ? 'Create Session' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CircleIcon = ({ size, color = 'currentColor' }: { size: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
)

export default Sessions
