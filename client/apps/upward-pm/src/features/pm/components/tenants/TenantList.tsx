import React, { useState, useMemo } from 'react'
import { Search, Filter, Send, X, CheckSquare, Square, Home, Users } from 'lucide-react'
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { TenantTableRow } from './TenantTableRow'

export const TenantList: React.FC = () => {
  const { data: tenants = [] } = useTenants()
  const { data: properties = [] } = useProperties()
  const { bulkInvite } = useTenantActions()
  
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

  const handleSelectAll = () => {
    if (selectedTenants.size === pendingTenants.length && pendingTenants.length > 0) {
      setSelectedTenants(new Set())
    } else {
      setSelectedTenants(new Set(pendingTenants.map(t => t.uuid)))
    }
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

  return (
    <div className="tenants-view animate-fade-in" style={{ padding: '24px 0' }}>
      {/* Summary Card */}
      <div 
        className="tenant-summary-card" 
        style={{ 
          background: 'var(--forest-faint)', 
          borderRadius: 20, 
          padding: '24px 32px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 20,
          marginBottom: 40,
          maxWidth: 300,
          border: '1px solid rgba(0, 102, 68, 0.1)'
        }}
      >
        <div style={{ 
          width: 56, 
          height: 56, 
          borderRadius: 16, 
          background: 'rgba(0, 102, 68, 0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--forest)'
        }}>
          <Home size={28} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Active tenants</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--dark)' }}>{tenants.length}</div>
        </div>
      </div>

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
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginRight: 12 }}>Employee:</span>
          <select 
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '12px 0', fontSize: 14, fontWeight: 600 }}
          >
            <option value="all">All Employees</option>
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

      <div className="tenant-table-container" style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="tenant-table">
          <thead style={{ background: 'rgba(240, 249, 255, 0.5)' }}>
            <tr>
              <th style={{ padding: '20px 32px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TENANT NAME</th>
              <th style={{ padding: '20px 32px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>RESIDENCE</th>
              <th className="col-actions" style={{ padding: '20px 32px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <TenantTableRow 
                key={tenant.uuid} 
                tenant={tenant} 
                isSelected={selectedTenants.has(tenant.uuid)}
                onSelect={handleSelectTenant}
              />
            ))}
          </tbody>
        </table>
        {filteredTenants.length === 0 && (
          <div className="empty-state" style={{ padding: '80px 40px', textAlign: 'center' }}>
            <Users size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: 16 }} />
            <p className="text-muted">No tenants found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
