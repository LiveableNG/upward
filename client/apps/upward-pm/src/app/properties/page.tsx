'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Download, 
  Search, 
  MoreVertical,
  Send,
  Phone,
  User,
  X,
  FileSpreadsheet,
  CreditCard,
  Building2,
  MapPin,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import '@/styles/properties.css'

type Tab = 'units' | 'properties'

const mockProperties = [
  { id: 'p1', name: 'Lekki Heights', address: 'Plot 12, Admiralty Way, Lekki Phase 1', units: 24, occupied: 22, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=400' },
  { id: 'p2', name: 'Ikeja Gardens', address: '15 GRA Road, Ikeja', units: 12, occupied: 10, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400' },
  { id: 'p3', name: 'Victoria Island Apts', address: '88 Kofo Abayomi St, VI', units: 40, occupied: 40, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=400' },
]

const mockUnits = [
  { id: 'A101', property: 'Lekki Heights', tenant: 'Chidi Okoro', phone: '0803 123 4567', status: 'on-upward', rent: '₦2,400,000' },
  { id: 'A102', property: 'Lekki Heights', tenant: 'Amina Yusuf', phone: '0812 987 6543', status: 'invited', rent: '₦2,400,000' },
  { id: 'B201', property: 'Ikeja Gardens', tenant: 'Boluwatife Adebayo', phone: '0706 555 1212', status: 'unlinked', rent: '₦1,800,000' },
  { id: 'B202', property: 'Ikeja Gardens', tenant: 'Emeka Nwosu', phone: '0805 444 3322', status: 'on-upward', rent: '₦1,800,000' },
  { id: 'C301', property: 'Victoria Island Apts', tenant: 'Folake Ishola', phone: '0901 222 8888', status: 'on-upward', rent: '₦4,500,000' },
  { id: 'C302', property: 'Victoria Island Apts', tenant: 'Tunde Bakare', phone: '0802 333 7777', status: 'unlinked', rent: '₦4,500,000' },
]

export default function PropertiesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('units')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { success, info } = useToast()

  const filteredUnits = mockUnits.filter(unit => 
    unit.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.property.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredProperties = mockProperties.filter(prop => 
    prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownloadTemplate = () => {
    info('Downloading Excel template...')
    setTimeout(() => success('Template downloaded!'), 1000)
  }

  const handleImport = () => {
    info('Processing units...')
    setTimeout(() => {
      success('24 units imported successfully!')
      setShowImportModal(false)
    }, 2000)
  }

  const handleInvite = (tenant: string) => {
    success(`Invitation sent to ${tenant}!`)
  }

  const handlePaymentRequest = (unit: string) => {
    info(`Payment request flow opened for Unit ${unit}`)
  }

  return (
    <div className="properties-page animate-fade-in">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">{activeTab === 'units' ? 'Units Management' : 'Properties Overview'}</h1>
          <p className="dashboard__subtitle">
            {activeTab === 'units' 
              ? 'Manage your units, invite tenants, and track onboarding.' 
              : 'Monitor performance and occupancy across your buildings.'}
          </p>
        </div>
        <div className="properties-header__actions">
          {activeTab === 'units' ? (
            <>
              <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
                <Download size={18} />
                Template
              </button>
              <button className="btn btn--primary" onClick={() => setShowImportModal(true)}>
                <Plus size={18} />
                Bulk Import
              </button>
            </>
          ) : (
            <button className="btn btn--primary" onClick={() => setShowAddPropertyModal(true)}>
              <Plus size={18} />
              Add Property
            </button>
          )}
        </div>
      </header>

      <div className="properties-tabs">
        <button 
          className={cn('properties-tabs__btn', activeTab === 'units' && 'properties-tabs__btn--active')}
          onClick={() => setActiveTab('units')}
        >
          Units ({mockUnits.length})
        </button>
        <button 
          className={cn('properties-tabs__btn', activeTab === 'properties' && 'properties-tabs__btn--active')}
          onClick={() => setActiveTab('properties')}
        >
          Properties ({mockProperties.length})
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={activeTab === 'units' ? "Search units, tenants, properties..." : "Search properties by name or address..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {activeTab === 'units' && (
          <>
            <select className="filter-select">
              <option>All Properties</option>
              {mockProperties.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
            <select className="filter-select">
              <option>All Statuses</option>
              <option>On Upward</option>
              <option>Invited</option>
              <option>Unlinked</option>
            </select>
          </>
        )}
      </div>

      {activeTab === 'units' ? (
        <div className="units-grid">
          {filteredUnits.map((unit) => (
            <div key={unit.id + unit.property} className="unit-card">
              <div className="unit-card__header">
                <div>
                  <h3 className="unit-card__id">Unit {unit.id}</h3>
                  <p className="unit-card__property">{unit.property}</p>
                </div>
                <span className={`badge badge--${unit.status}`}>
                  {unit.status.replace('-', ' ')}
                </span>
              </div>
              
              <div className="unit-card__body">
                <div className="info-row">
                  <span className="info-row__label"><User size={12} style={{marginRight: 4}} /> Tenant</span>
                  <span className="info-row__value">{unit.tenant}</span>
                </div>
                <div className="info-row">
                  <span className="info-row__label"><Phone size={12} style={{marginRight: 4}} /> Phone</span>
                  <span className="info-row__value">{unit.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-row__label"><CreditCard size={12} style={{marginRight: 4}} /> Annual Rent</span>
                  <span className="info-row__value">{unit.rent}</span>
                </div>
              </div>

              <div className="unit-card__footer">
                {unit.status === 'unlinked' ? (
                  <button 
                    className="unit-card__action unit-card__action--primary"
                    onClick={() => handleInvite(unit.tenant)}
                  >
                    <Send size={14} style={{marginRight: 6}} />
                    Invite to Upward
                  </button>
                ) : (
                  <button 
                    className="unit-card__action unit-card__action--primary"
                    onClick={() => handlePaymentRequest(unit.id)}
                  >
                    <CreditCard size={14} style={{marginRight: 6}} />
                    Request Payment
                  </button>
                )}
                <button className="unit-card__action unit-card__action--secondary">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="properties-grid">
          {filteredProperties.map((prop) => (
            <div key={prop.id} className="prop-card">
              <div className="prop-card__img">
                <img src={prop.image} alt={prop.name} />
                <div className="prop-card__overlay">
                  <span className="prop-card__tag">
                    {Math.round((prop.occupied / prop.units) * 100)}% Occupied
                  </span>
                </div>
              </div>
              <div className="prop-card__content">
                <div className="prop-card__info">
                  <h3 className="prop-card__title">{prop.name}</h3>
                  <p className="prop-card__address">
                    <MapPin size={12} style={{marginRight: 4}} />
                    {prop.address}
                  </p>
                </div>
                
                <div className="prop-card__stats">
                  <div className="prop-stat">
                    <span className="prop-stat__val">{prop.units}</span>
                    <span className="prop-stat__lbl">Units</span>
                  </div>
                  <div className="prop-stat">
                    <span className="prop-stat__val">{prop.occupied}</span>
                    <span className="prop-stat__lbl">Occupied</span>
                  </div>
                  <div className="prop-stat">
                    <span className="prop-stat__val">{prop.units - prop.occupied}</span>
                    <span className="prop-stat__lbl">Vacant</span>
                  </div>
                </div>

                <button className="prop-card__action">
                  Manage Units
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="modal__title">Bulk Import Units</h2>
                <p className="modal__desc">Upload your excel sheet to add multiple units at once.</p>
              </div>
              <button onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>

            <div className="import-zone" onClick={handleImport}>
              <div className="import-zone__icon">
                <FileSpreadsheet size={48} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Click to upload or drag & drop</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>CSV, XLSX or XLS (Max 10MB)</p>
            </div>

            <div style={{ background: 'var(--ivory-dim)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>Tip:</strong> Make sure to use our template to ensure all columns (Unit ID, Tenant Name, Phone, Rent Amount) are correctly mapped.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleImport}>
                Start Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <div className="modal-overlay" onClick={() => setShowAddPropertyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="modal__title">Add New Property</h2>
                <p className="modal__desc">Register a new building or estate to your portfolio.</p>
              </div>
              <button onClick={() => setShowAddPropertyModal(false)}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Property Name</label>
              <input type="text" className="form-input" placeholder="e.g. Lekki Heights Phase 2" />
            </div>

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <input type="text" className="form-input" placeholder="Enter building address" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Total Units</label>
                <input type="number" className="form-input" placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select className="form-input">
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Mixed Use</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setShowAddPropertyModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => {
                success('Property added successfully!')
                setShowAddPropertyModal(false)
              }}>
                Create Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
