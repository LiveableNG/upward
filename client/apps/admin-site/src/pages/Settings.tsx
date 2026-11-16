import React, { useState, useEffect } from 'react'
import { Percent, Save, UserPlus } from 'lucide-react'
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

  // Platform Rates State
  const [savingsRatePct, setSavingsRatePct] = useState('14.5')
  const [insurancePremiumPct, setInsurancePremiumPct] = useState('2')
  const [ratesLoading, setRatesLoading] = useState(true)
  const [savingRates, setSavingRates] = useState(false)
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null)

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
    fetchPlatformRates()
  }, [token])

  const fetchPlatformRates = async () => {
    try {
      setRatesLoading(true)
      const result = await apiService.get('/admin/fees/rates', token)
      const data = result?.data || result
      if (data) {
        if (data.savingsAnnualRatePct !== undefined) {
          setSavingsRatePct(String(data.savingsAnnualRatePct))
        }
        if (data.insurancePremiumPct !== undefined) {
          setInsurancePremiumPct(String(data.insurancePremiumPct))
        }
        setRatesUpdatedAt(data.updatedAt || null)
      }
    } catch (err) {
      console.error('Failed to fetch platform rates', err)
    } finally {
      setRatesLoading(false)
    }
  }

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedSavings = parseFloat(savingsRatePct)
    const parsedInsurance = parseFloat(insurancePremiumPct)

    if (!Number.isFinite(parsedSavings) || parsedSavings < 0 || parsedSavings > 100) {
      showToast('Savings annual rate must be between 0% and 100%', true)
      return
    }
    if (!Number.isFinite(parsedInsurance) || parsedInsurance < 0 || parsedInsurance > 100) {
      showToast('Insurance premium percentage must be between 0% and 100%', true)
      return
    }

    try {
      setSavingRates(true)
      const result = await apiService.post(
        '/admin/fees/rates',
        {
          savingsAnnualRatePct: parsedSavings,
          insurancePremiumPct: parsedInsurance,
        },
        token,
      )
      const data = result?.data || result
      if (data?.updatedAt) setRatesUpdatedAt(data.updatedAt)
      showToast('Platform savings & insurance rates updated!')
    } catch (err: any) {
      showToast(err.message || 'Failed to update platform rates', true)
    } finally {
      setSavingRates(false)
    }
  }

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Percent size={18} style={{ color: 'var(--accent)' }} />
                Platform Rates Configuration
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Configure global Rent Savings annual yield and Rent Support Insurance premium
                percentage. Changes apply immediately across calculations and new purchases.
              </p>
            </div>
            {ratesUpdatedAt && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Last updated: {new Date(ratesUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>

          <form
            onSubmit={handleSaveRates}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              alignItems: 'end',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Rent Savings Annual Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={savingsRatePct}
                onChange={(e) => setSavingsRatePct(e.target.value)}
                className="input"
                disabled={ratesLoading || savingRates}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Insurance Premium (% of Annual Rent)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={insurancePremiumPct}
                onChange={(e) => setInsurancePremiumPct(e.target.value)}
                className="input"
                disabled={ratesLoading || savingRates}
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={ratesLoading || savingRates}
                style={{
                  height: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Save size={16} />
                {savingRates ? 'Saving...' : 'Save Rates'}
              </button>
            </div>
          </form>
        </div>

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
