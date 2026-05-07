'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreVertical, User, Building2, Mail, Phone } from 'lucide-react'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { AddLandlordModal } from './modals/AddLandlordModal'

export function LandlordsView() {
  const router = useRouter()
  const { data: properties = [] } = useProperties()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Aggregate unique landlords from properties
  const landlords = useMemo(() => {
    const map = new Map<string, { name: string, email: string, phone: string, propertiesCount: number }>()
    
    properties.forEach(prop => {
      if (prop.landlordName) {
        const key = `${prop.landlordName.toLowerCase()}-${(prop.landlordEmail || '').toLowerCase()}`
        const existing = map.get(key)
        if (existing) {
          existing.propertiesCount += 1
        } else {
          map.set(key, {
            name: prop.landlordName,
            email: prop.landlordEmail || '',
            phone: prop.landlordPhone || '',
            propertiesCount: 1
          })
        }
      }
    })
    
    return Array.from(map.values()).filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [properties, searchQuery])

  return (
    <div className="landlords-page animate-fade-in" style={{ paddingBottom: 40 }}>
      <header className="properties-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="dashboard__title" style={{ fontSize: 28 }}>Landlords</h1>
          <p className="dashboard__subtitle" style={{ fontSize: 14 }}>Manage your landlord database and portfolio assignments.</p>
        </div>
        <button 
          className="btn btn--primary" 
          style={{ borderRadius: 100, padding: '14px 32px', height: 'fit-content' }}
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={20} style={{ marginRight: 10 }} />
          Add a landlord
        </button>
      </header>

      <AddLandlordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* Stats Summary - Based on screenshot concept */}
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 20, 
        background: 'var(--forest-faint)', 
        padding: '28px 36px', 
        borderRadius: 24, 
        marginBottom: 48,
        border: '1px solid var(--forest-glow)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ 
          background: 'var(--forest-glow)', 
          padding: 16, 
          borderRadius: 16,
          color: 'var(--forest)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={32} strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Total Landlords</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--dark)', lineHeight: 1 }}>{landlords.length}</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="filters-bar" style={{ marginBottom: 32, gap: 24, padding: '20px 24px' }}>
        <div className="search-input" style={{ maxWidth: 480, background: 'var(--ivory-dim)' }}>
          <Search size={20} className="search-icon" color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 14, background: 'transparent' }}
          />
        </div>
        
        <div className="filter-group" style={{ background: 'white', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Employee:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', marginLeft: 8 }}>
            <option>All Employees</option>
          </select>
        </div>
      </div>

      {/* Landlords Table */}
      <div className="tenant-table-container animate-fade-in" style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', background: 'white', boxShadow: 'var(--shadow-md)' }}>
        <table className="tenant-table">
          <thead style={{ background: 'var(--ivory-dim)' }}>
            <tr>
              <th style={{ padding: '20px 24px' }}>NAME</th>
              <th style={{ padding: '20px 24px' }}>EMAIL</th>
              <th style={{ padding: '20px 24px' }}>PHONE NUMBER</th>
            </tr>
          </thead>
          <tbody>
            {landlords.map((landlord, idx) => (
              <tr 
                key={idx} 
                className="tenant-table-row" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const key = encodeURIComponent(`${landlord.name.toLowerCase()}-${landlord.email.toLowerCase()}`)
                  router.push(`/landlords/${key}`)
                }}
              >
                <td style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 14, 
                      background: idx % 3 === 0 ? 'var(--dark)' : idx % 3 === 1 ? 'var(--forest)' : 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      {landlord.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 2 }}>{landlord.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={12} /> {landlord.propertiesCount} Properties
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <Mail size={16} color="var(--text-muted)" style={{ opacity: 0.7 }} />
                    {landlord.email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No email</span>}
                  </div>
                </td>
                <td style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <Phone size={16} color="var(--text-muted)" style={{ opacity: 0.7 }} />
                    {landlord.phone || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No phone</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {landlords.length === 0 && (
          <div style={{ padding: 100, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ background: 'var(--ivory-dim)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <User size={40} style={{ opacity: 0.2 }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>No Landlords</h3>
            <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto' }}>You haven't added any landlords yet or no landlords are associated with your properties.</p>
          </div>
        )}
      </div>
    </div>
  )
}
