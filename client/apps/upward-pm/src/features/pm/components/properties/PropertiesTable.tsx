'use client'

import React from 'react'
import { Plus, Search } from 'lucide-react'
import { PropertyTableRow } from './PropertyTableRow'
import { Property, Unit } from '../../services/propertyService'

interface PropertiesTableProps {
  properties: Property[];
  units: Unit[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddProperty: () => void;
  onEditProperty: (property: Property) => void;
  onManageUnits: (name: string) => void;
  onViewPropertyDetail: (property: Property) => void;
}

export function PropertiesTable({
  properties,
  units,
  searchQuery,
  setSearchQuery,
  onAddProperty,
  onEditProperty,
  onManageUnits,
  onViewPropertyDetail
}: PropertiesTableProps) {
  return (
    <div className="properties-view-wrapper animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="dashboard__title">Properties</h1>
        <button className="btn btn--primary" onClick={onAddProperty} style={{ borderRadius: 100 }}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add a property
        </button>
      </div>

      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#e0f2fe', borderRadius: 12, padding: '24px 32px', marginBottom: 32, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#0284c7' }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.1)', padding: 6, borderRadius: '50%' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Total properties</span>
        </div>
        <span style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>{properties.length}</span>
      </div>

      <div className="filters-bar" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-input" style={{ flex: '1 1 200px', minWidth: 200 }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search Property" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group" style={{ background: 'white', border: '1px solid var(--border)', flex: '1 1 120px' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Service Type:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', width: '100%' }}>
            <option>All</option>
          </select>
        </div>
        <div className="filter-group" style={{ background: 'white', border: '1px solid var(--border)', flex: '1 1 120px' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Purpose:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', width: '100%' }}>
            <option>All</option>
          </select>
        </div>
      </div>

      <div className="tenant-table-container animate-fade-in" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table className="tenant-table" style={{ background: 'white' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th>PROPERTY</th>
              <th>LANDLORDS</th>
              <th style={{ textAlign: 'center' }}>UNITS</th>
              <th style={{ textAlign: 'center' }}>TENANTS</th>
              <th className="col-actions" style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((prop, idx) => {
              const propUnits = units.filter(u => (u as any).propertyUuid === prop.uuid || u.propertyId === prop.id);
              const propTenantsCount = propUnits.filter(u => u.tenant || (u as any).tenantUuid).length;
              
              return (
                <PropertyTableRow 
                  key={prop.uuid} 
                  property={prop} 
                  unitCount={propUnits.length || prop.totalUnits || 0}
                  tenantCount={propTenantsCount}
                  index={idx + 1}
                  onEdit={() => onEditProperty(prop)} 
                  onManageUnits={() => onViewPropertyDetail(prop)} 
                />
              )
            })}
          </tbody>
        </table>
        {properties.length === 0 && (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-muted">No properties found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
