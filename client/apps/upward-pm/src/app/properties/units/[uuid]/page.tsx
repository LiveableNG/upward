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
  Globe
} from 'lucide-react'
import { useUnit, useUpdateUnit, useDeleteUnit, useUnitPayments, useAddUnitPayment } from '@/features/pm/hooks/useProperties'
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
  const updateUnitMutation = useUpdateUnit()
  const deleteUnitMutation = useDeleteUnit()
  const addPaymentMutation = useAddUnitPayment()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const [formData, setFormData] = useState<any>(() => ({
    unitName: unit.unitName,
    rentAmount: unit.rentAmount,
    rentFrequency: unit.rentFrequency,
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
      <header className="unit-detail__header">
        <div className="unit-detail__nav">
          <button className="btn-icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="dashboard__title">Unit {unit?.unitName}</h1>
            <p className="dashboard__subtitle">{unit?.property?.name || 'Property Details'}</p>
          </div>
        </div>
        <div className="unit-detail__actions">
          <button 
            className="btn btn--danger btn--icon" 
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="Delete Unit"
          >
            <Trash2 size={18} />
          </button>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn--secondary" 
                onClick={() => {
                  setFormData({
                    unitName: unit.unitName,
                    rentAmount: unit.rentAmount,
                    rentFrequency: unit.rentFrequency,
                    status: unit.status,
                    rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString().split('T')[0] : '',
                    rentDueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString().split('T')[0] : '',
                    address: unit.property?.address || '',
                    state: unit.property?.state || '',
                    country: unit.property?.country || 'Nigeria',
                    area: unit.property?.area || '',
                  })
                  setIsEditing(false)
                }}
              >
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleUpdate}>
                <Save size={18} />
                Save Changes
              </button>
            </div>
          ) : (
            <button className="btn btn--secondary" onClick={() => setIsEditing(true)}>
              Edit Details
            </button>
          )}
        </div>
      </header>

      <div className="unit-tabs">
        <button 
          className={cn("unit-tab", activeTab === 'overview' && "unit-tab--active")}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={cn("unit-tab", activeTab === 'rent' && "unit-tab--active")}
          onClick={() => setActiveTab('rent')}
        >
          Rent & History
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="unit-detail__grid">
          <div className="unit-detail__card glass">
            <div className="card-header">
              <Hash size={20} className="text-clay" />
              <h3>Unit Information</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Unit Name/Number</label>
                <input 
                  className="form-input" 
                  value={formData.unitName} 
                  onChange={e => setFormData({...formData, unitName: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Occupancy Status</label>
                <select 
                  className="form-input" 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  disabled={!isEditing}
                >
                  <option value="OCCUPIED">Occupied</option>
                  <option value="VACANT">Vacant</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          <div className="unit-detail__card glass">
            <div className="card-header">
              <MapPin size={20} className="text-clay" />
              <h3>Location & Address</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input 
                  className="form-input" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  placeholder="e.g. 123 Street Name"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Area / City</label>
                  <input 
                    className="form-input" 
                    value={formData.area} 
                    onChange={e => setFormData({...formData, area: e.target.value})}
                    disabled={!isEditing}
                    placeholder="e.g. Lekki"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input 
                    className="form-input" 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    disabled={!isEditing}
                    placeholder="e.g. Lagos"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <div className="input-with-icon">
                  <Globe size={16} className="input-icon" />
                  <input 
                    className="form-input" 
                    style={{ paddingLeft: '40px' }}
                    value={formData.country} 
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>

          <TenantAssignmentSection unit={unit} />

          <div className="unit-detail__card glass">
            <div className="card-header">
              <CreditCard size={20} className="text-clay" />
              <h3>Financials</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Rent Amount (₦)</label>
                <input 
                  type="number"
                  className="form-input" 
                  value={formData.rentAmount} 
                  onChange={e => setFormData({...formData, rentAmount: parseFloat(e.target.value) || 0})}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rent Frequency</label>
                <select 
                  className="form-input" 
                  value={formData.rentFrequency}
                  onChange={e => setFormData({...formData, rentFrequency: e.target.value})}
                  disabled={!isEditing}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Bi-Annually">Bi-Annually</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>
            </div>
          </div>

          <div className="unit-detail__card glass">
            <div className="card-header">
              <Calendar size={20} className="text-clay" />
              <h3>Lease Dates</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input 
                  type="date"
                  className="form-input" 
                  value={formData.rentStartDate} 
                  onChange={e => setFormData({...formData, rentStartDate: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Next Due Date</label>
                <input 
                  type="date"
                  className="form-input" 
                  value={formData.rentDueDate} 
                  onChange={e => setFormData({...formData, rentDueDate: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="unit-rent-view animate-fade-in">
          <div className="rent-stats">
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Total Paid to Date</span>
              <span className="rent-stat-card__value">₦{(totalPaid || 0).toLocaleString()}</span>
            </div>
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Last Payment</span>
              <span className="rent-stat-card__value">₦{(lastPayment?.amount || 0).toLocaleString()}</span>
              {lastPayment && <span className="rent-stat-card__meta">{new Date(lastPayment.paymentDate).toLocaleDateString()}</span>}
            </div>
            <div className="rent-stat-card glass">
              <span className="rent-stat-card__label">Rent Status</span>
              <span className={cn("rent-stat-card__value", "text-forest")}>
                {unit?.status === 'OCCUPIED' ? 'Up to Date' : 'No Active Lease'}
              </span>
            </div>
          </div>

          <div className="rent-history glass">
            <div className="rent-history__header">
              <h3>Rent Payment History</h3>
              <button className="btn btn--primary btn--sm" onClick={addRentRecord}>
                <PlusCircle size={16} /> Add Record
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
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No payment history found.</td>
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

      <style jsx>{`
        .unit-detail {
          padding-bottom: 100px;
        }
        .unit-detail__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .unit-detail__nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .unit-detail__actions {
          display: flex;
          gap: 12px;
        }
        .unit-tabs {
          display: flex;
          gap: 32px;
          margin-bottom: 32px;
          border-bottom: 1px solid var(--border);
        }
        .unit-tab {
          padding: 12px 4px;
          font-weight: 600;
          font-size: 15px;
          color: var(--text-muted);
          position: relative;
          transition: all 0.2s;
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
        .unit-detail__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .unit-detail__card {
          border-radius: 20px;
          padding: 24px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .card-header h3 {
          font-size: 16px;
          font-weight: 700;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .btn--danger {
          background: var(--error-bg);
          color: var(--error);
          border: 1px solid transparent;
        }
        .btn--danger:hover {
          background: var(--error);
          color: white;
        }
        .unit-detail-loading {
          padding: 40px;
        }
        .skeleton {
          height: 400px;
          background: var(--ivory-dim);
          border-radius: 20px;
        }

        /* Rent View Styles */
        .rent-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .rent-stat-card {
          padding: 24px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
        }
        .rent-stat-card__label {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rent-stat-card__value {
          font-size: 24px;
          font-weight: 800;
          color: var(--text);
        }
        .rent-stat-card__meta {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .rent-history {
          border-radius: 20px;
          padding: 32px;
        }
        .rent-history__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .rent-history__table-container {
          overflow-x: auto;
        }
        .rent-history__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .rent-history__table th {
          text-align: left;
          padding: 12px;
          color: var(--text-muted);
          font-weight: 600;
          border-bottom: 1px solid var(--border);
        }
        .rent-history__table td {
          padding: 16px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .text-forest { color: var(--forest); }
        
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .unit-detail__grid, .rent-stats {
            grid-template-columns: 1fr;
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
