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
    unitType: string;
    tenantUuid?: string;
  };
  setFormData: (data: any) => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen, onClose, onSave, isPending, properties, targetPropertyUuid, setTargetPropertyUuid, formData, setFormData
}) => {
  const { data: tenants = [] } = useTenants()
  const [useExistingTenant, setUseExistingTenant] = React.useState(false)

  // Auto-calculate Rent Due Date (End Date)
  React.useEffect(() => {
    if (formData.rentStartDate && formData.rentType) {
      const start = new Date(formData.rentStartDate)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (formData.rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (formData.rentType === 'Annually') {
        end.setFullYear(end.getFullYear() + 1)
      }
      
      // Usually rent ends the day before the next period starts
      end.setDate(end.getDate() - 1)
      
      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.rentDueDate) {
        setFormData({ ...formData, rentDueDate: formattedEnd })
      }
    }
  }, [formData.rentStartDate, formData.rentType, formData.rentDueDate, setFormData])

  if (!isOpen) return null;

  const phoneError = formData.tenantPhone && !isValidPhoneNumber(formData.tenantPhone)
    ? 'Invalid international phone number'
    : undefined

  const selectedProperty = properties.find(p => p.uuid === targetPropertyUuid)
  const isDuplicateUnit = !!formData.unitName && !!selectedProperty?.units?.some(
    (u: any) => u.unitName.trim().toLowerCase() === formData.unitName.trim().toLowerCase()
  )

  const emailError = formData.tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.tenantEmail)
    ? 'Invalid email address'
    : undefined

  const isInvalid = !!phoneError || !!emailError || isDuplicateUnit || !formData.unitName || !targetPropertyUuid

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Unit Name / Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Apt 4B"
              value={formData.unitName}
              onChange={e => setFormData({ ...formData, unitName: e.target.value })}
              style={{ 
                borderColor: isDuplicateUnit ? 'var(--error)' : undefined,
                background: isDuplicateUnit ? 'var(--error-bg)' : undefined
              }}
            />
            {isDuplicateUnit && (
              <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                This unit name already exists in the selected property.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Unit Type</label>
            <select
              className="form-input"
              value={formData.unitType}
              onChange={e => setFormData({ ...formData, unitType: e.target.value })}
            >
              <option value="">Select an option</option>
              <option value="Flat / Apartment">Flat / Apartment</option>
              <option value="Duplex">Duplex</option>
              <option value="Shared Apartment">Shared Apartment</option>
              <option value="Studio">Studio</option>
              <option value="Bungalow">Bungalow</option>
              <option value="4 Bedroom Semi-detached Duplex">4 Bedroom Semi-detached Duplex</option>
              <option value="Detached Duplex">Detached Duplex</option>
              <option value="2 Bedroom Flat">2 Bedroom Flat</option>
              <option value="2 Bedroom Serviced Flat">2 Bedroom Serviced Flat</option>
              <option value="3 Bedroom Flat">3 Bedroom Flat</option>
              <option value="3 Bedroom Serviced Flat">3 Bedroom Serviced Flat</option>
              <option value="2 Bedroom Apartment">2 Bedroom Apartment</option>
              <option value="Studio / Self Contained Flat">Studio / Self Contained Flat</option>
              <option value="Mini Flat / 1 Bedroom Flat">Mini Flat / 1 Bedroom Flat</option>
              <option value="Flats">Flats</option>
              <option value="Terrace House">Terrace House</option>
              <option value="Town House">Town House</option>
              <option value="Detached House">Detached House</option>
              <option value="Semi-detached Duplex">Semi-detached Duplex</option>
              <option value="Semi-detached House">Semi-detached House</option>
              <option value="Shortlet Apartment">Shortlet Apartment</option>
              <option value="Office Space">Office Space</option>
              <option value="Studio Room / Self-contain">Studio Room / Self-contain</option>
              <option value="Block Of Flats">Block Of Flats</option>
            </select>
          </div>
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
            <label className="form-label">Rent Type</label>
            <select
              className="form-input"
              value={formData.rentType}
              onChange={e => setFormData({ ...formData, rentType: e.target.value })}
            >
              <option value="Monthly">Monthly</option>
              <option value="Annually">Annually</option>
            </select>
          </div>
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
                  {emailError && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{emailError}</p>}
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
            disabled={isPending || isInvalid}
          >
            {isPending ? 'Saving...' : 'Save Unit'}
          </button>
        </div>
      </div>
    </div>
  )
}

