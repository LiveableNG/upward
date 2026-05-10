
'use client'

import React, { useState } from 'react'
import { X, Mail, User, Shield, Building2, Check, AlertCircle } from 'lucide-react'
import { useInviteMember } from '@/features/pm/hooks/useTeam'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { cn } from '@/lib/utils'

interface InviteMemberModalProps {
  onClose: () => void
}

export function InviteMemberModal({ onClose }: InviteMemberModalProps) {
  const { mutate: inviteMember, isPending } = useInviteMember()
  const { data: properties = [] } = useProperties()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accessLevel: 'CUSTOM' as 'ALL' | 'CUSTOM',
    propertyUuids: [] as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMember(formData, {
        onSuccess: onClose
    })
  }

  const toggleProperty = (uuid: string) => {
    setFormData(prev => ({
        ...prev,
        propertyUuids: prev.propertyUuids.includes(uuid)
            ? prev.propertyUuids.filter(u => u !== uuid)
            : [...prev.propertyUuids, uuid]
    }))
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-container" style={{ maxWidth: 540, width: '90%' }}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Invite Team Member</h2>
            <p className="modal-subtitle">Add a collaborator to manage your properties.</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. John Doe"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                />
              </div>
            </div>

            <div className="form-group">
                <label className="form-label">Access Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, accessLevel: 'ALL' })}
                        className={cn('access-btn', formData.accessLevel === 'ALL' && 'access-btn--active')}
                    >
                        <Shield size={20} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700 }}>All Properties</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Automatic access to current and future properties.</div>
                        </div>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, accessLevel: 'CUSTOM' })}
                        className={cn('access-btn', formData.accessLevel === 'CUSTOM' && 'access-btn--active')}
                    >
                        <Building2 size={20} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700 }}>Custom Selection</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Choose specific properties to share.</div>
                        </div>
                    </button>
                </div>
            </div>

            {formData.accessLevel === 'CUSTOM' && (
                <div className="form-group">
                    <label className="form-label">Select Properties ({formData.propertyUuids.length})</label>
                    <div style={{ 
                        maxHeight: 200, 
                        overflow: 'auto', 
                        border: '1px solid var(--border)', 
                        borderRadius: 12,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                    }}>
                        {properties.map((p: any) => (
                            <div 
                                key={p.uuid}
                                onClick={() => toggleProperty(p.uuid)}
                                style={{ 
                                    padding: '10px 12px', 
                                    borderRadius: 8, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: formData.propertyUuids.includes(p.uuid) ? 'var(--bg)' : 'transparent',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {p.name}
                                {formData.propertyUuids.includes(p.uuid) && <Check size={16} color="var(--forest)" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ background: 'var(--ivory-dim)', padding: 16, borderRadius: 16, display: 'flex', gap: 12 }}>
                <AlertCircle size={18} color="var(--clay)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    We'll create a shadow account for this member. They will receive an email to claim it and set their password.
                </p>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '32px 0 0 0', display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ flex: 1 }} 
                disabled={isPending || (formData.accessLevel === 'CUSTOM' && formData.propertyUuids.length === 0)}
            >
              {isPending ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .access-btn {
            display: flex;
            align-items: center;
            gap: 12;
            padding: 16px;
            border-radius: 16px;
            border: 2px solid var(--border);
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-muted);
        }
        .access-btn--active {
            border-color: var(--clay);
            background: var(--bg);
            color: var(--clay);
            box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  )
}
