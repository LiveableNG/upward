import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Activity,
  Home,
  Send,
  Edit2,
  ShieldAlert,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface UserDetailProps {
  token: string
}

interface UserDetailData {
  type: 'TENANT' | 'PENDING_TENANT'
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  isFromInvite: boolean
  isFromWaitlist: boolean
  createdAt: string
  updatedAt: string
  properties: any[]
  transactions: any[]
  supportTickets: any[]
  activityLogs: any[]
}

const UserDetail: React.FC<UserDetailProps> = ({ token }) => {
  const { uuid } = useParams<{ uuid: string }>()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserDetailData | null>(null)
  
  // Notification Form State
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  const fetchUserDetails = async () => {
    if (!uuid) return
    setLoading(true)
    try {
      const res = await apiService.get(`/admin/users/${uuid}`, token)
      setUser(res.data)
      // Initialize edit fields
      setEditFirstName(res.data.firstName || '')
      setEditLastName(res.data.lastName || '')
      setEditEmail(res.data.email || '')
      setEditPhone(res.data.phone || '')
    } catch (err) {
      console.error(err)
      showToast('Failed to load user details', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserDetails()
  }, [uuid])

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !notifTitle.trim() || !notifMessage.trim()) return

    setSendingNotif(true)
    try {
      await apiService.post(`/admin/users/${uuid}/notify`, {
        title: notifTitle,
        message: notifMessage,
      }, token)

      showToast('Notification sent successfully!')
      setNotifTitle('')
      setNotifMessage('')
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to send notification', true)
    } finally {
      setSendingNotif(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid) return

    setUpdatingProfile(true)
    try {
      await apiService.patch(`/admin/users/${uuid}`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
      }, token)

      showToast('User profile updated successfully!')
      fetchUserDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update user profile', true)
    } finally {
      setUpdatingProfile(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '128px', color: 'var(--text-muted)' }}>
        <div style={{ margin: '0 auto 12px auto' }} className="loader" />
        <span>Loading tenant audit profile...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '64px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h3>Tenant profile not found</h3>
        <Link to="/metrics" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> Return to Metrics
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      
      {/* Back & Breadcrumb header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link to="/metrics" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 style={{ margin: 0 }}>Tenant Profile</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Ecosystem Registry / {user.email}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Overview & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '84px', alignSelf: 'start' }}>
          
          {/* Identity Card */}
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-faint)',
                color: 'var(--accent)',
                fontSize: '28px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(217, 119, 87, 0.15)'
              }}
            >
              {user.firstName ? user.firstName[0] : 'U'}
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>
              {user.firstName ? `${user.firstName} ${user.lastName}` : 'Invite Pending'}
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: user.type === 'TENANT' ? 'var(--success-faint)' : 'var(--warning-faint)',
                color: user.type === 'TENANT' ? 'var(--success)' : 'var(--warning)',
                textTransform: 'uppercase'
              }}
            >
              {user.type === 'TENANT' ? 'Onboarded Tenant' : 'Shadow / Guest'}
            </span>

            {/* Profile Contact info list */}
            <div style={{ marginTop: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{user.phone || 'No phone set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Contact & In-App Notification Tool */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Send In-App Notification</h4>
            {user.type === 'PENDING_TENANT' ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                In-app notifications are not available. This user has been invited but hasn't created their password credentials.
              </p>
            ) : (
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Title</label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Enter alert title..."
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Message</label>
                  <textarea
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Type notifications detail message..."
                    className="input"
                    style={{ height: '80px', resize: 'none', padding: '8px' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '38px' }}
                >
                  <Send size={14} /> {sendingNotif ? 'Sending alert...' : 'Dispatch Message'}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Details list & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Edit Profile Details */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Edit Profile Details
            </h4>
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="section-label" style={{ marginBottom: '4px' }}>First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="section-label" style={{ marginBottom: '4px' }}>Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="section-label" style={{ marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="section-label" style={{ marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input"
                />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" disabled={updatingProfile} className="btn btn-primary" style={{ height: '38px' }}>
                  {updatingProfile ? 'Saving updates...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Properties section */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} /> Linked Tenancy Properties
            </h4>
            {user.properties && user.properties.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {user.properties.map((prop: any) => (
                  <div
                    key={prop.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', fontSize: '14px' }}>
                        {prop.pmUnit?.property?.address || prop.location?.address || 'Property Tenancy'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {prop.location?.area || prop.pmUnit?.property?.area}, {prop.location?.state || prop.pmUnit?.property?.state} •{' '}
                        {prop.pm ? (
                          <Link to={`/pms/${prop.pm.uuid}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                            {prop.pm.businessName || 'Property Manager'}
                          </Link>
                        ) : (
                          prop.company?.name || 'Upward Platform'
                        )}
                        {prop.pmUnit && ` • Unit: ${prop.pmUnit.unitName}`}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>
                        ₦{prop.rentAmount ? prop.rentAmount.toLocaleString() : '0'}
                      </span>
                      <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-muted)' }}>
                        Remaining: ₦{prop.amountRemaining ? prop.amountRemaining.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No active tenancy properties are linked to this profile.
              </p>
            )}
          </div>

          {/* Transaction Ledger */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} /> Transaction Ledger
            </h4>
            {user.transactions && user.transactions.length > 0 ? (
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Reference</th>
                      <th style={{ padding: '8px 12px' }}>Narration</th>
                      <th style={{ padding: '8px 12px' }}>Amount</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.transactions.map((tx: any) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>{tx.reference}</td>
                        <td style={{ padding: '12px' }}>{tx.narration}</td>
                        <td style={{ padding: '12px', fontWeight: 600, color: tx.status === 'SUCCESS' ? 'var(--success)' : 'var(--text-muted)' }}>
                          ₦{tx.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: tx.status === 'SUCCESS' ? 'var(--success-faint)' : 'var(--danger-faint)',
                              color: tx.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)'
                            }}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No successful transaction history recorded for this user.
              </p>
            )}
          </div>

          {/* Activity Log Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} /> App Action Logs
            </h4>
            {user.activityLogs && user.activityLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {user.activityLogs.map((log: any) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleDateString()} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>{log.description}</p>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      IP: {log.ipAddress || 'unknown'} • App: {log.app}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No recorded application events or checkins for this user.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}

export default UserDetail
