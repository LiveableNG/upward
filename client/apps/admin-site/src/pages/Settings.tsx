import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  UserPlus,
  Trash2,
  Mail,
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
  role: 'SUPERADMIN' | 'CUSTOMER_SUPPORT' | 'DEVELOPER'
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

  const handleRoleChange = (id: string, newRole: string) => {
    openConfirm(
      'Change Admin Role',
      `Are you sure you want to change this admin's role to ${newRole}?`,
      async () => {
        try {
          await apiService.patch(`/admin/admins/${id}/role`, { role: newRole }, token)
          fetchAdmins()
          showToast(`Admin role changed to ${newRole}`)
        } catch (err: any) {
          showToast(err.message || 'Failed to change role', true)
        }
      },
    )
  }

  const isDeveloper = admins.find((a) => a.id === currentAdminId)?.role === 'DEVELOPER'

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
        {isDeveloper && (
          <button
            onClick={() => {
              setError('')
              setNewAdmin({ email: '', passwordPlain: generatePassword(), role: 'CUSTOMER_SUPPORT' })
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
        )}
      </div>

      <div>
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Team Management</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Current administrators with access to the portal.
            </p>
          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Admin</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading administrators...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No administrators found.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr
                        key={admin.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: admin.role === 'DEVELOPER' ? 'var(--accent-faint)' : 'transparent',
                          transition: 'var(--transition)'
                        }}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: admin.role === 'DEVELOPER' ? 'var(--accent)' : 'var(--surface-hover)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: admin.role === 'DEVELOPER' ? 'white' : 'var(--text-muted)',
                              }}
                            >
                              <Shield size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{admin.email}</span>
                              {admin.id === currentAdminId && (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>YOU</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span
                            className={`badge ${admin.role === 'DEVELOPER' ? 'badge-warning' : admin.role === 'SUPERADMIN' ? 'badge-success' : 'badge-secondary'}`}
                            style={{ 
                              backgroundColor: admin.role === 'DEVELOPER' ? 'var(--accent-faint)' : admin.role === 'SUPERADMIN' ? '#e0f2fe' : 'var(--surface-hover)',
                              color: admin.role === 'DEVELOPER' ? 'var(--accent)' : admin.role === 'SUPERADMIN' ? '#0369a1' : 'var(--text-muted)'
                            }}
                          >
                            {admin.role}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          {isDeveloper && admin.role !== 'DEVELOPER' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <select
                                className="input"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                                value={admin.role}
                                onChange={(e) => handleRoleChange(admin.id, e.target.value)}
                              >
                                <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
                                <option value="SUPERADMIN">SUPERADMIN</option>
                              </select>
                              <button
                                onClick={() => openConfirm('Remove Administrator', 'Are you sure you want to remove this admin?', async () => {
                                  await apiService.delete(`/admin/admins/${admin.id}`, token)
                                  fetchAdmins()
                                  showToast('Admin removed')
                                }, true)}
                                title="Remove Admin"
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', color: '#dc2626' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                    className="input"
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    style={{
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    <option value="CUSTOMER_SUPPORT">Customer Support</option>
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
