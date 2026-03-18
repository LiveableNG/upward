import React, { useState, useEffect } from 'react'
import { Shield, UserPlus, Trash2, ArrowUpCircle, Mail, Clock, AlertCircle } from 'lucide-react'
import { apiService } from '../services/api.service'

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

const Settings: React.FC<SettingsProps> = ({ token, currentAdminId }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ email: '', passwordPlain: '', role: 'ADMIN' })
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ show: false, title: '', message: '', onConfirm: () => {} })

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
      setNewAdmin({ email: '', passwordPlain: '', role: 'ADMIN' })
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to create admin')
    }
  }

  const handleDeleteAdmin = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Remove Administrator',
      message: 'Are you sure you want to remove this admin? They will lose all access immediately.',
      onConfirm: async () => {
        try {
          await apiService.delete(`/admin/admins/${id}`, token)
          fetchAdmins()
          setConfirmModal((prev) => ({ ...prev, show: false }))
        } catch (err) {
          console.error(err)
        }
      },
    })
  }

  const handlePromoteAdmin = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Promote to Superadmin',
      message: 'Promote this admin to Superadmin? This gives them full access to all settings.',
      onConfirm: async () => {
        try {
          await apiService.patch(`/admin/admins/${id}/promote`, {}, token)
          fetchAdmins()
          setConfirmModal((prev) => ({ ...prev, show: false }))
        } catch (err) {
          console.error(err)
        }
      },
    })
  }

  return (
    <div className="page-container fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Portal Settings
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage administrative access and roles.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
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
                    padding: '24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition)',
                    backgroundColor:
                      admin.role === 'SUPERADMIN' ? 'var(--accent-faint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
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
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{admin.email}</span>
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
                          gap: '12px',
                          marginTop: '4px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Joined{' '}
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {admin.role === 'ADMIN' && (
                      <button
                        onClick={() => handlePromoteAdmin(admin.id)}
                        title="Promote to Superadmin"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <ArrowUpCircle size={20} />
                      </button>
                    )}
                    {admin.role !== 'SUPERADMIN' && admin.id !== currentAdminId && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        title="Remove Admin"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                Add Administrative User
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                New admins will receive access to the portal immediately.
              </p>

              <form
                onSubmit={handleCreateAdmin}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
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
                    }}
                  >
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
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
                        padding: '12px 12px 12px 40px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Temporary Password</label>
                  <input
                    required
                    type="password"
                    value={newAdmin.passwordPlain}
                    onChange={(e) => setNewAdmin({ ...newAdmin, passwordPlain: e.target.value })}
                    placeholder="••••••••"
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Initial Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  >
                    <option value="ADMIN">Administrator</option>
                    <option value="SUPERADMIN">Super Administrator</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        >
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
                  background: 'var(--accent-faint)',
                  color: 'var(--accent)',
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
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--accent)',
                    color: 'white',
                    fontWeight: 600,
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
