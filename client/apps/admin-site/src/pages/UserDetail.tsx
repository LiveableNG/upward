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
  User,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { useAuth } from '../contexts/AuthContext'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'

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
  upwardScore?: {
    score: number
    maxScore: number
    band: string
    color: string
  }
  savingsWalletEnabled?: boolean
  isFromInvite: boolean
  isFromWaitlist: boolean
  invitedAt?: string | null
  joinedAt?: string | null
  createdAt: string
  updatedAt: string
  properties: any[]
  transactions: any[]
  supportTickets: any[]
  activityLogs: any[]
}

const UserDetail: React.FC<UserDetailProps> = ({ token }) => {
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const isDeveloper = auth?.user?.role === 'DEVELOPER'
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

  // Savings Wallet
  const [updatingSavingsWallet, setUpdatingSavingsWallet] = useState(false)

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
      await apiService.post(
        `/admin/users/${uuid}/notify`,
        {
          title: notifTitle,
          message: notifMessage,
        },
        token,
      )

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
      await apiService.patch(
        `/admin/users/${uuid}`,
        {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone,
        },
        token,
      )

      showToast('User profile updated successfully!')
      fetchUserDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update user profile', true)
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleToggleSavingsWallet = async () => {
    if (!uuid || !user) return
    setUpdatingSavingsWallet(true)
    try {
      const nextEnabled = !user.savingsWalletEnabled
      await apiService.patch(`/admin/savings-wallet/users/${uuid}`, { enabled: nextEnabled }, token)
      showToast(
        nextEnabled ? 'Savings wallet enabled (₦1,000 prefunded)' : 'Savings wallet disabled',
      )
      fetchUserDetails()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update savings wallet status', true)
    } finally {
      setUpdatingSavingsWallet(false)
    }
  }

  const transactionColumns: ColumnDef<any>[] = [
    {
      key: 'reference',
      label: 'Reference',
      render: (tx) => tx.reference,
    },
    {
      key: 'narration',
      label: 'Narration',
      render: (tx) => tx.narration,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (tx) => (
        <span
          style={{
            fontWeight: 600,
            color: tx.status === 'SUCCESS' ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          ₦{tx.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (tx) => (
        <span
          className="badge"
          style={{
            backgroundColor:
              tx.status === 'SUCCESS' ? 'var(--success-faint)' : 'var(--danger-faint)',
            color: tx.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {tx.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (tx) => (
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date(tx.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

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
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/metrics" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
          </Link>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Tenant Profile
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Ecosystem Registry / {user.email}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Overview & Quick Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'sticky',
            top: '84px',
            alignSelf: 'start',
          }}
        >
          {/* Upward Score Widget */}
          {user.upwardScore && (
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
                  Upward Rent Credibility Score
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: `${user.upwardScore.color}22`,
                    color: user.upwardScore.color,
                    border: `1px solid ${user.upwardScore.color}44`,
                  }}
                >
                  {user.upwardScore.band}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {user.upwardScore.score}
                </span>
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                  / {user.upwardScore.maxScore}
                </span>
              </div>

              <div style={{ width: '100%', height: '6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: '12px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, ((user.upwardScore.score - 300) / 600) * 100))}%`,
                    height: '100%',
                    backgroundColor: user.upwardScore.color,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )}

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
                border: '1px solid rgba(217, 119, 87, 0.15)',
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
                backgroundColor:
                  user.type === 'TENANT' ? 'var(--success-faint)' : 'var(--warning-faint)',
                color: user.type === 'TENANT' ? 'var(--success)' : 'var(--warning)',
                textTransform: 'uppercase',
              }}
            >
              {user.type === 'TENANT' ? 'Onboarded Tenant' : 'Shadow / Guest'}
            </span>

            {/* Profile Contact info list */}
            <div
              style={{
                marginTop: '24px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{user.email}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{user.phone || 'No phone set'}</span>
              </div>
              {user.invitedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Invited on {new Date(user.invitedAt).toLocaleDateString()}</span>
                </div>
              )}
              {user.joinedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} style={{ color: 'var(--success)' }} />
                  <span>Joined on {new Date(user.joinedAt).toLocaleDateString()}</span>
                </div>
              )}
              {!user.invitedAt && !user.joinedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Savings Wallet */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Savings wallet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 12px 0' }}>
              Enable per tenant. First-time enablement prefunds ₦1,000 automatically.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Status:{' '}
                <span
                  style={{
                    fontWeight: 700,
                    color: user.savingsWalletEnabled ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  {user.savingsWalletEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingSavingsWallet || user.type === 'PENDING_TENANT'}
                className="btn btn-primary"
                onClick={handleToggleSavingsWallet}
                style={{ height: '38px' }}
              >
                {updatingSavingsWallet
                  ? 'Updating...'
                  : user.savingsWalletEnabled
                    ? 'Disable'
                    : 'Enable'}
              </button>
            </div>
            {user.type === 'PENDING_TENANT' ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '10px 0 0 0' }}>
                This profile is pending; enable after the user is onboarded.
              </p>
            ) : null}
          </div>

          {/* Contact & In-App Notification Tool */}
          <div className="card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Send In-App Notification</h4>
            {user.type === 'PENDING_TENANT' ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                In-app notifications are not available. This user has been invited but hasn't
                created their password credentials.
              </p>
            ) : (
              <form
                onSubmit={handleSendNotification}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Title
                  </label>
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Message
                  </label>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '38px',
                  }}
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
          {isDeveloper && (
            <div className="card" style={{ padding: '24px' }}>
              <h4
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Edit2 size={16} /> Edit Profile Details
              </h4>
              <form
                onSubmit={handleUpdateProfile}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
              >
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="input"
                  />
                </div>
                <div
                  style={{
                    gridColumn: 'span 2',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                  }}
                >
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="btn btn-primary"
                    style={{ height: '38px' }}
                  >
                    {updatingProfile ? 'Saving updates...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Properties section */}
          <div className="card" style={{ padding: '24px' }}>
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Home size={16} /> Linked Tenancy Properties
            </h4>
            {user.properties && user.properties.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
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
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', fontSize: '14px' }}>
                        {prop.pmUnit?.property?.address ||
                          prop.location?.address ||
                          'Property Tenancy'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                        {[
                          prop.location?.subarea,
                          prop.location?.area || prop.pmUnit?.property?.area,
                          prop.location?.state || prop.pmUnit?.property?.state,
                          prop.location?.country
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        Managed by:{' '}
                        {prop.pm ? (
                          <Link
                            to={`/pms/${prop.pm.uuid}`}
                            style={{
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {prop.pm.businessName || 'Property Manager'}
                          </Link>
                        ) : (
                          prop.company?.name || 'Upward Platform'
                        )}
                        {prop.pmUnit && ` • Unit: ${prop.pmUnit.unitName}`}
                      </span>

                      {(prop.externalPropertyId || prop.externalUnitId) && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {prop.externalPropertyId && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              fontFamily: 'monospace'
                            }}>
                              Ext Prop: {prop.externalPropertyId}
                            </span>
                          )}
                          {prop.externalUnitId && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              fontFamily: 'monospace'
                            }}>
                              Ext Unit: {prop.externalUnitId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>
                        ₦{prop.rentAmount ? prop.rentAmount.toLocaleString() : '0'}
                      </span>
                      <span
                        style={{ fontSize: '11px', display: 'block', color: 'var(--text-muted)' }}
                      >
                        Remaining: ₦
                        {prop.amountRemaining ? prop.amountRemaining.toLocaleString() : '0'}
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
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <DollarSign size={16} /> Transaction Ledger
            </h4>
            <DataTable
              data={user.transactions || []}
              columns={transactionColumns}
              emptyTitle="No successful transaction history recorded for this user."
              keyExtractor={(tx) => tx.id.toString()}
            />
          </div>

          {/* Activity Log Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Activity size={16} /> App Action Logs
            </h4>
            {user.activityLogs && user.activityLogs.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {user.activityLogs.map((log: any) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleDateString()} •{' '}
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
                      {log.description}
                    </p>
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
