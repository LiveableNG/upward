'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { X, Search, ChevronDown, User, Building, Check } from 'lucide-react'
import { useTenants } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'

export interface Recipient {
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

interface BulkRecipientSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (recipients: Recipient[]) => void
  initialSelected?: Recipient[]
  templateUuid?: string
}

export function BulkRecipientSelectModal({ isOpen, onClose, onConfirm, initialSelected = [], templateUuid }: BulkRecipientSelectModalProps) {
  const { data: tenants = [] } = useTenants()
  const { data: properties = [] } = useProperties()
  
  const [activeTab, setActiveTab] = useState<'TENANT' | 'LANDLORD'>('TENANT')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')
  const [filterNoWelcome, setFilterNoWelcome] = useState(false)

  const [selectedMap, setSelectedMap] = useState<Map<string, Recipient>>(new Map())

  // Initialize selectedMap when modal opens
  useEffect(() => {
    if (isOpen) {
      const map = new Map<string, Recipient>()
      initialSelected.forEach(r => map.set(r.uuid, r))
      setSelectedMap(map)
      setFilterNoWelcome(!!templateUuid)
    }
  }, [isOpen, initialSelected, templateUuid])

  const filteredRecipients = useMemo<Recipient[]>(() => {
    let list: Recipient[] = []
    
    if (activeTab === 'TENANT') {
      let tenantList = tenants.filter(t => !(!t.phone && (!t.email || t.email.endsWith('@upward.com'))))
      if (filterNoWelcome && templateUuid === 'system-onboarding-1') {
        tenantList = tenantList.filter(t => !t.hasReceivedWelcomeTemplate)
      }
      list = tenantList.map(t => ({
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
  }, [activeTab, tenants, properties, searchQuery, selectedPropertyUuid])

  const handleToggle = (recipient: Recipient) => {
    const newMap = new Map(selectedMap)
    if (newMap.has(recipient.uuid)) {
      newMap.delete(recipient.uuid)
    } else {
      newMap.set(recipient.uuid, recipient)
    }
    setSelectedMap(newMap)
  }

  const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every(r => selectedMap.has(r.uuid))

  const handleToggleAll = () => {
    const newMap = new Map(selectedMap)
    if (allFilteredSelected) {
      filteredRecipients.forEach(r => newMap.delete(r.uuid))
    } else {
      filteredRecipients.forEach(r => newMap.set(r.uuid, r))
    }
    setSelectedMap(newMap)
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedMap.values()))
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Recipients"
      maxWidth={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
          <button 
            onClick={onClose}
            className="btn btn--secondary"
            style={{ borderRadius: 12, padding: '0 20px', height: 44 }}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="btn btn--primary"
            style={{ borderRadius: 12, padding: '0 24px', height: 44, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Add {selectedMap.size} Recipients
          </button>
        </div>
      }
    >
        {/* Tabs */}
        <div style={{ padding: '0 24px 16px', marginTop: 16 }}>
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
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
            
            <div style={{ width: 250 }}>
              <FormSelect
                value={selectedPropertyUuid}
                onChange={val => setSelectedPropertyUuid(val)}
                options={[
                  { label: 'All Properties', value: '' },
                  ...properties.map(p => ({ label: p.name, value: p.uuid }))
                ]}
              />
            </div>
          </div>
          
          {templateUuid === 'system-onboarding-1' && activeTab === 'TENANT' && (
            <div style={{ marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--clay)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filterNoWelcome}
                  onChange={(e) => setFilterNoWelcome(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--clay)' }}
                />
                Filter to tenants who haven't received the Getting Started template
              </label>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button 
              onClick={handleToggleAll}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${allFilteredSelected ? 'var(--forest)' : '#cbd5e1'}`, background: allFilteredSelected ? 'var(--forest)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {allFilteredSelected && <Check size={12} color="white" strokeWidth={4} />}
              </div>
              Select All {filteredRecipients.length > 0 ? `(${filteredRecipients.length})` : ''}
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clay)' }}>
              {selectedMap.size} Selected
            </div>
          </div>
        </div>

        {/* List Content */}
        <div style={{ overflowY: 'auto', maxHeight: '45vh', padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredRecipients.map(item => {
              const isSelected = selectedMap.has(item.uuid)
              return (
                <div 
                  key={item.uuid}
                  onClick={() => handleToggle(item)}
                  className="recipient-item"
                  style={{ 
                    padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.2s ease',
                    border: `1px solid ${isSelected ? 'var(--forest)' : 'transparent'}`,
                    background: isSelected ? 'var(--forest-faint)' : 'transparent'
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: isSelected ? 'white' : 'var(--forest-faint, #e8f5e9)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
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
                  <div className="check-indicator" style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--forest)' : '#e2e8f0'}`, background: isSelected ? 'var(--forest)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'white' : 'transparent', transition: 'all 0.2s' }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              )
            })}
            
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
      <style jsx>{`
        .recipient-item:hover {
          background: #f8fafc;
        }
        .recipient-item:hover .check-indicator {
          border-color: var(--forest) !important;
        }
        .filter-input:focus {
          border-color: var(--forest) !important;
          box-shadow: 0 0 0 3px var(--forest-faint);
        }
      `}</style>
    </Modal>
  )
}
