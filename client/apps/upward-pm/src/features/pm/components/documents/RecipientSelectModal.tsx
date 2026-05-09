
'use client'

import React, { useState, useMemo } from 'react'
import { X, Search, ChevronDown, User, Building, Users, Check } from 'lucide-react'
import { useTenants } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'

interface Recipient {
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  propertyUuid?: string;
  propertyTitle?: string;
  unitTitle?: string;
  address?: string;
  type: 'TENANT' | 'LANDLORD';
}

interface RecipientSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (recipient: Recipient) => void
}

export function RecipientSelectModal({ isOpen, onClose, onSelect }: RecipientSelectModalProps) {
  const { data: tenants = [] } = useTenants()
  const { data: properties = [] } = useProperties()
  
  const [activeTab, setActiveTab] = useState<'TENANT' | 'LANDLORD'>('TENANT')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')

  const filteredRecipients = useMemo<Recipient[]>(() => {
    let list: Recipient[] = []
    
    if (activeTab === 'TENANT') {
      list = tenants.map(t => ({
        uuid: t.uuid,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        phone: t.phone,
        propertyUuid: t.units?.[0]?.property?.uuid,
        propertyTitle: t.units?.[0]?.property?.name,
        unitTitle: t.units?.[0]?.unitName,
        address: t.units?.[0]?.property?.address,
        type: 'TENANT' as const
      }))
    } else {
      // Landlords are stored in properties
      // Map properties to landlord entries and filter out duplicates or empty names
      const landlordMap = new Map();
      
      properties.forEach(p => {
        if (p.landlordName && !landlordMap.has(p.landlordEmail || p.landlordName)) {
          landlordMap.set(p.landlordEmail || p.landlordName, {
            uuid: `landlord-${p.uuid}`, // Use property-based uuid for selection
            name: p.landlordName,
            email: p.landlordEmail || 'N/A',
            phone: p.landlordPhone || 'N/A',
            propertyUuid: p.uuid,
            propertyTitle: p.name,
            address: p.address,
            type: 'LANDLORD' as const
          });
        }
      });
      
      list = Array.from(landlordMap.values());
    }

    return list.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProperty = !selectedPropertyUuid || item.propertyUuid === selectedPropertyUuid
      return matchesSearch && matchesProperty
    })
  }, [activeTab, tenants, searchQuery, selectedPropertyUuid])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 
    }}>
      <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ 
        background: 'white', borderRadius: 24, width: '100%', maxWidth: 540, 
        height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Select Recipient</h2>
          <button onClick={onClose} style={{ background: '#f8fafc', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 32px', marginTop: 12 }}>
          <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 12, display: 'flex', gap: 4 }}>
            {[
              { id: 'TENANT', label: 'Tenants', icon: User },
              { id: 'LANDLORD', label: 'Landlords', icon: Building }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{ 
                  flex: 1, height: 38, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  color: activeTab === tab.id ? 'var(--forest)' : '#64748b',
                  boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid #e2e8f0', paddingLeft: 44, fontSize: 14, outline: 'none' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <select 
              style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid #e2e8f0', padding: '0 16px', appearance: 'none', fontSize: 14, outline: 'none', background: 'white' }}
              value={selectedPropertyUuid}
              onChange={e => setSelectedPropertyUuid(e.target.value)}
            >
              <option value="">Select a property</option>
              {properties.map(p => (
                <option key={p.uuid} value={p.uuid}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredRecipients.map(item => (
              <div 
                key={item.uuid}
                onClick={() => onSelect({ uuid: item.uuid, name: item.name, email: item.email, type: item.type })}
                className="recipient-item"
                style={{ 
                  padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--forest)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {item.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{item.phone || item.email}</span>
                    {item.propertyTitle && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                        <span style={{ color: 'var(--forest)', fontWeight: 600 }}>{item.propertyTitle}</span>
                      </>
                    )}
                  </div>
                  {item.address && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.address}
                    </div>
                  )}
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'transparent' }}>
                  <Check size={14} />
                </div>
              </div>
            ))}
            
            {filteredRecipients.length === 0 && (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Users size={40} style={{ color: '#e2e8f0', marginBottom: 12 }} />
                <p style={{ color: '#94a3b8', fontSize: 14 }}>No recipients found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
          <button 
            disabled={filteredRecipients.length === 0}
            className="btn btn--primary" 
            style={{ width: '100%', borderRadius: 16, height: 52, background: 'var(--forest)', fontWeight: 700 }}
            onClick={onClose}
          >
            Done
          </button>
        </div>

        <style jsx>{`
          .recipient-item:hover {
            background: #f8fafc;
          }
          .recipient-item:hover div:last-child {
            border-color: var(--forest);
            color: var(--forest);
          }
        `}</style>
      </div>
    </div>
  )
}
