
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
    <div className="modal-overlay" style={{ 
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    }}>
      <div className="modal-container" style={{ 
          maxWidth: 540, 
          width: '100%',
          background: 'white',
          borderRadius: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.3s ease-out'
      }}>
        <header className="modal-header" style={{ padding: '32px 32px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>Invite Team Member</h2>
            <p className="modal-subtitle" style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Add a collaborator to manage your properties.</p>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 8, 
                border: '1px solid var(--border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '0 32px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. John Doe"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', paddingLeft: 44, height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', paddingLeft: 44, height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>
            </div>

            <div className="form-group">
                <label className="form-label">Access Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                    <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, accessLevel: 'ALL' })}
                        className={cn('access-btn', formData.accessLevel === 'ALL' && 'access-btn--active')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px', borderRadius: 16, border: '2px solid var(--border)', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <Shield size={24} color={formData.accessLevel === 'ALL' ? 'var(--clay)' : 'var(--text-muted)'} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>All Properties</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Auto-access to all portfolios.</div>
                        </div>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, accessLevel: 'CUSTOM' })}
                        className={cn('access-btn', formData.accessLevel === 'CUSTOM' && 'access-btn--active')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px', borderRadius: 16, border: '2px solid var(--border)', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <Building2 size={24} color={formData.accessLevel === 'CUSTOM' ? 'var(--clay)' : 'var(--text-muted)'} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>Custom Selection</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Pick specific properties.</div>
                        </div>
                    </button>
                </div>
            </div>

            {formData.accessLevel === 'CUSTOM' && (
                <div className="form-group">
                    <label className="form-label">Select Properties ({formData.propertyUuids.length})</label>
                    <div style={{ 
                        maxHeight: 180, 
                        overflow: 'auto', 
                        border: '1px solid var(--border)', 
                        borderRadius: 16,
                        padding: 8,
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        background: 'var(--bg)'
                    }}>
                        {properties.map((p: any) => (
                            <div 
                                key={p.uuid}
                                onClick={() => toggleProperty(p.uuid)}
                                style={{ 
                                    padding: '12px 14px', 
                                    borderRadius: 12, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: formData.propertyUuids.includes(p.uuid) ? 'white' : 'transparent',
                                    border: formData.propertyUuids.includes(p.uuid) ? '1px solid var(--border)' : '1px solid transparent',
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

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 16, display: 'flex', gap: 12, border: '1px solid var(--border)' }}>
                <AlertCircle size={18} color="var(--clay)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    We'll create a shadow account for this member. They will receive an email to claim it and set their password.
                </p>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '32px 0 0 0', display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1, height: 48, borderRadius: 12 }} onClick={onClose}>Cancel</button>
            <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ flex: 1, height: 48, borderRadius: 12 }} 
                disabled={isPending || (formData.accessLevel === 'CUSTOM' && formData.propertyUuids.length === 0)}
            >
              {isPending ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes modalSlideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .access-btn--active {
            border-color: var(--clay) !important;
            background: var(--bg) !important;
            color: var(--clay) !important;
        }
      `}</style>
    </div>
  )
}
