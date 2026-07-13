'use client'

import React, { useState } from 'react'
import { ArrowLeft, Search, Eye, LayoutGrid, Wallet, FileText, ClipboardList, Package, ShieldCheck, Edit3 } from 'lucide-react'
import { Property, Unit } from '../../services/propertyService'
import { cn, formatTenantName } from '@/lib/utils'
import { ManualAccountModal } from './modals/ManualAccountModal'
import { DataTable, Column } from '@/components/common/DataTable'

interface PropertyDetailViewProps {
  property: Property;
  units: Unit[];
  onBack: () => void;
  onViewUnit: (unit: Unit) => void;
  onEdit: () => void;
}

export function PropertyDetailView({ property, units, onBack, onViewUnit, onEdit }: PropertyDetailViewProps) {
  const [activeTab, setActiveTab] = useState('Unit')
  const [unitSearch, setUnitSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState<'All' | 'Occupied' | 'Vacant'>('All')
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  const occupiedCount = units.filter(u => u.status === 'OCCUPIED').length
  const vacantCount = units.filter(u => u.status === 'VACANT').length
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0

  const filteredUnits = units.filter(u => {
    const matchesSearch = u.unitName.toLowerCase().includes(unitSearch.toLowerCase()) || 
                         u.tenant?.firstName?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                         u.tenant?.lastName?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                         u.tenant?.commercialName?.toLowerCase().includes(unitSearch.toLowerCase())
    const matchesFilter = unitFilter === 'All' || (unitFilter === 'Occupied' && u.status === 'OCCUPIED') || (unitFilter === 'Vacant' && u.status === 'VACANT')
    return matchesSearch && matchesFilter
  })

  const columns: Column<Unit>[] = [
    {
      header: 'UNIT',
      render: (unit) => (
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{unit.unitName}</div>
      )
    },
    {
      header: 'TENANT',
      render: (unit) => unit.tenant ? (
        <div style={{ fontSize: 14, color: '#334155' }}>{formatTenantName(unit.tenant)}</div>
      ) : (
        <span className="badge badge--vacant" style={{ fontSize: 10, background: '#f1f5f9', color: '#94a3b8' }}>Vacant</span>
      )
    },
    {
      header: 'RENT VALUE',
      render: (unit) => (
        <div style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>₦ {unit.rentAmount?.toLocaleString()}</div>
      )
    },
    {
      header: 'RENT EXPIRES',
      render: (unit) => (
        <div style={{ fontSize: 14, color: '#64748b' }}>
          {unit.rentDueDate ? new Date(unit.rentDueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No Date'}
        </div>
      )
    },
    {
      header: 'ACTION',
      align: 'right',
      render: (unit) => (
        <button 
          onClick={(e) => { e.stopPropagation(); onViewUnit(unit); }}
          className="btn btn--ghost btn--sm" 
          style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
        >
          View <Eye size={16} />
        </button>
      )
    }
  ]

  return (
    <div className="property-detail animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="btn-icon" style={{ flexShrink: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', margin: 0 }}>Property Detail</h2>
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="btn btn--secondary btn--sm" 
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 10, whiteSpace: 'nowrap' }}
          >
            <Wallet size={16} /> Setup Manual Payment
          </button>
          
          <button 
            onClick={onEdit}
            className="btn btn--secondary btn--sm" 
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 10, whiteSpace: 'nowrap' }}
          >
            <Edit3 size={16} /> Edit Property
          </button>
        </div>
      </div>

      {/* Top Section Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Image Card */}
        <div className="glass" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1f44', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', color: '#8fa3cf' }}>
            <LayoutGrid size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>No Images</div>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass" style={{ height: 280, padding: 24, background: '#fff5ec', borderRadius: 16, border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{property.name}</h3>
            <p style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              {property.address}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{property.propertyType}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Property Value(s)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>₦ 0.00</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Units</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{units.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Purpose</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Mixed Use</div>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="glass" style={{ height: 280, padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 24 }}>
            <svg width="140" height="140" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#e0f2fe" strokeWidth="4" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="4" 
                strokeDasharray={`${occupancyRate} ${100 - occupancyRate}`}
                strokeDashoffset="25"
                strokeLinecap="round"
              />
              <text x="18" y="20.5" textAnchor="middle" style={{ fontSize: 6, fontWeight: 700, fill: '#1e293b' }}>{occupancyRate}%</text>
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Occupied</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#0ea5e9' }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Vacant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass" style={{ padding: '6px', borderRadius: 14, marginBottom: 32, display: 'flex', gap: 4, background: 'white', width: 'fit-content' }}>
        {['Unit'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "btn btn--sm",
              activeTab === tab ? "btn--primary" : "btn--ghost"
            )}
            style={{ 
              borderRadius: 10, 
              padding: '8px 20px', 
              fontSize: 13,
              background: activeTab === tab ? 'var(--dark)' : 'transparent',
              color: activeTab === tab ? 'white' : '#64748b',
              border: 'none'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Units Table Section */}
      <div className="glass" style={{ padding: 24, borderRadius: 20, background: 'white' }}>
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Units</h3>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>{units.length} total units</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid #f1f5f9', paddingBottom: 0 }}>
            {['All', 'Occupied', 'Vacant'].map(f => (
              <button 
                key={f}
                onClick={() => setUnitFilter(f as any)}
                style={{ 
                  fontSize: 14, 
                  fontWeight: unitFilter === f ? 600 : 500,
                  color: unitFilter === f ? 'var(--forest)' : '#94a3b8',
                  position: 'relative',
                  padding: '0 4px 12px 4px',
                  border: 'none',
                  background: 'none'
                }}
              >
                {f}
                {unitFilter === f && (
                  <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--forest)', borderRadius: '2px 2px 0 0' }} />
                )}
              </button>
            ))}
          </div>
          <div className="search-input" style={{ width: 320, background: '#f8fafc' }}>
            <Search size={16} className="search-icon" color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search Unit" 
              value={unitSearch}
              onChange={e => setUnitSearch(e.target.value)}
              style={{ fontSize: 13, background: 'transparent' }}
            />
          </div>
        </div>

        <div style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
          <DataTable 
            columns={columns}
            data={filteredUnits}
            keyExtractor={(unit) => unit.uuid}
            emptyMessage={
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <LayoutGrid size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p>No units found matching your filters.</p>
              </div>
            }
          />
        </div>
      </div>

      <ManualAccountModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        propertyId={property.id} 
        propertyName={property.name} 
      />
    </div>
  )
}
