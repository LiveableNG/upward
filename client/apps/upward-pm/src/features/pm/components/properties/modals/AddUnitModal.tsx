"use client"

import React from 'react'
import { X, UserPlus, Users, Home, Calendar, CreditCard, ClipboardList } from 'lucide-react'
import { Property } from '../../../services/propertyService'
import { useTenants } from '../../../hooks/useTenants'
import { PhoneInput } from '@/components/common/PhoneInput'
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
    managementFee: string;
    notes: string;
    tenantFirstName: string;
    tenantLastName: string;
    tenantEmail: string;
    tenantPhone: string;
    unitType: string;
    tenantUuid?: string;
    rentAmountPaid: string;
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
      const start = new Date(formData.rentStartDate)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (formData.rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (formData.rentType === 'Annually') {
        end.setFullYear(end.getFullYear() + 1)
      }
      
      end.setDate(end.getDate() - 1)
      
      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.rentDueDate) {
        setFormData({ ...formData, rentDueDate: formattedEnd })
      }
    }
  }, [formData.rentStartDate, formData.rentType, formData.rentDueDate, setFormData])

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
  const rentFieldsError = hasTenant && (!formData.rentAmount || !formData.rentType || !formData.rentStartDate || !formData.rentDueDate)

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
            rentStartDate: '',
            rentDueDate: ''
        })
    } else {
        // Set default amount paid to 0 if assigning tenant
        setFormData({ ...formData, rentAmountPaid: '0' })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, padding: '24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 className="modal__title" style={{ fontSize: 18 }}>Add New Unit</h2>
            <p className="modal__desc" style={{ fontSize: 13 }}>Register a unit to your property portfolio.</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Section: Core Unit Info */}
        <div className="modal-section" style={{ marginBottom: 24 }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Home size={16} color="var(--clay)" />
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Unit Information</h4>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: 11 }}>Select Target Property</label>
            <select
              className="form-input"
              style={{ fontSize: 13, padding: '10px 14px' }}
              value={targetPropertyUuid}
              onChange={e => setTargetPropertyUuid(e.target.value)}
            >
              <option value="">-- Choose Property --</option>
              {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
            </select>
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
              <select
                className="form-input"
                style={{ fontSize: 13, padding: '10px 14px' }}
                value={formData.unitType}
                onChange={e => setFormData({ ...formData, unitType: e.target.value })}
              >
                <option value="">Select Type</option>
                <option value="Flat / Apartment">Flat / Apartment</option>
                <option value="Duplex">Duplex</option>
                <option value="Studio">Studio</option>
                <option value="Bungalow">Bungalow</option>
                <option value="Town House">Town House</option>
                <option value="Office Space">Office Space</option>
              </select>
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
                  <select 
                    className="form-input"
                    style={{ fontSize: 13, padding: '10px 14px' }}
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
                      <option key={t.uuid} value={t.uuid}>{t.firstName} {t.lastName} ({t.email})</option>
                    ))}
                  </select>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
                    <label className="form-label" style={{ fontSize: 11 }}>Initial Amount Paid (₦)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      value={formData.rentAmountPaid}
                      onChange={e => setFormData({ ...formData, rentAmountPaid: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Rent Cycle</label>
                    <select
                      className={cn("form-input", !formData.rentType && "form-input--error")}
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      value={formData.rentType}
                      onChange={e => setFormData({ ...formData, rentType: e.target.value })}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
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
                        <Calendar size={12} /> Rent End Date
                    </label>
                    <input
                      type="date"
                      className={cn("form-input", !formData.rentDueDate && "form-input--error")}
                      style={{ fontSize: 13, padding: '10px 14px' }}
                      value={formData.rentDueDate}
                      onChange={e => setFormData({ ...formData, rentDueDate: e.target.value })}
                    />
                  </div>
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

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
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
    </div>
  )
}

