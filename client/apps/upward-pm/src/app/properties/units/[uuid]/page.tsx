'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  User, 
  CreditCard, 
  Calendar, 
  Trash2, 
  Save, 
  Hash,
  PlusCircle,
  Clock,
  MapPin,
  Globe,
  MoreVertical,
  UserPlus,
  Unlink
} from 'lucide-react'
import { useUnit, useUpdateUnit, useDeleteUnit, useUnitPayments, useAddUnitPayment } from '@/features/pm/hooks/useProperties'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'
import { useTenants, useTenantActions } from '@/features/pm/hooks/useTenants'
import { TenantAssignmentSection } from '@/features/pm/components/tenants/TenantAssignmentSection'
import { AddRentRecordModal } from '@/features/pm/components/properties/modals/AddRentRecordModal'
import { useToast } from '@/components/common/Toast'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { cn } from '@/lib/utils'
import { Splash } from '@/components/common/Splash'

function UnitDetailContent() {
  const { uuid } = useParams()
  const router = useRouter()
  const { success, error, info } = useToast()
  
  const { data: unit } = useUnit(uuid as string)
  const { data: payments = [] } = useUnitPayments(uuid as string)
  const { data: allRequests = [] } = usePaymentRequests()
  const { data: tenants = [] } = useTenants()
  const { assignTenant, unassignTenant } = useTenantActions()
  
  const updateUnitMutation = useUpdateUnit()
  const deleteUnitMutation = useDeleteUnit()
  const addPaymentMutation = useAddUnitPayment()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [formData, setFormData] = useState<any>(() => ({
    unitName: unit.unitName,
    rentAmount: unit.rentAmount,
    rentType: unit.rentType,
    status: unit.status,
    rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : '',
    rentDueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString().split('T')[0] : '',
    address: unit.property?.address || '',
    state: unit.property?.state || '',
    country: unit.property?.country || 'Nigeria',
    area: unit.property?.area || '',
  }))
  
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'rent'>('overview')

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const lastPayment = payments[0] || null
  
  const unitRequests = allRequests.filter(r => r.unitId === unit?.id)
  const activeRequest = unitRequests.find(r => r.status !== 'PAID')
  const amountRemaining = activeRequest ? (activeRequest.amount - activeRequest.amountPaid) : 0

  const handleUpdate = () => {
    updateUnitMutation.mutate({ 
      uuid: uuid as string, 
      data: formData 
    }, {
      onSuccess: () => {
        success('Unit updated successfully')
        setIsEditing(false)
      },
      onError: () => error('Failed to update unit')
    })
  }

  const handleUnassign = () => {
    if (unit?.tenant?.uuid) {
      unassignTenant.mutate({ 
        tenantUuid: unit.tenant.uuid, 
        unitUuid: uuid as string 
      }, {
        onSuccess: () => {
          setIsUnassignConfirmOpen(false)
          info('Tenant unassigned')
        },
        onError: () => error('Failed to unassign tenant')
      })
    }
  }

  const handleAssign = (tenantUuid: string) => {
    assignTenant.mutate({ 
      tenantUuid, 
      unitUuid: uuid as string 
    }, {
      onSuccess: () => {
        setIsAssignModalOpen(false)
        success('Tenant assigned successfully')
      },
      onError: () => error('Failed to assign tenant')
    })
  }

  const handleDelete = () => {
    deleteUnitMutation.mutate(uuid as string, {
      onSuccess: () => {
        success('Unit deleted')
        setIsDeleteConfirmOpen(false)
        router.back()
      },
      onError: () => error('Failed to delete unit')
    })
  }

  const addRentRecord = () => {
    setIsAddModalOpen(true)
  }

  const handleSavePayment = (data: any) => {
    addPaymentMutation.mutate({
      unitUuid: uuid as string,
      data
    }, {
      onSuccess: () => {
        success('Rent record added successfully')
        setIsAddModalOpen(false)
      },
      onError: () => error('Failed to add rent record')
    })
  }

  return (
    <div className="unit-detail animate-fade-in">
      <header className="unit-detail__header" style={{ marginBottom: 24, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="btn btn--secondary btn--sm" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', padding: 0 }}>
            <ChevronLeft size={16} /> Back
          </button>
          
          <div className="unit-detail__actions" style={{ position: 'relative' }}>
            <button className="btn btn--primary" onClick={() => setIsEditing(!isEditing)} style={{ borderRadius: 100 }}>
              <Save size={16} style={{ marginRight: 6 }}/> {isEditing ? 'Save Changes' : 'Edit Unit'}
            </button>
            
            <button 
              className="btn btn--secondary btn--icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                  onClick={() => setIsMenuOpen(false)} 
                />
                <div className="glass shadow-lg" style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: 8, 
                  width: 220, 
                  zIndex: 100, 
                  borderRadius: 12, 
                  padding: 8,
                  border: '1px solid var(--border)'
                }}>
                  {unit?.tenant ? (
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsUnassignConfirmOpen(true)
                      }}
                      style={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        padding: '10px 12px', 
                        borderRadius: 8, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10,
                        fontSize: 13,
                        color: 'var(--text)'
                      }}
                    >
                      <Unlink size={16} color="var(--error)" />
                      Remove Tenant
                    </button>
                  ) : (
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsAssignModalOpen(true)
                      }}
                      style={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        padding: '10px 12px', 
                        borderRadius: 8, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10,
                        fontSize: 13,
                        color: 'var(--text)'
                      }}
                    >
                      <UserPlus size={16} color="var(--forest)" />
                      Assign Tenant
                    </button>
                  )}
                  
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsDeleteConfirmOpen(true)
                    }}
                    style={{ 
                      width: '100%', 
                      textAlign: 'left', 
                      padding: '10px 12px', 
                      borderRadius: 8, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10,
                      fontSize: 13,
                      color: 'var(--error)'
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Unit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <h1 className="dashboard__title" style={{ marginBottom: 20 }}>About Unit</h1>

      {/* Alert Banner */}
      <div style={{ background: '#ef4444', color: 'white', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 500 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>!</div>
        High Priority Note: Ensure unit details and tenant assignments are up to date.
      </div>

      {/* Basic Info Card */}
      <div style={{ background: '#fff0e6', padding: '24px', borderRadius: 8, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>Unit - {unit?.unitName}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{unit?.unitName}</span>
          <span className={`badge badge--${unit?.status?.toLowerCase() || 'vacant'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
            {unit?.status?.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="unit-tabs" style={{ marginBottom: 24, gap: 32 }}>
        <button className={cn("unit-tab", activeTab === 'overview' && "unit-tab--active")} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={cn("unit-tab", activeTab === 'rent' && "unit-tab--active")} onClick={() => setActiveTab('rent')}>Rent History</button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Collect Rent Banner */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 24px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ color: 'var(--info)', marginTop: 2 }}>↗</div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Manage Unit Payments</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>Generate rent requests or record manual payments easily from this panel.</p>
              </div>
            </div>
            <button className="btn btn--primary" style={{ borderRadius: 100 }} onClick={addRentRecord}>Record Payment</button>
          </div>

          <div className="unit-detail__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Unit Information Card */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#333' }}>Unit Information</h3>
              <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 16px' }}>
                  
                  {isEditing ? (
                    <>
                      <div className="form-group">
                        <label className="form-label text-muted">Unit Name</label>
                        <input className="form-input" value={formData.unitName} onChange={e => setFormData({...formData, unitName: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-muted">Status</label>
                        <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="VACANT">Vacant</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label text-muted">Rent Type</label>
                        <select className="form-input" value={formData.rentType} onChange={e => setFormData({...formData, rentType: e.target.value})}>
                          <option value="Monthly">Monthly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Property</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{unit?.property?.name || 'N/A'}</div>
                        <a href={`/properties/${unit?.property?.uuid}`} style={{ fontSize: 11, color: 'var(--info)', marginTop: 4, display: 'inline-block' }}>Go to property &gt;</a>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Address</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.property?.address || 'N/A'}<br/>{unit?.property?.area}, {unit?.property?.state}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Status</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: unit?.status === 'OCCUPIED' ? 'var(--success)' : 'var(--text-muted)' }}>{unit?.status?.replace('-', ' ') || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent Type</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentType || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Management Fee</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.managementFee ? `₦${unit.managementFee.toLocaleString()}` : '0%'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Service Charge</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>N/A</div>
                      </div>
                    </>
                  )}
                  
                </div>
              </div>
            </div>

            {/* Occupancy Card */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#333' }}>Occupancy</h3>
              <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
                {unit?.tenant ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>
                          {unit.tenant.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                          {unit.tenant.firstName} {unit.tenant.lastName}
                        </div>
                      </div>
                      <button className="btn btn--secondary btn--sm" onClick={() => router.push(`/tenants/${unit.tenant?.uuid}`)} style={{ borderRadius: 100, fontSize: 12 }}>
                        View Tenant
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 16px' }}>
                      {isEditing ? (
                        <>
                          <div className="form-group">
                            <label className="form-label text-muted">Rent Amount (₦)</label>
                            <input type="number" className="form-input" value={formData.rentAmount} onChange={e => setFormData({...formData, rentAmount: parseFloat(e.target.value) || 0})} />
                          </div>
                          <div className="form-group">
                            <label className="form-label text-muted">Start Date</label>
                            <input type="date" className="form-input" value={formData.rentStartDate} onChange={e => setFormData({...formData, rentStartDate: e.target.value})} />
                          </div>
                          <div className="form-group">
                            <label className="form-label text-muted">Due/End Date</label>
                            <input type="date" className="form-input" value={formData.rentDueDate} onChange={e => setFormData({...formData, rentDueDate: e.target.value})} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Occupancy Status</div>
                            <span className="badge badge--occupied" style={{ fontSize: 10, padding: '2px 8px' }}>Active</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>₦{(unit?.rentAmount || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent Start Date</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentStartDate ? new Date(unit.rentStartDate).toDateString() : 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Rent End Date</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{unit?.rentDueDate ? new Date(unit.rentDueDate).toDateString() : 'N/A'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                    <p style={{ marginBottom: 16 }}>No tenant assigned to this unit yet.</p>
                    <TenantAssignmentSection unit={unit} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'rent' && (
        <div className="unit-rent-view animate-fade-in">
          <div className="rent-stats">
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Total Paid to Date</span>
              <span className="rent-stat-card__value">₦{(totalPaid || 0).toLocaleString()}</span>
            </div>
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Outstanding Balance</span>
              <span className={cn("rent-stat-card__value", amountRemaining > 0 ? "text-error" : "text-forest")}>
                ₦{(amountRemaining || 0).toLocaleString()}
              </span>
              {activeRequest && <span className="rent-stat-card__meta">Due: {new Date(activeRequest.dueDate).toLocaleDateString()}</span>}
            </div>
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Rent Status</span>
              <span className={cn("rent-stat-card__value", amountRemaining === 0 ? "text-forest" : "text-accent")}>
                {amountRemaining === 0 ? 'Fully Paid' : 'Partial/Pending'}
              </span>
              {unit?.rentDueDate && <span className="rent-stat-card__meta">Next Cycle: {new Date(unit.rentDueDate).toLocaleDateString()}</span>}
            </div>
          </div>

          <div className="rent-history glass">
            <div className="rent-history__header">
              <h3>Rent Payment History</h3>
              <button className="btn btn--primary btn--sm" onClick={addRentRecord}>
                <PlusCircle size={14} /> Add Record
              </button>
            </div>
            <div className="rent-history__table-container">
              <table className="rent-history__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Period</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length > 0 ? payments.map(row => (
                    <tr key={row.uuid}>
                      <td>{new Date(row.paymentDate).toLocaleDateString()}</td>
                      <td>₦{row.amount.toLocaleString()}</td>
                      <td>{row.periodStart ? `${new Date(row.periodStart).toLocaleDateString()} - ${new Date(row.periodEnd).toLocaleDateString()}` : 'N/A'}</td>
                      <td>{row.method}</td>
                      <td>
                        <span className="badge badge--on-upward">{row.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>No payment history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AddRentRecordModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSavePayment}
        isPending={addPaymentMutation.isPending}
        unitName={unit?.unitName || ''}
      />

      <ConfirmationModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone and will remove all associated data."
        confirmText="Delete Unit"
        type="danger"
        isPending={deleteUnitMutation.isPending}
      />

      <ConfirmationModal 
        isOpen={isUnassignConfirmOpen}
        onClose={() => setIsUnassignConfirmOpen(false)}
        onConfirm={handleUnassign}
        title="Remove Tenant"
        message={`Are you sure you want to remove ${unit?.tenant?.firstName} from this unit? They will no longer be linked to this residence.`}
        confirmText="Remove Tenant"
        type="danger"
        isPending={unassignTenant.isPending}
      />

      {isAssignModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass" style={{ width: '100%', maxWidth: 450, borderRadius: 24, padding: 32, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>Assign Tenant</h3>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Select a tenant to assign to <strong>{unit?.unitName}</strong></p>
            
            <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 16 }}>
              {tenants.map(tenant => (
                <div 
                  key={tenant.uuid} 
                  onClick={() => handleAssign(tenant.uuid)}
                  style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  className="hover-bg-faint"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{tenant.firstName} {tenant.lastName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tenant.email}</div>
                  </div>
                  <UserPlus size={16} color="var(--forest)" />
                </div>
              ))}
              {tenants.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No tenants available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .unit-detail {
          padding-bottom: 100px;
        }
        .unit-detail__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .unit-detail__actions {
          display: flex;
          gap: 12px;
        }
        .unit-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
        }
        .unit-tab {
          padding: 12px 0;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-muted);
          position: relative;
          transition: all 0.2s;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .unit-tab:hover {
          color: var(--text);
        }
        .unit-tab--active {
          color: var(--forest);
        }
        .unit-tab--active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--forest);
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-label {
          font-size: 11px;
          margin-bottom: 4px;
          display: block;
        }
        .form-input {
          height: 34px;
          font-size: 13px;
          padding: 0 10px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .rent-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .rent-stat-card {
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .rent-stat-card__label {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rent-stat-card__value {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
        }
        .rent-stat-card__meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .rent-history {
          border-radius: 12px;
          padding: 20px 24px;
        }
        .rent-history__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .rent-history__header h3 {
          font-size: 14px;
          font-weight: 700;
        }
        .rent-history__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .rent-history__table th {
          text-align: left;
          padding: 12px 10px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          border-bottom: 1px solid var(--border);
        }
        .rent-history__table td {
          padding: 16px 10px;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .text-forest { color: var(--forest) !important; }
        .text-error { color: var(--error) !important; }
        .text-accent { color: var(--accent) !important; }

        @media (max-width: 768px) {
          .unit-detail__grid, .rent-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function UnitDetailPage() {
  return (
    <Suspense fallback={<Splash />}>
      <UnitDetailContent />
    </Suspense>
  )
}