"use client"
import React from 'react'
import { UserPlus, Users, Home, Calendar, CreditCard, ClipboardList } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Property } from '../../../services/propertyService'
import { useTenants } from '../../../hooks/useTenants'
import { PhoneInput } from '@/components/common/PhoneInput'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'

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
    leaseYears?: number | string;
    managementFee: string;
    notes: string;
    tenantFirstName: string;
    tenantLastName: string;
    tenantEmail: string;
    tenantPhone: string;
    unitType: string;
    tenantUuid?: string;
    rentAmountPaid: string;
    isFullyPaid: boolean;
  };
  setFormData: (data: any) => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen, onClose, onSave, isPending, properties, targetPropertyUuid, setTargetPropertyUuid, formData, setFormData
}) => {
  const { data: tenants = [] } = useTenants()
  const [tenantMode, setTenantMode] = React.useState<'NONE' | 'NEW' | 'EXISTING'>('NONE')

  // Auto-calculate Rent Due Date (End Date)
  React.useEffect(() => {
    if (formData.rentStartDate && formData.rentType) {
      const [y, m, d] = formData.rentStartDate.split('-').map(Number)
      if (!y || !m || !d) return

      const start = new Date(Date.UTC(y, m - 1, d))
      if (isNaN(start.getTime())) return

      const end = new Date(start.getTime())
      if (formData.rentType === 'Monthly') {
        end.setUTCMonth(end.getUTCMonth() + 1)
      } else if (formData.rentType === 'Lease') {
        const years = Math.max(1, parseInt(String(formData.leaseYears || '1'), 10) || 1)
        end.setUTCFullYear(end.getUTCFullYear() + years)
      } else {
        end.setUTCFullYear(end.getUTCFullYear() + 1)
      }
      
      end.setUTCDate(end.getUTCDate() - 1)
      
      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.rentDueDate) {
        setFormData({ ...formData, rentDueDate: formattedEnd })
      }
    }
  }, [formData.rentStartDate, formData.rentType, formData.leaseYears, formData.rentDueDate, setFormData])

  if (!isOpen) return null;

  const phoneError = formData.tenantPhone && !isValidPhoneNumber(formData.tenantPhone)
    ? 'Invalid phone number'
    : undefined

  const selectedProperty = properties.find(p => p.uuid === targetPropertyUuid)
  const isDuplicateUnit = !!formData.unitName && !!selectedProperty?.units?.some(
    (u: any) => u.unitName.trim().toLowerCase() === formData.unitName.trim().toLowerCase()
  )

  const emailError = formData.tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.tenantEmail)
    ? 'Invalid email address'
    : undefined

  const hasTenant = tenantMode !== 'NONE'
  
  // Validation for Rent Fields (Required if tenant is assigned)
  const rentFieldsError = hasTenant && (!formData.rentAmount || !formData.rentType || !formData.rentStartDate || !formData.rentDueDate || (formData.rentType === 'Lease' && (!formData.leaseYears || parseInt(String(formData.leaseYears), 10) < 1)))

  const isInvalid = !!phoneError || !!emailError || isDuplicateUnit || !formData.unitName || !targetPropertyUuid || (hasTenant && rentFieldsError)

  const handleToggleTenantMode = (mode: 'NONE' | 'NEW' | 'EXISTING') => {
    setTenantMode(mode === tenantMode ? 'NONE' : mode)
    if (mode === 'NONE' || mode === tenantMode) {
        setFormData({
            ...formData,
            tenantUuid: '',
            tenantFirstName: '',
            tenantLastName: '',
            tenantEmail: '',
            tenantPhone: '',
            rentAmount: '',
            rentAmountPaid: '0',
            isFullyPaid: true,
            rentStartDate: '',
            rentDueDate: ''
        })
    } else {
        // Set default amount paid to 0 if assigning tenant
        setFormData({ ...formData, rentAmountPaid: '0', isFullyPaid: true })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Unit"
      subtitle="Register a unit to your property portfolio."
      maxWidth={640}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1, fontSize: 13 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            style={{ flex: 1, fontSize: 13 }} 
            onClick={onSave} 
            disabled={isPending || isInvalid}
          >
            {isPending ? 'Saving...' : 'Save Unit'}
          </button>
        </div>
      }
    >
        <div style={{ padding: '0px 0px 16px' }}>

        {/* Section: Core Unit Info */}
        <div className="modal-section" style={{ marginBottom: 24 }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Home size={16} color="var(--clay)" />
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Unit Information</h4>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: 11 }}>Select Target Property</label>
            <FormSelect
              value={targetPropertyUuid}
              onChange={setTargetPropertyUuid}
              options={properties.map(p => ({ label: p.name, value: p.uuid }))}
              placeholder="-- Choose Property --"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Unit Name / Number</label>
              <input
                type="text"
                className="form-input"
                style={{ 
                  fontSize: 13, 
                  padding: '10px 14px',
                  borderColor: isDuplicateUnit ? 'var(--error)' : undefined,
                  background: isDuplicateUnit ? 'var(--error-bg)' : undefined
                }}
                placeholder="e.g. Apt 4B"
                value={formData.unitName}
                onChange={e => setFormData({ ...formData, unitName: e.target.value })}
              />
              {isDuplicateUnit && (
                <p style={{ color: 'var(--error)', fontSize: 10, marginTop: 4 }}>Unit name already exists.</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Unit Type</label>
              <FormSelect
                value={formData.unitType}
                onChange={val => setFormData({ ...formData, unitType: val })}
                options={[
                  { label: 'Flat / Apartment', value: 'Flat / Apartment' },
                  { label: 'Duplex', value: 'Duplex' },
                  { label: 'Studio', value: 'Studio' },
                  { label: 'Bungalow', value: 'Bungalow' },
                  { label: 'Town House', value: 'Town House' },
                  { label: 'Office Space', value: 'Office Space' }
                ]}
                placeholder="Select Type"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Management Fee (₦)</label>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: 13, padding: '10px 14px' }}
              placeholder="e.g. 150000"
              value={formData.managementFee}
              onChange={e => setFormData({ ...formData, managementFee: e.target.value })}
            />
          </div>
        </div>

        {/* Section: Tenant Assignment */}
        <div className="modal-section" style={{ background: 'var(--bg)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="var(--forest)" />
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Tenant Assignment</h4>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button 
                    className={cn("btn btn--sm", tenantMode === 'NEW' ? "btn--primary" : "btn--secondary")}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                    onClick={() => handleToggleTenantMode('NEW')}
                >
                    <UserPlus size={14} /> New Tenant
                </button>
                <button 
                    className={cn("btn btn--sm", tenantMode === 'EXISTING' ? "btn--primary" : "btn--secondary")}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                    onClick={() => handleToggleTenantMode('EXISTING')}
                >
                    <Users size={14} /> Existing
                </button>
            </div>
          </div>

          {!hasTenant && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', margin: 0 }}>
                Optional: Assign a tenant to this unit now to set up rent billing.
            </p>
          )}

          {hasTenant && (
            <div className="animate-fade-in">
              {tenantMode === 'EXISTING' ? (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Select Existing Tenant</label>
                  <FormSelect
                    value={formData.tenantUuid || ''}
                    onChange={val => {
                      const selected = tenants.find(t => t.uuid === val)
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
                    options={tenants.map(t => ({ label: `${t.firstName} ${t.lastName} (${t.email})`, value: t.uuid }))}
                    placeholder="-- Choose Tenant --"
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      placeholder="John"
                      value={formData.tenantFirstName}
                      onChange={e => setFormData({ ...formData, tenantFirstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      placeholder="Doe"
                      value={formData.tenantLastName}
                      onChange={e => setFormData({ ...formData, tenantLastName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      placeholder="john@example.com"
                      value={formData.tenantEmail}
                      onChange={e => setFormData({ ...formData, tenantEmail: e.target.value })}
                    />
                    {emailError && <p style={{ color: 'var(--error)', fontSize: 10, marginTop: 4 }}>{emailError}</p>}
                  </div>
                  <PhoneInput
                    label="Phone Number"
                    value={formData.tenantPhone}
                    onValueChange={(val) => setFormData({ ...formData, tenantPhone: val })}
                    placeholder="e.g. +234..."
                    error={phoneError}
                  />
                </div>
              )}

              {/* Repositioned Rent Details (Shown only with tenant) */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CreditCard size={14} color="var(--forest)" />
                    <h5 style={{ fontSize: 11, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rent Configuration</h5>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: formData.rentType === 'Lease' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Rent Amount (₦)</label>
                    <input
                      type="number"
                      className={cn("form-input", !formData.rentAmount && "form-input--error")}
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      placeholder="Required"
                      value={formData.rentAmount}
                      onChange={e => setFormData({ ...formData, rentAmount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Rent Cycle</label>
                    <FormSelect
                      className={cn(!formData.rentType && "form-input--error")}
                      value={formData.rentType}
                      onChange={val => setFormData({ ...formData, rentType: val })}
                      options={[
                        { label: 'Annually', value: 'Annually' },
                        { label: 'Monthly', value: 'Monthly' },
                        { label: 'Lease', value: 'Lease' }
                      ]}
                      placeholder="Select Rent Cycle"
                    />
                  </div>
                  {formData.rentType === 'Lease' && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Lease Years</label>
                      <input
                        type="number"
                        min="1"
                        className={cn("form-input", (!formData.leaseYears || parseInt(String(formData.leaseYears), 10) < 1) && "form-input--error")}
                        style={{ fontSize: 13, padding: '10px 14px' }}
                        placeholder="e.g. 3"
                        value={formData.leaseYears || '1'}
                        onChange={e => setFormData({ ...formData, leaseYears: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> Start Date
                    </label>
                    <input
                      type="date"
                      className={cn("form-input", !formData.rentStartDate && "form-input--error")}
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      value={formData.rentStartDate}
                      onChange={e => setFormData({ ...formData, rentStartDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> Rent End Date (Auto-calculated)
                    </label>
                    <input
                      type="date"
                      readOnly
                      className={cn("form-input", !formData.rentDueDate && "form-input--error")}
                      style={{ fontSize: 13, padding: '10px 14px', background: 'var(--bg)', cursor: 'not-allowed', opacity: 0.8 }}
                      value={formData.rentDueDate}
                      title="Auto-calculated based on rent start date and cycle"
                    />
                  </div>
                </div>


                <div style={{ marginTop: 16, padding: 12, background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.isFullyPaid ? 0 : 12 }}>
                    <div>
                      <h6 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--dark)' }}>Fully Paid for Current Period?</h6>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Toggle off if the tenant is making a partial payment initially.</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.isFullyPaid} 
                        onChange={e => setFormData({ ...formData, isFullyPaid: e.target.checked })} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {!formData.isFullyPaid && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Initial Amount Paid (₦)</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ fontSize: 13, padding: '10px 14px' }}
                        placeholder="e.g. 500000"
                        value={formData.rentAmountPaid}
                        onChange={e => setFormData({ ...formData, rentAmountPaid: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="form-group" style={{ marginTop: 24 }}>
          <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClipboardList size={14} /> Internal Notes
          </label>
          <textarea
            className="form-input"
            style={{ fontSize: 13, minHeight: 60, resize: 'vertical' }}
            placeholder="Special instructions..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        </div>

      <style jsx>{`
        .form-input--error {
            border-color: var(--error) !important;
            background: var(--error-bg) !important;
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Modal>
  )
}

