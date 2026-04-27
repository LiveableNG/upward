import React, { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useTenantActions } from '../../../hooks/useTenants'

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose }) => {
  const { createTenant } = useTenantActions()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.phone && !/^\+234\d{10}$/.test(formData.phone)) {
      alert('Phone number must be in format +2348000000000')
      return
    }

    createTenant.mutate(formData, {
      onSuccess: () => {
        setFormData({ firstName: '', lastName: '', email: '', phone: '' })
        onClose()
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Add New Tenant</h2>
            <p className="modal__desc">Create a new tenant profile to assign to your units.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
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
              disabled={createTenant.isPending}
            >
              {createTenant.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} style={{ marginRight: 8 }} />
                  Create Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
