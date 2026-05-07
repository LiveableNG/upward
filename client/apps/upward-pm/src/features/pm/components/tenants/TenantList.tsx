import React, { useState, useMemo } from 'react'
import { Search, Filter, Send, X, CheckSquare, Square } from 'lucide-react'
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { TenantCard } from './TenantCard'

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
    <>
      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select">
          <Filter size={18} className="filter-icon" />
          <select 
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.uuid} value={p.uuid}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-tabs">
          <button 
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'on_upward' ? 'active' : ''}`}
            onClick={() => setStatusFilter('on_upward')}
          >
            On Upward
          </button>
        </div>
      </div>

      {selectedTenants.size > 0 && (
        <div className="bulk-actions-bar animate-slide-up">
          <div className="bulk-actions-info">
            <button className="btn-icon" onClick={clearSelection}>
              <X size={18} />
            </button>
            <span>{selectedTenants.size} tenants selected</span>
          </div>
          <div className="bulk-actions-buttons">
            <button 
              className="btn btn--primary" 
              onClick={handleBulkInvite}
              disabled={bulkInvite.isPending}
            >
              {bulkInvite.isPending ? (
                'Processing...'
              ) : (
                <>
                  <Send size={16} />
                  Remind Selected
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="tenants-list-header">
        <div className="select-all-container" onClick={handleSelectAll}>
          {selectedTenants.size === pendingTenants.length && pendingTenants.length > 0 ? (
            <CheckSquare size={18} className="text-forest" />
          ) : (
            <Square size={18} className="text-muted" />
          )}
          <span>Select Pending ({pendingTenants.length})</span>
        </div>
      </div>

      <div className="tenants-list animate-fade-in">
        {filteredTenants.map((tenant) => (
          <TenantCard 
            key={tenant.uuid} 
            tenant={tenant} 
            isSelected={selectedTenants.has(tenant.uuid)}
            onSelect={handleSelectTenant}
          />
        ))}
        {filteredTenants.length === 0 && (
          <div className="empty-state">
            <p>No tenants found matching your filters.</p>
          </div>
        )}
      </div>
    </>
  )
}
