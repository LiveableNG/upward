import React from 'react'
import { X } from 'lucide-react'
import { Property } from '../../../services/propertyService'
import { useTenants } from '../../../hooks/useTenants'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

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
    rentType: string;
    managementFee: string;
    notes: string;
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

  const phoneError = formData.tenantPhone && !isValidPhoneNumber(formData.tenantPhone)
    ? 'Invalid international phone number'
    : undefined

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

        <div className="form-group" style={{ marginTop: 20 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <div className="form-group">
            <label className="form-label">Management Fee (₦)</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 150000"
              value={formData.managementFee}
              onChange={e => setFormData({ ...formData, managementFee: e.target.value })}
            />
          </div>
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
            <label className="form-label">Rent Type</label>
            <select
              className="form-input"
              value={formData.rentType}
              onChange={e => setFormData({ ...formData, rentType: e.target.value })}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Bi-Annually">Bi-Annually</option>
              <option value="Annually">Annually</option>
            </select>
          </div>
        </div>
        
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Internal Notes</label>
          <textarea
            className="form-input"
            style={{ minHeight: 80, resize: 'vertical' }}
            placeholder="Any special instructions or notes for this unit..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="off"
                    value={formData.tenantEmail}
                    onChange={e => setFormData({ ...formData, tenantEmail: e.target.value })}
                  />
                </div>
                <div>
                  <PhoneInput
                    label="Phone Number"
                    value={formData.tenantPhone}
                    onValueChange={(val) => setFormData({ ...formData, tenantPhone: val })}
                    placeholder="e.g. +234..."
                    error={phoneError}
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
          <button 
            className="btn btn--primary" 
            style={{ flex: 1 }} 
            onClick={onSave} 
            disabled={isPending || (!!formData.tenantPhone && !!phoneError)}
          >
            {isPending ? 'Saving...' : 'Save Unit'}
          </button>
        </div>
      </div>
    </div>
  )
}

