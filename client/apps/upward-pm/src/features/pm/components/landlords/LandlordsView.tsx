'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, User, Building2, Mail, Phone } from 'lucide-react'
import { useProperties, useLandlords } from '@/features/pm/hooks/useProperties'
import { AddLandlordModal } from './modals/AddLandlordModal'
import { DataTable, Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'

interface LandlordData {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone: string;
  propertiesCount: number;
}

export function LandlordsView() {
  const router = useRouter()
  const { data: properties = [] } = useProperties()
  const { data: apiLandlords = [] } = useLandlords()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const landlords = useMemo(() => {
    return apiLandlords.map(l => {
      const propCount = properties.filter(p => p.landlordEmail === l.email).length
      return {
        id: l.id,
        uuid: l.uuid,
        name: l.name,
        email: l.email,
        phone: l.phone,
        propertiesCount: propCount,
      }
    }).filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [apiLandlords, properties, searchQuery])

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
      <PageHeader 
        title="Landlords" 
        subtitle="Manage your landlord database and portfolio assignments."
        actions={
          <button 
            className="btn btn--primary" 
            style={{ borderRadius: 12 }}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={18} /> Add a landlord
          </button>
        }
      />

      <AddLandlordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <StatGrid>
        <StatCard 
          label="Total Landlords" 
          value={landlords.length} 
          icon={User} 
          variant="accent"
        />
        <StatCard 
          label="Properties Managed" 
          value={properties.length} 
          icon={Building2} 
        />
      </StatGrid>

      <ControlBar>
        <SearchInput 
          value={searchQuery} 
          onChange={setSearchQuery} 
          placeholder="Search by name, email, phone..." 
        />
        
        <FilterDropdown 
          label="All Employees" 
          value="all"
          options={[
            { label: 'All Employees', value: 'all' }
          ]}
        />
      </ControlBar>

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
