import React, { useState, useEffect } from 'react'
import { Megaphone, Plus, Clock, Sparkles, Target, Search, Bell, Info } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Announcement {
  id: string
  title: string
  message: string
  iconType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AnnouncementsProps {
  token: string
}

const Announcements: React.FC<AnnouncementsProps> = ({ token }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDirectModal, setShowDirectModal] = useState(false)

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    iconType: 'sparkles',
  })

  const [directNotification, setDirectNotification] = useState({
    tenantId: '',
    title: '',
    message: '',
    type: 'SYSTEM',
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [token])

  const fetchAnnouncements = async () => {
    try {
      const result = await apiService.get('/admin/notifications/announcements', token)
      setAnnouncements(Array.isArray(result) ? result : result.data || [])
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch announcements', true)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiService.post('/admin/notifications/announcements', newAnnouncement, token)
      fetchAnnouncements()
      setShowCreateModal(false)
      setNewAnnouncement({ title: '', message: '', iconType: 'sparkles' })
      showToast('Announcement broadcasted successfully!')
    } catch (err) {
      console.error(err)
      showToast('Failed to create announcement', true)
    }
  }

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiService.post('/admin/notifications/direct', directNotification, token)
      setShowDirectModal(false)
      setDirectNotification({ tenantId: '', title: '', message: '', type: 'SYSTEM' })
      showToast('Direct notification sent!')
    } catch (err) {
      console.error(err)
      showToast('Failed to send notification. Ensure Tenant ID is correct.', true)
    }
  }

  const ICON_OPTIONS = [
    { value: 'sparkles', label: 'Sparkles', icon: <Sparkles size={16} /> },
    { value: 'info', label: 'Info', icon: <Info size={16} /> },
    { value: 'megaphone', label: 'Megaphone', icon: <Megaphone size={16} /> },
    { value: 'target', label: 'Target', icon: <Target size={16} /> },
    { value: 'clock', label: 'Clock', icon: <Clock size={16} /> },
  ]

  return (
    <div className="page-container fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Announcements & Notifications
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Broadcast platform updates or target specific tenants.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowDirectModal(true)}
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Bell size={18} /> Send Direct
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--accent)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={18} /> New Announcement
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px' }}>
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Announcement History</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Past broadcasts and their current status.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No announcements found.
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    backgroundColor: ann.isActive ? 'var(--accent-faint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: ann.isActive ? 'var(--accent)' : 'var(--surface-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ann.isActive ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      <Megaphone size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{ann.title}</span>
                        {ann.isActive && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--accent)',
                              color: 'white',
                              textTransform: 'uppercase',
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {ann.message}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Clock size={12} /> {new Date(ann.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Create Announcement Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                Create Platform Announcement
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                This will be shown as a popup to all tenants and override any existing active
                announcement.
              </p>

              <form
                onSubmit={handleCreateAnnouncement}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Title
                  </label>
                  <input
                    required
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                    }
                    placeholder="E.g. Maintenance Scheduled"
                    className="input"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Message Content
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newAnnouncement.message}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                    }
                    placeholder="Tell users what's happening..."
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Visual Icon
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setNewAnnouncement({ ...newAnnouncement, iconType: opt.value })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor:
                            newAnnouncement.iconType === opt.value
                              ? 'var(--accent)'
                              : 'var(--border)',
                          backgroundColor:
                            newAnnouncement.iconType === opt.value
                              ? 'var(--accent-faint)'
                              : 'var(--white)',
                          color:
                            newAnnouncement.iconType === opt.value
                              ? 'var(--accent)'
                              : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
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
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  >
                    Broadcast Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Notification Modal ── */}
      {showDirectModal && (
        <div className="modal-overlay" onClick={() => setShowDirectModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                Send Direct Notification
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                Reach a specific tenant regarding their account or a support query.
              </p>

              <form
                onSubmit={handleSendDirect}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Tenant ID
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      required
                      type="text"
                      value={directNotification.tenantId}
                      onChange={(e) =>
                        setDirectNotification({ ...directNotification, tenantId: e.target.value })
                      }
                      placeholder="Paste User/Tenant ID here"
                      className="input"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        borderRadius: '10px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Subject
                  </label>
                  <input
                    required
                    type="text"
                    value={directNotification.title}
                    onChange={(e) =>
                      setDirectNotification({ ...directNotification, title: e.target.value })
                    }
                    placeholder="E.g. Update on your support ticket"
                    className="input"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={directNotification.message}
                    onChange={(e) =>
                      setDirectNotification({ ...directNotification, message: e.target.value })
                    }
                    placeholder="Write your message..."
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDirectModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
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
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  >
                    Send Private
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

export default Announcements
