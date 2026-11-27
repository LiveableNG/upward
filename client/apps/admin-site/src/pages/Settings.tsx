import React, { useState, useEffect } from 'react'
import { Percent, Power, RotateCcw, Save, UserPlus } from 'lucide-react'
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

const DEFAULT_PLATFORM_RATES = {
  savingsAnnualRatePct: 16,
  flexibleSavingsAnnualRatePct: 12,
  rentProtecRatePct: 10,
  insurancePremiumPct: 2,
  rentProtecMinMonths: 6,
  maxSavingsMonths: 11,
}

const Settings: React.FC<SettingsProps> = ({ token, currentAdminId }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  // Platform Rates State
  const [savingsEnabled, setSavingsEnabled] = useState(true)
  const [savingsMode, setSavingsMode] = useState<'COMING_SOON' | 'OPT_IN_ONLY' | 'LIVE'>('LIVE')
  const [togglingSavings, setTogglingSavings] = useState(false)
  const [savingsRatePct, setSavingsRatePct] = useState('16')
  const [flexibleSavingsRatePct, setFlexibleSavingsRatePct] = useState('12')
  const [rentProtecRatePct, setRentProtecRatePct] = useState('10')
  const [insurancePremiumPct, setInsurancePremiumPct] = useState('2')
  const [rentProtecMinMonths, setRentProtecMinMonths] = useState('6')
  const [maxSavingsMonths, setMaxSavingsMonths] = useState('11')
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
        if (data.savingsMode) {
          setSavingsMode(data.savingsMode)
          setSavingsEnabled(data.savingsMode !== 'COMING_SOON')
        } else if (data.savingsEnabled !== undefined) {
          setSavingsEnabled(Boolean(data.savingsEnabled))
          setSavingsMode(data.savingsEnabled ? 'LIVE' : 'COMING_SOON')
        }
        if (data.savingsAnnualRatePct !== undefined) {
          setSavingsRatePct(String(data.savingsAnnualRatePct))
        }
        if (data.flexibleSavingsAnnualRatePct !== undefined) {
          setFlexibleSavingsRatePct(String(data.flexibleSavingsAnnualRatePct))
        }
        if (data.rentProtecRatePct !== undefined) {
          setRentProtecRatePct(String(data.rentProtecRatePct))
        }
        if (data.insurancePremiumPct !== undefined) {
          setInsurancePremiumPct(String(data.insurancePremiumPct))
        }
        if (data.rentProtecMinMonths !== undefined) {
          setRentProtecMinMonths(String(data.rentProtecMinMonths))
        }
        if (data.maxSavingsMonths !== undefined) {
          setMaxSavingsMonths(String(data.maxSavingsMonths))
        }
        setRatesUpdatedAt(data.updatedAt || null)
      }
    } catch (err) {
      console.error('Failed to fetch platform rates', err)
    } finally {
      setRatesLoading(false)
    }
  }

  const persistPlatformRates = async (
    payload: {
      savingsEnabled: boolean
      savingsAnnualRatePct: number
      flexibleSavingsAnnualRatePct: number
      rentProtecRatePct: number
      insurancePremiumPct: number
      rentProtecMinMonths: number
      maxSavingsMonths: number
    },
    successMessage: string,
  ) => {
    try {
      setSavingRates(true)
      const result = await apiService.post('/admin/fees/rates', payload, token)
      const data = result?.data || result
      if (data?.updatedAt) setRatesUpdatedAt(data.updatedAt)
      showToast(successMessage)
    } catch (err: any) {
      showToast(err.message || 'Failed to update platform rates', true)
    } finally {
      setSavingRates(false)
    }
  }

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedSavings = parseFloat(savingsRatePct)
    const parsedFlexibleSavings = parseFloat(flexibleSavingsRatePct)
    const parsedRentProtec = parseFloat(rentProtecRatePct)
    const parsedInsurance = parseFloat(insurancePremiumPct)
    const parsedMinMonths = parseInt(rentProtecMinMonths, 10)
    const parsedMaxMonths = parseInt(maxSavingsMonths, 10)

    if (!Number.isFinite(parsedSavings) || parsedSavings < 0 || parsedSavings > 100) {
      showToast('Save & Earn Full Lock annual rate must be between 0% and 100%', true)
      return
    }
    if (
      !Number.isFinite(parsedFlexibleSavings) ||
      parsedFlexibleSavings < 0 ||
      parsedFlexibleSavings > 100
    ) {
      showToast('Save & Earn Flexible annual rate must be between 0% and 100%', true)
      return
    }
    if (!Number.isFinite(parsedRentProtec) || parsedRentProtec < 0 || parsedRentProtec > 100) {
      showToast('Rent Protec annual rate must be between 0% and 100%', true)
      return
    }
    if (!Number.isFinite(parsedInsurance) || parsedInsurance < 0 || parsedInsurance > 100) {
      showToast('Insurance premium percentage must be between 0% and 100%', true)
      return
    }
    if (!Number.isFinite(parsedMinMonths) || parsedMinMonths < 1 || parsedMinMonths > 12) {
      showToast('Rent Protec minimum months must be between 1 and 12', true)
      return
    }
    if (!Number.isFinite(parsedMaxMonths) || parsedMaxMonths < 1 || parsedMaxMonths > 11) {
      showToast('Max savings horizon must be between 1 and 11 months', true)
      return
    }

    await persistPlatformRates(
      {
        savingsEnabled,
        savingsAnnualRatePct: parsedSavings,
        flexibleSavingsAnnualRatePct: parsedFlexibleSavings,
        rentProtecRatePct: parsedRentProtec,
        insurancePremiumPct: parsedInsurance,
        rentProtecMinMonths: parsedMinMonths,
        maxSavingsMonths: parsedMaxMonths,
      },
      'Platform savings & insurance rates updated!',
    )
  }

  const handleResetDefaultRates = async () => {
    setSavingsRatePct(String(DEFAULT_PLATFORM_RATES.savingsAnnualRatePct))
    setFlexibleSavingsRatePct(String(DEFAULT_PLATFORM_RATES.flexibleSavingsAnnualRatePct))
    setRentProtecRatePct(String(DEFAULT_PLATFORM_RATES.rentProtecRatePct))
    setInsurancePremiumPct(String(DEFAULT_PLATFORM_RATES.insurancePremiumPct))
    setRentProtecMinMonths(String(DEFAULT_PLATFORM_RATES.rentProtecMinMonths))
    setMaxSavingsMonths(String(DEFAULT_PLATFORM_RATES.maxSavingsMonths))

    await persistPlatformRates(
      {
        savingsEnabled,
        ...DEFAULT_PLATFORM_RATES,
      },
      'Platform rates reset to defaults (16% locked / 12% flexible / 10% Rent Protec / 2%).',
    )
  }

  const handleChangeSavingsMode = async (
    nextMode: 'COMING_SOON' | 'OPT_IN_ONLY' | 'LIVE',
  ) => {
    try {
      setTogglingSavings(true)
      const result = await apiService.post(
        '/admin/fees/rates',
        { savingsMode: nextMode, savingsEnabled: nextMode !== 'COMING_SOON' },
        token,
      )
      const data = result?.data || result
      setSavingsMode(nextMode)
      setSavingsEnabled(nextMode !== 'COMING_SOON')
      if (data?.updatedAt) setRatesUpdatedAt(data.updatedAt)
      showToast(
        nextMode === 'LIVE'
          ? 'Rent Savings is now LIVE for deposits!'
          : nextMode === 'OPT_IN_ONLY'
            ? 'Rent Savings set to OPT-IN & KYC ONLY mode for activation events.'
            : 'Rent Savings set to COMING SOON (paused).',
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to update Rent Savings mode', true)
    } finally {
      setTogglingSavings(false)
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border:
                savingsMode === 'LIVE'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : savingsMode === 'OPT_IN_ONLY'
                    ? '1px solid rgba(217, 119, 6, 0.35)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
              background:
                savingsMode === 'LIVE'
                  ? 'rgba(16, 185, 129, 0.06)'
                  : savingsMode === 'OPT_IN_ONLY'
                    ? 'rgba(217, 119, 6, 0.06)'
                    : 'rgba(239, 68, 68, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Power
                size={18}
                style={{
                  color:
                    savingsMode === 'LIVE'
                      ? '#059669'
                      : savingsMode === 'OPT_IN_ONLY'
                        ? '#d97706'
                        : '#dc2626',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Rent Savings Launch Mode
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background:
                        savingsMode === 'LIVE'
                          ? 'rgba(16, 185, 129, 0.16)'
                          : savingsMode === 'OPT_IN_ONLY'
                            ? 'rgba(217, 119, 6, 0.16)'
                            : 'rgba(239, 68, 68, 0.16)',
                      color:
                        savingsMode === 'LIVE'
                          ? '#047857'
                          : savingsMode === 'OPT_IN_ONLY'
                            ? '#b45309'
                            : '#b91c1c',
                    }}
                  >
                    {savingsMode === 'LIVE'
                      ? 'LIVE FOR DEPOSITS'
                      : savingsMode === 'OPT_IN_ONLY'
                        ? 'OPT-IN & KYC ONLY'
                        : 'COMING SOON (OFF)'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  {savingsMode === 'LIVE'
                    ? 'Users can onboard, open a vault, and make live ARM deposits.'
                    : savingsMode === 'OPT_IN_ONLY'
                      ? 'Activation mode: users can pick a plan, complete ARM KYC & consent, and receive cashback while deposits remain paused.'
                      : 'Paused: users see the Coming Soon screen.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'COMING_SOON', label: 'Coming Soon' },
                  { id: 'OPT_IN_ONLY', label: 'Opt-In & KYC Only' },
                  { id: 'LIVE', label: 'Live' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleChangeSavingsMode(opt.id)}
                  disabled={ratesLoading || togglingSavings || savingsMode === opt.id}
                  className={savingsMode === opt.id ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '12px', padding: '7px 12px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
                Save &amp; Earn Full Lock (% p.a.)
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
                Save &amp; Earn Flexible (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={flexibleSavingsRatePct}
                onChange={(e) => setFlexibleSavingsRatePct(e.target.value)}
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
                Rent Protec Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={rentProtecRatePct}
                onChange={(e) => setRentProtecRatePct(e.target.value)}
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
                Insurance Premium (% of Rent)
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
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Rent Protec Min Months (X_min)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="12"
                value={rentProtecMinMonths}
                onChange={(e) => setRentProtecMinMonths(e.target.value)}
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
                Max Savings Horizon (Months)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="11"
                value={maxSavingsMonths}
                onChange={(e) => setMaxSavingsMonths(e.target.value)}
                className="input"
                disabled={ratesLoading || savingRates}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetDefaultRates}
                disabled={ratesLoading || savingRates}
                style={{
                  height: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={15} />
                Reset to Default
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
