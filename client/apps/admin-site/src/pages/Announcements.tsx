import React, { useState, useEffect } from 'react'
import { Megaphone, Plus, Clock, Sparkles, Target, Search, Bell, Info } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface Announcement {
  id: string
  title: string
  message: string
  iconType: string
  url?: string
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
    url: '',
  })

  const [directNotification, setDirectNotification] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'SYSTEM',
  })

  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{id: string, name: string, email: string}[]>([])

  useEffect(() => {
    fetchAnnouncements()
  }, [token])

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query)
    setDirectNotification(prev => ({ ...prev, userId: '' })) // Clear selection if typing
    
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }

    try {
      const result = await apiService.get(`/admin/users/search?q=${encodeURIComponent(query)}`, token)
      setUserSearchResults(result.data || [])
    } catch (err) {
      console.error('User search failed', err)
    }
  }

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
      setNewAnnouncement({ title: '', message: '', iconType: 'sparkles', url: '' })
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
      setDirectNotification({ userId: '', title: '', message: '', type: 'SYSTEM' })
      setUserSearchQuery('')
      setUserSearchResults([])
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
                    Action URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newAnnouncement.url || ''}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, url: e.target.value })
                    }
                    placeholder="https://example.com"
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
                    Recipient Tenant
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
                      value={userSearchQuery}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="input"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        borderRadius: '10px',
                        borderColor: directNotification.userId ? 'var(--success)' : 'var(--border)'
                      }}
                    />
                    
                    {userSearchResults.length > 0 && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        backgroundColor: 'white', 
                        border: '1px solid var(--border)', 
                        borderRadius: '10px', 
                        marginTop: '4px', 
                        boxShadow: 'var(--shadow-lg)', 
                        zIndex: 10,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {userSearchResults.map(user => (
                          <div 
                            key={user.id} 
                            onClick={() => {
                              setDirectNotification({ ...directNotification, userId: user.id })
                              setUserSearchQuery(`${user.name} (${user.email})`)
                              setUserSearchResults([])
                            }}
                            style={{ 
                              padding: '12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid var(--border)',
                              transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
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
