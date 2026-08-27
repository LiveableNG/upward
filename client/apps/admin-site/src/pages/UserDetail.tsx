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
  FileText,
  ChevronDown,
  ChevronUp,
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
    metrics?: {
      ptPercentage: number
      longestStreak: number
      currentStreak: number
      totalCycles: number
      historyYears: number
      discipline: number
      savingsBonus: number
      avgDaysLeadTime: number
    }
    cycles?: any[]
  }
  credibilityRequests?: Array<{
    id: number
    uuid: string
    propertyUuid: string
    propertyAddress: string
    pmDetails: {
      companyName?: string | null
      managerName?: string | null
      email?: string | null
      phone?: string | null
    }
    status: string
    sentToPmAt: string
    fulfilledAt?: string | null
    yearsOfHistory: number
    submittedRecordsCount: number
    submittedRecords: Array<{
      id: number
      uuid: string
      amountOwed: number
      amountPaid: number
      dueDate: string
      paidAt?: string | null
      status: string
      source: string
    }>
  }>
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
  const [expandedReqId, setExpandedReqId] = useState<number | null>(null)

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

        {/* Header Score Badge */}
        {user.upwardScore && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Credibility Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end', marginTop: '1px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{user.upwardScore.score}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/ {user.upwardScore.maxScore}</span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '10px',
                backgroundColor: `${user.upwardScore.color}15`,
                color: user.upwardScore.color,
                border: `1px solid ${user.upwardScore.color}30`,
              }}
            >
              {user.upwardScore.band}
            </span>
          </div>
        )}
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

            {/* Clean Score Card inside Identity block */}
            {user.upwardScore && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Credibility Score
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '8px',
                      backgroundColor: `${user.upwardScore.color}15`,
                      color: user.upwardScore.color,
                      border: `1px solid ${user.upwardScore.color}30`,
                    }}
                  >
                    {user.upwardScore.band}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {user.upwardScore.score}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    / {user.upwardScore.maxScore}
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', borderRadius: '4px', backgroundColor: 'var(--border)', marginTop: '8px', overflow: 'hidden' }}>
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

          {/* Rent History Requests & Credibility Impact */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText size={16} style={{ color: 'var(--accent)' }} /> Rent History Requests &amp; Score Impact
              </h4>
              {user.upwardScore?.metrics && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--success)',
                  }}
                >
                  {user.upwardScore.metrics.historyYears} Yrs History Included
                </span>
              )}
            </div>

            {/* Rent Score Breakdown Metrics Grid */}
            {user.upwardScore?.metrics && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  marginBottom: '20px',
                  padding: '12px',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    History Length
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                    {user.upwardScore.metrics.historyYears} yrs
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    On-Time Rate
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px', color: 'var(--success)' }}>
                    {user.upwardScore.metrics.ptPercentage.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Longest Streak
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                    {user.upwardScore.metrics.longestStreak} cycles
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Discipline
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                    {user.upwardScore.metrics.discipline.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* List of Requests */}
            {user.credibilityRequests && user.credibilityRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {user.credibilityRequests.map((req) => {
                  const isExpanded = expandedReqId === req.id
                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                              {req.pmDetails.companyName || req.pmDetails.managerName || 'Property Manager / Landlord'}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                textTransform: 'uppercase',
                                backgroundColor:
                                  req.status === 'COMPLETED'
                                    ? 'var(--success-faint)'
                                    : req.status === 'REJECTED'
                                    ? 'var(--danger-faint)'
                                    : 'var(--warning-faint)',
                                color:
                                  req.status === 'COMPLETED'
                                    ? 'var(--success)'
                                    : req.status === 'REJECTED'
                                    ? 'var(--danger)'
                                    : 'var(--warning)',
                              }}
                            >
                              {req.status === 'COMPLETED' ? 'Fulfilled' : req.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Property: <strong>{req.propertyAddress}</strong>
                          </div>
                          {req.pmDetails.email && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              PM Email: {req.pmDetails.email} {req.pmDetails.phone && `• Phone: ${req.pmDetails.phone}`}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: req.status === 'COMPLETED' ? 'var(--success)' : 'var(--text-muted)',
                              display: 'block',
                            }}
                          >
                            {req.yearsOfHistory} Yrs Received
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                            {req.submittedRecordsCount} records
                          </span>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px dashed var(--border)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <div>
                          Sent to PM:{' '}
                          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                            {new Date(req.sentToPmAt).toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          Fulfilled:{' '}
                          <strong style={{ color: req.fulfilledAt ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                            {req.fulfilledAt ? new Date(req.fulfilledAt).toLocaleString() : 'Pending Response'}
                          </strong>
                        </div>
                      </div>

                      {/* Submitted Records Expandable */}
                      {req.submittedRecords && req.submittedRecords.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: 0,
                            }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Hide Submitted Rent Records' : `View ${req.submittedRecords.length} Submitted Rent Records`}
                          </button>

                          {isExpanded && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {req.submittedRecords.map((cycle) => (
                                <div
                                  key={cycle.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--surface-hover)',
                                    border: '1px solid var(--border)',
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: 600 }}>₦{cycle.amountOwed.toLocaleString()}</span>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                                      Due: {new Date(cycle.dueDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {cycle.paidAt && (
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        Paid: {new Date(cycle.paidAt).toLocaleDateString()}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor:
                                          cycle.status.includes('ON_TIME') || cycle.status === 'PAID'
                                            ? 'var(--success-faint)'
                                            : 'var(--warning-faint)',
                                        color:
                                          cycle.status.includes('ON_TIME') || cycle.status === 'PAID'
                                            ? 'var(--success)'
                                            : 'var(--warning)',
                                      }}
                                    >
                                      {cycle.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No rent history requests have been initiated by this tenant yet.
              </p>
            )}
          </div>

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
