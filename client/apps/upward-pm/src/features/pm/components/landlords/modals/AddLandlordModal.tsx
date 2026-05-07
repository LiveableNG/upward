'use client'

import React, { useState } from 'react'
import { X, User, Mail, Phone, Briefcase } from 'lucide-react'
import { useToast } from '@/components/common/Toast'

interface AddLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLandlordModal({ isOpen, onClose }: AddLandlordModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  })
  
  const { success } = useToast()

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    success('Landlord details captured! Note: Landlords appear in the list once assigned to a property.')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ padding: 10, background: 'var(--forest-faint)', borderRadius: 12, color: 'var(--forest)' }}>
              <User size={20} />
            </div>
            <div>
              <h2 className="modal__title">Add Landlord</h2>
              <p className="modal__desc">Enter the landlord's contact information.</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. John Doe" 
                required
                style={{ paddingLeft: 40 }}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="landlord@email.com" 
                required
                style={{ paddingLeft: 40 }}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                className="form-input" 
                placeholder="+234..." 
                required
                style={{ paddingLeft: 40 }}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company (Optional)</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Acme Realty" 
                style={{ paddingLeft: 40 }}
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
              Save Landlord
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
