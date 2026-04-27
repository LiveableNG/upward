import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useTenants } from '../../hooks/useTenants'
import { TenantCard } from './TenantCard'

export const TenantList: React.FC = () => {
  const { data: tenants } = useTenants()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTenants = tenants.filter(t => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase()
    const email = (t.email || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

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
      </div>

      <div className="tenants-list animate-fade-in">
        {filteredTenants.map((tenant) => (
          <TenantCard key={tenant.uuid} tenant={tenant} />
        ))}
        {filteredTenants.length === 0 && (
          <div className="empty-state">
            <p>No tenants found matching your search.</p>
          </div>
        )}
      </div>
    </>
  )
}
