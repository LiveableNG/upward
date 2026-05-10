
'use client'

import React, { useState } from 'react'
import { X, Shield, Building2, Check } from 'lucide-react'
import { useUpdateMemberPermissions } from '@/features/pm/hooks/useTeam'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { cn } from '@/lib/utils'

interface UpdatePermissionsModalProps {
  collaboration: any
  onClose: () => void
}

export function UpdatePermissionsModal({ collaboration, onClose }: UpdatePermissionsModalProps) {
  const { mutate: updatePermissions, isPending } = useUpdateMemberPermissions()
  const { data: properties = [] } = useProperties()
  
  const [formData, setFormData] = useState({
    accessLevel: collaboration.accessLevel as 'ALL' | 'CUSTOM',
    propertyUuids: (collaboration.properties || []).map((p: any) => p.uuid) as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updatePermissions({
        uuid: collaboration.uuid,
        data: formData
    }, {
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
            <h2 className="modal-title">Edit Team Permissions</h2>
            <p className="modal-subtitle">Update access for {collaboration.member.firstName} {collaboration.member.lastName}.</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
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
                        maxHeight: 300, 
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

          </div>

          <div className="modal-footer" style={{ padding: '32px 0 0 0', display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ flex: 1 }} 
                disabled={isPending || (formData.accessLevel === 'CUSTOM' && formData.propertyUuids.length === 0)}
            >
              {isPending ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .access-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-radius: 16px;
            border: 2px solid var(--border);
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-muted);
            text-align: left;
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
