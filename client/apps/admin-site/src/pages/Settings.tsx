import React, { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { AdminTable, type AdminUser } from '../features/settings/components/AdminTable'
import { AddAdminModal } from '../features/settings/components/AddAdminModal'
import { EditAdminModal } from '../features/settings/components/EditAdminModal'
import { useConfirm } from '../components/common/modal/ConfirmModal'

interface SettingsProps {
  token: string
  currentAdminId: string
}

const Settings: React.FC<SettingsProps> = ({ token, currentAdminId }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  // Add Admin State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit Admin State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<{
    id: string
    email: string
    phone: string
    receivesSystemAlerts: boolean
  } | null>(null)
  const [editError, setEditError] = useState('')

  const { confirm } = useConfirm()

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

  const handleCreateAdmin = async (newAdmin: {
    email: string
    passwordPlain: string
    role: string
  }) => {
    setAddError('')
    try {
      await apiService.post('/admin/admins', newAdmin, token)
      fetchAdmins()
      setShowAddModal(false)
      showToast('Admin added successfully!')
    } catch (err: any) {
      setAddError(err.message || 'Failed to create admin')
      showToast(err.message || 'Failed to create admin', true)
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    const isConfirmed = await confirm({
      title: 'Change Admin Role',
      message: `Are you sure you want to change this admin's role to ${newRole}?`,
    })

    if (isConfirmed) {
      try {
        await apiService.patch(`/admin/admins/${id}/role`, { role: newRole }, token)
        fetchAdmins()
        showToast(`Admin role changed to ${newRole}`)
      } catch (err: any) {
        showToast(err.message || 'Failed to change role', true)
      }
    }
  }

  const handleEditAdmin = async (formData: { phone: string; receivesSystemAlerts: boolean }) => {
    if (!editingAdmin) return
    setEditError('')
    try {
      await apiService.patch(
        `/admin/admins/${editingAdmin.id}/details`,
        {
          phone: formData.phone || null,
          receivesSystemAlerts: formData.receivesSystemAlerts,
        },
        token,
      )
      fetchAdmins()
      setShowEditModal(false)
      showToast('Admin details updated successfully!')
    } catch (err: any) {
      setEditError(err.message || 'Failed to update admin details')
      showToast(err.message || 'Failed to update admin details', true)
    }
  }

  const handleRemoveAdmin = async (admin: AdminUser) => {
    const isConfirmed = await confirm({
      title: 'Remove Administrator',
      message: 'Are you sure you want to remove this admin?',
      danger: true,
    })

    if (isConfirmed) {
      try {
        await apiService.delete(`/admin/admins/${admin.id}`, token)
        fetchAdmins()
        showToast('Admin removed')
      } catch (err: any) {
        showToast(err.message || 'Failed to remove admin', true)
      }
    }
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
              setAddError('')
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

          <AdminTable
            admins={admins}
            loading={loading}
            currentAdminId={currentAdminId}
            isDeveloper={isDeveloper}
            onRoleChange={handleRoleChange}
            onEdit={(admin) => {
              setEditError('')
              setEditingAdmin({
                id: admin.id,
                email: admin.email,
                phone: admin.phone || '',
                receivesSystemAlerts: !!admin.receivesSystemAlerts,
              })
              setShowEditModal(true)
            }}
            onRemove={handleRemoveAdmin}
          />
        </div>
      </div>

      <AddAdminModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateAdmin}
        error={addError}
      />

      <EditAdminModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditAdmin}
        admin={editingAdmin}
        error={editError}
      />
    </div>
  )
}

export default Settings
