'use client'

import React from 'react'
import { 
  Users, 
  Search, 
  Building2, 
  MapPin, 
  Mail, 
  Phone,
  ArrowRight
} from 'lucide-react'
import '@/styles/tenants.css'

const tenants = [
  { 
    name: 'Chidi Okoro', 
    email: 'chidi.o@gmail.com',
    phone: '0803 123 4567',
    units: [
      { id: 'A101', property: 'Lekki Heights', status: 'on-upward' },
      { id: 'S4', property: 'Victoria Island Plaza', status: 'on-upward' }
    ]
  },
  { 
    name: 'Amina Yusuf', 
    email: 'amina.y@yahoo.com',
    phone: '0812 987 6543',
    units: [
      { id: 'A102', property: 'Lekki Heights', status: 'invited' }
    ]
  },
  { 
    name: 'Emeka Nwosu', 
    email: 'emeka.n@outlook.com',
    phone: '0805 444 3322',
    units: [
      { id: 'B202', property: 'Ikeja Gardens', status: 'on-upward' }
    ]
  }
]

export default function TenantsPage() {
  return (
    <div className="properties-page animate-fade-in">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">Tenants Directory</h1>
          <p className="dashboard__subtitle">Manage your tenants across all properties and units.</p>
        </div>
        <button className="btn btn--primary">
          <Users size={18} />
          Add Tenant
        </button>
      </header>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search by name, email or phone..." />
        </div>
      </div>

      <div className="tenants-list">
        {tenants.map((tenant) => (
          <div key={tenant.email} className="tenant-group-card">
            <div className="tenant-group-card__header">
              <div className="tenant-info-main">
                <div className="tenant-avatar-large">
                  {tenant.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3>{tenant.name}</h3>
                  <div className="tenant-meta">
                    <span><Mail size={12} /> {tenant.email}</span>
                    <span><Phone size={12} /> {tenant.phone}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm">View Profile</button>
            </div>

            <div className="tenant-units-section">
              <p className="section-label">Assigned Units ({tenant.units.length})</p>
              <div className="tenant-units-grid">
                {tenant.units.map((unit) => (
                  <div key={unit.property + unit.id} className="tenant-unit-pill">
                    <div className="tenant-unit-pill__icon">
                      <Building2 size={14} />
                    </div>
                    <div className="tenant-unit-pill__text">
                      <strong>Unit {unit.id}</strong>
                      <span>{unit.property}</span>
                    </div>
                    <span className={`badge badge--xs badge--${unit.status}`}>
                      {unit.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
