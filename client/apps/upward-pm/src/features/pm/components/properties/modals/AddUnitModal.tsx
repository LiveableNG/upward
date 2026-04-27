import React from 'react'
import { X } from 'lucide-react'
import { Property } from '../../../services/propertyService'
import { useTenants } from '../../../hooks/useTenants'

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  properties: Property[];
  targetPropertyUuid: string;
  setTargetPropertyUuid: (uuid: string) => void;
  formData: {
    unitName: string;
    rentAmount: string;
    rentStartDate: string;
    rentDueDate: string;
    rentFrequency: string;
    tenantFirstName: string;
    tenantLastName: string;
    tenantEmail: string;
    tenantPhone: string;
    tenantUuid?: string;
  };
  setFormData: (data: any) => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen, onClose, onSave, isPending, properties, targetPropertyUuid, setTargetPropertyUuid, formData, setFormData
}) => {
  const { data: tenants = [] } = useTenants()
  const [useExistingTenant, setUseExistingTenant] = React.useState(false)

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Add New Unit</h2>
            <p className="modal__desc">Manually register a single unit and its tenant details.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Select Target Property</label>
          <select
            className="form-input"
            value={targetPropertyUuid}
            onChange={e => setTargetPropertyUuid(e.target.value)}
          >
            <option value="">-- Choose Property --</option>
            {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Unit Name / Number</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Apt 4B"
            value={formData.unitName}
            onChange={e => setFormData({ ...formData, unitName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Rent Amount (₦)</label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 1500000"
            value={formData.rentAmount}
            onChange={e => setFormData({ ...formData, rentAmount: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.rentStartDate}
              onChange={e => setFormData({ ...formData, rentStartDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rent Due Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.rentDueDate}
              onChange={e => setFormData({ ...formData, rentDueDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select
              className="form-input"
              value={formData.rentFrequency}
              onChange={e => setFormData({ ...formData, rentFrequency: e.target.value })}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Bi-Annually">Bi-Annually</option>
              <option value="Annually">Annually</option>
            </select>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Tenant Details</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use Existing</span>
              <input 
                type="checkbox" 
                checked={useExistingTenant} 
                onChange={e => {
                  setUseExistingTenant(e.target.checked)
                  if (!e.target.checked) {
                    setFormData({ ...formData, tenantUuid: '' })
                  }
                }} 
              />
            </div>
          </div>

          {useExistingTenant ? (
            <div className="form-group">
              <label className="form-label">Select Existing Tenant</label>
              <select 
                className="form-input"
                value={formData.tenantUuid || ''}
                onChange={e => {
                  const selected = tenants.find(t => t.uuid === e.target.value)
                  if (selected) {
                    setFormData({
                      ...formData,
                      tenantUuid: selected.uuid,
                      tenantFirstName: selected.firstName || '',
                      tenantLastName: selected.lastName || '',
                      tenantEmail: selected.email || '',
                      tenantPhone: selected.phone || ''
                    })
                  }
                }}
              >
                <option value="">-- Choose Tenant --</option>
                {tenants.map(t => (
                  <option key={t.uuid} value={t.uuid}>
                    {t.firstName} {t.lastName} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="John"
                    value={formData.tenantFirstName}
                    onChange={e => setFormData({ ...formData, tenantFirstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Doe"
                    value={formData.tenantLastName}
                    onChange={e => setFormData({ ...formData, tenantLastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="john@example.com"
                    value={formData.tenantEmail}
                    onChange={e => setFormData({ ...formData, tenantEmail: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+2348000000000"
                    value={formData.tenantPhone}
                    onChange={e => setFormData({ ...formData, tenantPhone: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={onSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Unit'}
          </button>
        </div>
      </div>
    </div>
  )
}
