'use client'

import React, { useState } from 'react'
import { User, Mail, Phone, Briefcase } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'
import { useCreateLandlord } from '@/features/pm/hooks/useProperties'

interface AddLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLandlordModal({ isOpen, onClose }: AddLandlordModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  const { success, error } = useToast()
  const { mutate, isPending } = useCreateLandlord()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(formData, {
      onSuccess: () => {
        success('Landlord created successfully! An email has been sent to them.')
        onClose()
      },
      onError: (err: any) => {
        error(err.message || 'Failed to create landlord')
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Landlord"
      subtitle="Enter the landlord's contact information."
      icon={User}
      maxWidth={500}
      footer={
        <>
          <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            form="add-landlord-form"
            className="btn btn--primary" 
            style={{ flex: 1 }}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Landlord'}
          </button>
        </>
      }
    >
      <form id="add-landlord-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. John Doe" 
                required
                style={{ paddingLeft: 40, width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="landlord@email.com" 
                required
                style={{ paddingLeft: 40, width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                className="form-input" 
                placeholder="+234..." 
                required
                style={{ paddingLeft: 40, width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

        </div>
      </form>
    </Modal>
  )
}
