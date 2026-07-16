
'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Building2, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useUpdateMemberPermissions } from '@/features/pm/hooks/useTeam'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { cn } from '@/lib/utils'

interface UpdatePermissionsModalProps {
  collaboration: any
  onClose: () => void
}

export function UpdatePermissionsModal({ collaboration, onClose }: UpdatePermissionsModalProps) {
  const { mutate: updatePermissions, isPending } = useUpdateMemberPermissions()
  const { data: properties = [], refetch, isLoading: loadingProperties } = useProperties()
  const [propertySearch, setPropertySearch] = useState('')
  
  useEffect(() => {
    refetch()
  }, [refetch])

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

  const filteredProperties = properties.filter((p: any) =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase())
  )

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Team Permissions"
      subtitle={`Update access for ${collaboration.member.firstName} ${collaboration.member.lastName}.`}
      maxWidth={540}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1, height: 48, borderRadius: 12 }} onClick={onClose}>Cancel</button>
            <button 
                type="submit" 
                form="update-permissions-form"
                className="btn btn--primary" 
                style={{ flex: 1, height: 48, borderRadius: 12 }} 
                disabled={isPending || (formData.accessLevel === 'CUSTOM' && formData.propertyUuids.length === 0)}
            >
              {isPending ? 'Saving...' : 'Update Permissions'}
            </button>
        </div>
      }
    >
        <form id="update-permissions-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
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
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={propertySearch}
                        onChange={e => setPropertySearch(e.target.value)}
                        style={{
                            width: '100%',
                            height: 38,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            padding: '8px 12px',
                            fontSize: 13,
                            marginTop: 8,
                            marginBottom: 8,
                            background: 'var(--bg)'
                        }}
                    />
                    <div style={{ 
                        maxHeight: 250, 
                        overflow: 'auto', 
                        border: '1px solid var(--border)', 
                        borderRadius: 16,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        background: 'var(--bg)'
                    }}>
                        {loadingProperties ? (
                            <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
                                Loading properties...
                            </div>
                        ) : filteredProperties.length === 0 ? (
                            <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
                                No properties found
                            </div>
                        ) : (
                            filteredProperties.map((p: any) => (
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
                            ))
                        )}
                    </div>
                </div>
            )}

        </form>
        <style jsx>{`
            .access-btn--active {
                border-color: var(--clay) !important;
                background: var(--bg) !important;
                color: var(--clay) !important;
            }
        `}</style>
    </Modal>
  )
}
