import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  UserPlus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Mail,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface AdminUser {
  id: string
  email: string
  role: 'ADMIN' | 'SUPERADMIN'
  createdAt: string
}

interface SettingsProps {
  token: string
  currentAdminId: string
}

// Generates a random password: mix of letters, digits, symbols
function generatePassword(length = 12): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%^&*'
  const all = lower + upper + digits + symbols
  let pw = ''
  // guarantee one of each category
  pw += lower[Math.floor(Math.random() * lower.length)]
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += digits[Math.floor(Math.random() * digits.length)]
  pw += symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = pw.length; i < length; i++) {
    pw += all[Math.floor(Math.random() * all.length)]
  }
  // shuffle
  return pw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

const Settings: React.FC<SettingsProps> = ({ token, currentAdminId }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    passwordPlain: generatePassword(),
    role: 'ADMIN',
  })
  const [error, setError] = useState('')

  // ── Confirm modal ─────────────────────────────────────────────────────────
  // We store the callback in a ref so stale-closure bugs are impossible
  const confirmCallbackRef = useRef<(() => void) | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    danger?: boolean
  }>({ show: false, title: '', message: '', danger: false })

  const openConfirm = (title: string, message: string, onConfirm: () => void, danger = false) => {
    confirmCallbackRef.current = onConfirm
    setConfirmModal({ show: true, title, message, danger })
  }

  const closeConfirm = () => setConfirmModal((p) => ({ ...p, show: false }))

  const handleConfirm = async () => {
    if (confirmCallbackRef.current) {
      await confirmCallbackRef.current()
    }
    closeConfirm()
  }
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAdmins()
  }, [token])

  const fetchAdmins = async () => {
    try {
      const result = await apiService.get('/admin/admins', token)
      setAdmins(result.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await apiService.post('/admin/admins', newAdmin, token)
      fetchAdmins()
      setShowAddModal(false)
      setNewAdmin({ email: '', passwordPlain: generatePassword(), role: 'ADMIN' })
      showToast('Admin added successfully!')
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to create admin')
      showToast(error.message || 'Failed to create admin', true)
    }
  }

  const handleDemoteAdmin = (id: string) => {
    openConfirm(
      'Demote to Administrator',
      'Are you sure you want to demote this Superadmin? They will lose access to administrative settings.',
      async () => {
        await apiService.patch(`/admin/admins/${id}/demote`, {}, token)
        fetchAdmins()
        showToast('Admin demoted to Administrator')
      },
    )
  }

  const handleDeleteAdmin = (id: string) => {
    openConfirm(
      'Remove Administrator',
      'Are you sure you want to remove this admin? They will lose all access immediately.',
      async () => {
        await apiService.delete(`/admin/admins/${id}`, token)
        fetchAdmins()
        showToast('Admin removed')
      },
      true,
    )
  }

  const handlePromoteAdmin = (id: string) => {
    openConfirm(
      'Promote to Superadmin',
      'Promote this admin to Superadmin? This gives them full access to all settings.',
      async () => {
        await apiService.patch(`/admin/admins/${id}/promote`, {}, token)
        fetchAdmins()
        showToast('Admin promoted to Superadmin!')
      },
    )
  }

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
            Portal Settings
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage administrative access and roles.
          </p>
        </div>
        <button
          onClick={() => {
            setError('')
            setNewAdmin({ email: '', passwordPlain: generatePassword(), role: 'ADMIN' })
            setShowAddModal(true)
          }}
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
          <UserPlus size={18} /> Add New Admin
        </button>
      </div>

      <div style={{ maxWidth: '900px' }}>
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Team Management</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Current administrators with access to the portal.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading administrators...
              </div>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'var(--transition)',
                    backgroundColor:
                      admin.role === 'SUPERADMIN' ? 'var(--accent-faint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        flexShrink: 0,
                        backgroundColor:
                          admin.role === 'SUPERADMIN' ? 'var(--accent)' : 'var(--surface-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: admin.role === 'SUPERADMIN' ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      <Shield size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {admin.email}
                        </span>
                        {admin.id === currentAdminId && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              textTransform: 'uppercase',
                            }}
                          >
                            You
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              admin.role === 'SUPERADMIN' ? 'var(--accent)' : 'var(--border)',
                            color: admin.role === 'SUPERADMIN' ? 'white' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {admin.role}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Clock size={12} /> Joined {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {admin.role === 'ADMIN' && (
                      <button
                        onClick={() => handlePromoteAdmin(admin.id)}
                        title="Promote to Superadmin"
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                      >
                        <ArrowUpCircle size={16} />
                        <span className="desktop-only">Promote</span>
                      </button>
                    )}
                    {admin.role === 'SUPERADMIN' && admin.id !== currentAdminId && (
                      <button
                        onClick={() => handleDemoteAdmin(admin.id)}
                        title="Demote to Admin"
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                      >
                        <ArrowDownCircle size={16} />
                        <span className="desktop-only">Demote</span>
                      </button>
                    )}
                    {admin.id !== currentAdminId && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        title="Remove Admin"
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#dc2626'
                          e.currentTarget.style.color = '#dc2626'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                      >
                        <Trash2 size={16} />
                        <span className="desktop-only">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Add Admin Modal ── */}
      {showAddModal && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'flex-start', paddingTop: '80px' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--accent-faint)',
                    border: '1px solid var(--accent-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    Add Administrative User
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                    They'll receive login credentials via email.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleCreateAdmin}
                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
              >
                {error && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
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
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      placeholder="admin@example.com"
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 38px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                {/* Temp Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewAdmin((p) => ({ ...p, passwordPlain: generatePassword() }))
                      }
                      title="Generate new password"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={13} /> Regenerate
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={newAdmin.passwordPlain}
                      onChange={(e) => setNewAdmin({ ...newAdmin, passwordPlain: e.target.value })}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '11px 42px 11px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: '14px',
                        fontFamily: showPassword ? 'inherit' : 'monospace',
                        letterSpacing: showPassword ? 'normal' : '0.15em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Auto-generated. Admin must change this on first login.
                  </p>
                </div>

                {/* Role */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Initial Role
                  </label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    style={{
                      padding: '11px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="ADMIN">Administrator</option>
                    <option value="SUPERADMIN">Super Administrator</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
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
                      fontSize: '14px',
                    }}
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={closeConfirm}>
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: confirmModal.danger ? '#fee2e2' : 'var(--accent-faint)',
                  color: confirmModal.danger ? '#dc2626' : 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <AlertCircle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                {confirmModal.title}
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  marginBottom: '28px',
                  lineHeight: 1.6,
                }}
              >
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={closeConfirm}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: confirmModal.danger ? '#dc2626' : 'var(--accent)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
