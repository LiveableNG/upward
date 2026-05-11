'use client'

import React from 'react'
import { Plus, Search, Menu, Building2 } from 'lucide-react'
import { Property, Unit } from '../../services/propertyService'
import { DataTable, Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'

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
  
  const columns: Column<Property>[] = [
    {
      header: 'PROPERTY',
      render: (prop) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
             {prop.name.charAt(0).toUpperCase()}
          </div>
          <div className="tenant-name-email">
            <span className="tenant-name" style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{prop.name}</span>
            <span className="tenant-email" style={{ fontSize: '11px', color: '#94a3b8' }}>
              {prop.address}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'LANDLORDS',
      render: (prop) => (
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          {prop.landlordName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
              {prop.landlordName}
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </div>
      )
    },
    {
      header: 'UNITS',
      align: 'center',
      render: (prop) => {
        const propUnits = units.filter(u => (u as any).propertyUuid === prop.uuid || u.propertyId === prop.id);
        return <span style={{ fontSize: '13px', color: '#334155' }}>{propUnits.length || prop.totalUnits || 0}</span>;
      }
    },
    {
      header: 'TENANTS',
      align: 'center',
      render: (prop) => {
        const propUnits = units.filter(u => (u as any).propertyUuid === prop.uuid || u.propertyId === prop.id);
        const propTenantsCount = propUnits.filter(u => u.tenant || (u as any).tenantUuid).length;
        return <span style={{ fontSize: '13px', color: '#334155' }}>{propTenantsCount}</span>;
      }
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (prop) => (
        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-icon" onClick={(e) => {
            e.stopPropagation();
            onEditProperty(prop);
          }}>
            <Menu size={16} color="#64748b" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="properties-view-wrapper animate-fade-in">
      <PageHeader 
        title="Properties" 
        subtitle="Manage your property portfolio and units."
        actions={
          <button className="btn btn--primary" onClick={onAddProperty} style={{ borderRadius: 12 }}>
            <Plus size={18} /> Add Property
          </button>
        }
      />

      <StatGrid>
        <StatCard 
          label="Total Properties" 
          value={properties.length} 
          icon={Building2} 
          variant="accent"
        />
        <StatCard 
          label="Total Units" 
          value={units.length} 
          icon={Building2} 
        />
      </StatGrid>

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
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Service Type:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', width: '100%' }}>
            <option>All</option>
          </select>
        </div>
        <div className="filter-group" style={{ background: 'white', border: '1px solid var(--border)', flex: '1 1 120px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Purpose:</span>
          <select className="filter-select-minimal" style={{ border: 'none', background: 'transparent', width: '100%' }}>
            <option>All</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={properties}
        onRowClick={(prop) => onViewPropertyDetail(prop)}
        emptyMessage="No properties found matching your search."
        keyExtractor={(prop) => prop.uuid}
        pageSize={10}
      />
    </div>
  )
}
