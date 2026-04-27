import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { useTenantActions } from '../../../hooks/useTenants'
import { Tenant } from '../../../services/tenantService'

interface EditTenantModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, onClose, tenant }) => {
  const { updateTenant } = useTenantActions()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (tenant) {
      setFormData({
        firstName: tenant.firstName || '',
        lastName: tenant.lastName || '',
        email: tenant.email || '',
        phone: tenant.phone || ''
      })
    }
  }, [tenant, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.phone && !/^\+234\d{10}$/.test(formData.phone)) {
      alert('Phone number must be in format +2348000000000')
      return
    }

    updateTenant.mutate({ 
      uuid: tenant.uuid, 
      data: formData 
    }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Edit Tenant Profile</h2>
            <p className="modal__desc">Update the contact information for this tenant.</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. John" 
                required
                value={formData.firstName} 
                onChange={e => setFormData({ ...formData, firstName: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Doe" 
                required
                value={formData.lastName} 
                onChange={e => setFormData({ ...formData, lastName: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="tenant@example.com" 
              required
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="+2348000000000" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              style={{ flex: 1 }} 
              disabled={updateTenant.isPending}
            >
              {updateTenant.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={18} style={{ marginRight: 8 }} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
