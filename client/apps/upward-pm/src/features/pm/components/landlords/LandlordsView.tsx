'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, User, Building2, Mail, Phone } from 'lucide-react'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { AddLandlordModal } from './modals/AddLandlordModal'
import { DataTable, Column } from '@/components/common/DataTable'

interface LandlordData {
  name: string;
  email: string;
  phone: string;
  propertiesCount: number;
}

export function LandlordsView() {
  const router = useRouter()
  const { data: properties = [] } = useProperties()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Aggregate unique landlords from properties
  const landlords = useMemo(() => {
    const map = new Map<string, LandlordData>()
    
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

  const columns: Column<LandlordData>[] = [
    {
      header: 'NAME',
      render: (landlord, idx) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: idx % 3 === 0 ? 'var(--dark)' : idx % 3 === 1 ? 'var(--forest)' : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)'
          }}>
            {landlord.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 2 }}>{landlord.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} /> {landlord.propertiesCount} Properties
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'EMAIL',
      render: (landlord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
          <Mail size={16} color="var(--text-muted)" style={{ opacity: 0.7 }} />
          {landlord.email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No email</span>}
        </div>
      )
    },
    {
      header: 'PHONE NUMBER',
      render: (landlord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
          <Phone size={16} color="var(--text-muted)" style={{ opacity: 0.7 }} />
          {landlord.phone || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No phone</span>}
        </div>
      )
    }
  ];

  return (
    <div className="landlords-page animate-fade-in" style={{ paddingBottom: 40 }}>
      <header className="properties-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="dashboard__title">Landlords</h1>
          <p className="dashboard__subtitle">Manage your landlord database and portfolio assignments.</p>
        </div>
        <button 
          className="btn btn--primary" 
          style={{ borderRadius: 100, padding: '12px 28px', height: 'fit-content' }}
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={18} style={{ marginRight: 8 }} />
          Add a landlord
        </button>
      </header>

      <AddLandlordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 20, 
        background: 'var(--forest-faint)', 
        padding: '24px 32px', 
        borderRadius: 24, 
        marginBottom: 48,
        border: '1px solid var(--forest-glow)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ 
          background: 'var(--forest-glow)', 
          padding: 12, 
          borderRadius: 16,
          color: 'var(--forest)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={28} strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Total Landlords</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--dark)', lineHeight: 1 }}>{landlords.length}</p>
        </div>
      </div>

      <div className="filters-bar" style={{ marginBottom: 32, gap: 24 }}>
        <div className="search-input" style={{ maxWidth: 400, background: 'white' }}>
          <Search size={18} className="search-icon" color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 14 }}
          />
        </div>
        
        <div className="filter-group" style={{ background: 'white', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Employee:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', marginLeft: 8 }}>
            <option>All Employees</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={landlords}
        onRowClick={(landlord) => {
          const key = encodeURIComponent(`${landlord.name.toLowerCase()}-${landlord.email.toLowerCase()}`)
          router.push(`/landlords/${key}`)
        }}
        emptyMessage="No landlords found. You haven't added any landlords yet or no landlords are associated with your properties."
        pageSize={10}
      />
    </div>
  )
}
