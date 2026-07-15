'use client'

import React, { useState, useMemo } from 'react'
import { X, Search, ChevronDown, User, Building, Check } from 'lucide-react'
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
      list = tenants.filter(t => !(!t.phone && (!t.email || t.email.endsWith('@upward.com')))).map(t => ({
        uuid: t.uuid,
        name: t.commercialName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Tenant',
        email: t.email || 'N/A',
        phone: t.phone,
        propertyUuid: t.units?.[0]?.property?.uuid,
        propertyTitle: t.units?.[0]?.property?.name,
        unitTitle: t.units?.[0]?.unitName,
        address: t.units?.[0]?.property?.address,
        type: 'TENANT' as const
      }))
    } else {
      const landlordMap = new Map()
      properties.forEach(p => {
        if (p.landlordName && !landlordMap.has(p.landlordEmail || p.landlordName)) {
          landlordMap.set(p.landlordEmail || p.landlordName, {
            uuid: `landlord-${p.uuid}`,
            name: p.landlordName,
            email: p.landlordEmail || 'N/A',
            phone: p.landlordPhone || 'N/A',
            propertyUuid: p.uuid,
            propertyTitle: p.name,
            address: p.address,
            type: 'LANDLORD' as const
          })
        }
      })
      list = Array.from(landlordMap.values())
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
        background: 'white', borderRadius: 28, width: '100%', maxWidth: 580, 
        height: '95vh', maxHeight: 960, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Select Recipient</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 12, display: 'flex', gap: 4 }}>
            {[
              { id: 'TENANT', label: 'Tenants', icon: User },
              { id: 'LANDLORD', label: 'Landlords', icon: Building }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{ 
                  flex: 1, height: 36, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  color: activeTab === tab.id ? 'var(--forest)' : '#64748b',
                  boxShadow: activeTab === tab.id ? '0 2px 4px -1px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()} by name or email...`}
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #e2e8f0', paddingLeft: 42, fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <select 
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px', appearance: 'none', fontSize: 13, outline: 'none', background: 'white', cursor: 'pointer' }}
              value={selectedPropertyUuid}
              onChange={e => setSelectedPropertyUuid(e.target.value)}
              className="filter-input"
            >
              <option value="">Filter by property (All Properties)</option>
              {properties.map(p => (
                <option key={p.uuid} value={p.uuid}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredRecipients.map(item => (
              <div 
                key={item.uuid}
                onClick={() => onSelect(item)}
                className="recipient-item"
                style={{ 
                  padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'all 0.2s ease',
                  border: '1px solid transparent'
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--forest-faint, #e8f5e9)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {item.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.phone || item.email}</span>
                    {item.propertyTitle && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                        <span style={{ color: 'var(--forest)', fontWeight: 700, fontSize: 11 }}>{item.propertyTitle}</span>
                      </>
                    )}
                  </div>
                  {item.address && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.address}
                    </div>
                  )}
                </div>
                <div className="check-indicator" style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'transparent', transition: 'all 0.2s' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
              </div>
            ))}
            
            {filteredRecipients.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: 16, margin: '0 4px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <Search size={24} style={{ color: '#cbd5e1' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No results found</h3>
                <p style={{ color: '#64748b', fontSize: 13, maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
                  We couldn't find any {activeTab.toLowerCase()} matching your criteria.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
          <button 
            className="btn btn--primary" 
            style={{ width: '100%', borderRadius: 12, height: 44, background: 'var(--forest)', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 6px -1px rgba(26, 77, 46, 0.1)' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>

        <style jsx>{`
          .recipient-item:hover {
            background: #f8fafc;
            border-color: #f1f5f9;
            transform: translateY(-1px);
          }
          .recipient-item:hover .check-indicator {
            border-color: var(--forest);
            color: var(--forest);
          }
          .filter-input:focus {
            border-color: var(--forest) !important;
            box-shadow: 0 0 0 4px rgba(26, 77, 46, 0.05);
          }
          .animate-scale-in {
            animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}