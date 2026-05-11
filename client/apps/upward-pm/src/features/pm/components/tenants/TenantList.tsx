'use client'

import React, { useState, useMemo } from 'react'
import { Search, X, Home, Users, CheckCircle2, Loader2 } from 'lucide-react'
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { DataTable, Column } from '@/components/common/DataTable'
import { useRouter } from 'next/navigation'
import { Tenant } from '../../services/tenantService'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'

export const TenantList: React.FC = () => {
  const router = useRouter()
  const { data: tenants = [] } = useTenants()
  const { data: properties = [] } = useProperties()
  const { bulkInvite, inviteTenant } = useTenantActions()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_upward' | 'pending'>('all')
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set())

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase()
      const email = (t.email || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      
      const matchesSearch = fullName.includes(query) || email.includes(query)
      
      const matchesProperty = propertyFilter === 'all' || 
        t.units?.some(u => u.property?.uuid === propertyFilter || u.property?.name === propertyFilter)

      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'on_upward' && (t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED')) ||
        (statusFilter === 'pending' && t.inviteStatus !== 'ON_UPWARD' && t.inviteStatus !== 'ACCEPTED')

      return matchesSearch && matchesProperty && matchesStatus
    })
  }, [tenants, searchQuery, propertyFilter, statusFilter])

  const pendingTenants = useMemo(() => {
    return filteredTenants.filter(t => t.inviteStatus !== 'ON_UPWARD' && t.inviteStatus !== 'ACCEPTED')
  }, [filteredTenants])

  const handleSelectTenant = (uuid: string, selected: boolean) => {
    const newSelection = new Set(selectedTenants)
    if (selected) {
      newSelection.add(uuid)
    } else {
      newSelection.delete(uuid)
    }
    setSelectedTenants(newSelection)
  }

  const handleBulkInvite = () => {
    if (selectedTenants.size === 0) return
    bulkInvite.mutate(Array.from(selectedTenants), {
      onSuccess: () => {
        setSelectedTenants(new Set())
      }
    })
  }

  const clearSelection = () => setSelectedTenants(new Set())

  const columns: Column<Tenant>[] = [
    {
      header: 'TENANT NAME',
      render: (tenant) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: 'var(--dark)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {((tenant.firstName || '')[0] || '').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14, marginBottom: 2 }}>
              {tenant.firstName} {tenant.lastName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tenant.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'RESIDENCE',
      render: (tenant) => (
        tenant.units && tenant.units.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {tenant.units.map((unit) => (
              <div key={unit.uuid} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{unit.unitName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{unit.property.name}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>N/A</span>
        )
      )
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (tenant) => {
        const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'
        const isSelected = selectedTenants.has(tenant.uuid)
        
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {isOnUpward ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                color: 'var(--forest)', 
                background: 'var(--forest-faint)', 
                padding: '6px 12px', 
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <CheckCircle2 size={14} />
                ON UPWARD
              </div>
            ) : tenant.inviteStatus === 'PENDING' || tenant.inviteStatus === 'PROCESSING' ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                color: 'var(--accent)', 
                background: 'var(--accent-faint)', 
                padding: '6px 12px', 
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <Loader2 size={14} className="animate-spin" />
                PROCESSING
              </div>
            ) : (
              <button 
                className="btn btn--sm"
                onClick={(e) => {
                  e.stopPropagation()
                  inviteTenant.mutate(tenant.uuid)
                }}
                disabled={inviteTenant.isPending}
                style={{ 
                  fontSize: 12, 
                  padding: '6px 16px',
                  background: tenant.inviteSentAt ? 'var(--ivory-dark)' : 'var(--forest)',
                  color: tenant.inviteSentAt ? 'var(--text-muted)' : 'white'
                }}
              >
                {inviteTenant.isPending ? <Loader2 size={14} className="animate-spin" /> : (tenant.inviteSentAt ? 'Remind' : 'Invite')}
              </button>
            )}
            
            {!isOnUpward && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: 4, 
                cursor: 'pointer' 
              }} onClick={(e) => {
                e.stopPropagation();
                handleSelectTenant(tenant.uuid, !isSelected);
              }}>
                 <input 
                   type="checkbox" 
                   checked={isSelected} 
                   onChange={() => {}} 
                   style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--forest)' }} 
                 />
              </div>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className="tenants-view animate-fade-in" style={{ padding: '24px 0' }}>
      <PageHeader 
        title="Tenant Directory" 
        subtitle="Manage your tenants across all properties."
        actions={
          selectedTenants.size > 0 && (
            <button 
              className="btn btn--primary" 
              onClick={() => handleBulkInvite()}
              style={{ borderRadius: 12 }}
            >
              <Users size={18} /> Invite Selected ({selectedTenants.size})
            </button>
          )
        }
      />

      <StatGrid>
        <StatCard 
          label="Total Tenants" 
          value={tenants.length} 
          icon={Users} 
          variant="accent"
        />
        <StatCard 
          label="Onboarding Pending" 
          value={tenants.filter(t => t.inviteStatus === 'PENDING').length} 
          icon={Home} 
        />
      </StatGrid>

      <div className="filters-bar" style={{ background: 'transparent', padding: 0, marginBottom: 32, border: 'none' }}>
        <div className="search-input" style={{ maxWidth: 300, background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
          <Search size={18} className="search-icon" color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search Tenant" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 14 }}
          />
        </div>

        <div className="filter-select" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '0 16px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginRight: 12 }}>Property:</span>
          <select 
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '12px 0', fontSize: 14, fontWeight: 600 }}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.uuid} value={p.uuid}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTenants.size > 0 && (
        <div className="bulk-actions-bar animate-slide-up" style={{ bottom: 32, right: 32, left: 'auto', width: 'auto', borderRadius: 100, padding: '12px 24px', boxShadow: 'var(--shadow-lg)' }}>
          <div className="bulk-actions-info">
            <button className="btn-icon" onClick={clearSelection}>
              <X size={18} />
            </button>
            <span style={{ fontWeight: 700 }}>{selectedTenants.size} Selected</span>
          </div>
          <button 
            className="btn btn--primary" 
            onClick={handleBulkInvite}
            disabled={bulkInvite.isPending}
            style={{ borderRadius: 100, padding: '10px 24px' }}
          >
            {bulkInvite.isPending ? 'Processing...' : 'Remind Selected'}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredTenants}
        onRowClick={(tenant) => router.push(`/tenants/${tenant.uuid}`)}
        emptyMessage="No tenants found matching your search."
        keyExtractor={(tenant) => tenant.uuid}
        rowClassName={(tenant) => selectedTenants.has(tenant.uuid) ? 'selected' : ''}
        pageSize={10}
      />
    </div>
  )
}
