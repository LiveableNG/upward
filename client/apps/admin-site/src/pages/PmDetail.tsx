import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Activity,
  Home,
  Send,
  Edit2,
  Users,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface PmDetailProps {
  token: string
}

interface PmDetailData {
  type: 'PM'
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
  properties: any[]
  tenants: any[]
  rentPayments: any[]
  activityLogs: any[]
}

const PmDetail: React.FC<PmDetailProps> = ({ token }) => {
  const { uuid } = useParams<{ uuid: string }>()
  const [loading, setLoading] = useState(true)
  const [pm, setPm] = useState<PmDetailData | null>(null)

  // Notification Form State
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBusinessName, setEditBusinessName] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  const fetchPmDetails = async () => {
    if (!uuid) return
    setLoading(true)
    try {
      const res = await apiService.get(`/admin/pms/${uuid}`, token)
      setPm(res.data)
      // Initialize edit fields
      setEditFirstName(res.data.firstName || '')
      setEditLastName(res.data.lastName || '')
      setEditEmail(res.data.email || '')
      setEditPhone(res.data.phone || '')
      setEditBusinessName(res.data.businessName || '')
    } catch (err) {
      console.error(err)
      showToast('Failed to load property manager details', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPmDetails()
  }, [uuid])

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !notifTitle.trim() || !notifMessage.trim()) return

    setSendingNotif(true)
    try {
      await apiService.post(`/admin/pms/${uuid}/notify`, {
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
      await apiService.patch(`/admin/pms/${uuid}`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        businessName: editBusinessName,
      }, token)

      showToast('Property manager profile updated successfully!')
      fetchPmDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update property manager', true)
    } finally {
      setUpdatingProfile(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '128px', color: 'var(--text-muted)' }}>
        <div style={{ margin: '0 auto 12px auto' }} className="loader" />
        <span>Loading property manager profile...</span>
      </div>
    )
  }

  if (!pm) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '64px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h3>Property Manager not found</h3>
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
          <h2 style={{ margin: 0 }}>Property Manager Detail</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Ecosystem Registry / {pm.businessName || 'Property Manager'} • {pm.email}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Overview & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Identity Card */}
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                color: '#6366f1',
                fontSize: '28px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(99, 102, 241, 0.15)'
              }}
            >
              {pm.businessName ? pm.businessName[0] : 'PM'}
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>
              {pm.businessName || `${pm.firstName} ${pm.lastName}`}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  color: '#6366f1',
                  textTransform: 'uppercase'
                }}
              >
                Upward PM
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: pm.isVerified ? 'var(--success-faint)' : 'var(--danger-faint)',
                  color: pm.isVerified ? 'var(--success)' : 'var(--danger)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {pm.isVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {pm.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            {/* Profile Contact info list */}
            <div style={{ marginTop: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Contact Manager: {pm.firstName} {pm.lastName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{pm.phone || 'No phone set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span>Manager since {new Date(pm.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Contact & In-App Notification Tool */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Send In-App Notification</h4>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '38px', backgroundColor: '#6366f1', borderColor: '#6366f1' }}
              >
                <Send size={14} /> {sendingNotif ? 'Sending alert...' : 'Dispatch Message'}
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Details list & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Edit Profile Details */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Edit Manager Profile Details
            </h4>
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="section-label" style={{ marginBottom: '4px' }}>Business Name</label>
                <input
                  type="text"
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="input"
                  required
                />
              </div>
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
                <button type="submit" disabled={updatingProfile} className="btn btn-primary" style={{ height: '38px', backgroundColor: '#6366f1', borderColor: '#6366f1' }}>
                  {updatingProfile ? 'Saving updates...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Managed Properties & Units */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} /> Managed Real Estate Properties
            </h4>
            {pm.properties && pm.properties.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pm.properties.map((prop: any) => (
                  <div
                    key={prop.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <span style={{ fontWeight: 700, display: 'block', fontSize: '14px', color: 'var(--text)' }}>
                      {prop.address || 'Property Listing'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                      Currency: {prop.currency} • Subaccount: {prop.subaccountId || 'None linked'}
                    </span>
                    
                    {/* Units list */}
                    {prop.units && prop.units.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {prop.units.map((unit: any) => (
                          <div
                            key={unit.id}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--white)',
                              border: '1px solid var(--border)',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            Unit {unit.name || unit.id}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No units added to this property yet.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No active properties listed under this manager.
              </p>
            )}
          </div>

          {/* Invited Tenants Directory */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Decrypted Tenant Registry
            </h4>
            {pm.tenants && pm.tenants.length > 0 ? (
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Phone</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pm.tenants.map((tenant: any) => (
                      <tr key={tenant.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>
                          <Link to={`/users/${tenant.uuid}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                            {tenant.firstName ? `${tenant.firstName} ${tenant.lastName}` : 'Invite Placeholder'}
                          </Link>
                        </td>
                        <td style={{ padding: '12px' }}>{tenant.email}</td>
                        <td style={{ padding: '12px' }}>{tenant.phone || '—'}</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: tenant.inviteStatus === 'ACCEPTED' ? 'var(--success-faint)' : 'var(--warning-faint)',
                              color: tenant.inviteStatus === 'ACCEPTED' ? 'var(--success)' : 'var(--warning)'
                            }}
                          >
                            {tenant.inviteStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No tenants have been invited or registered by this manager yet.
              </p>
            )}
          </div>

          {/* Activity Log Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} /> App Action Logs
            </h4>
            {pm.activityLogs && pm.activityLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {pm.activityLogs.map((log: any) => (
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
                No recorded application events or logins for this manager.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}

export default PmDetail
