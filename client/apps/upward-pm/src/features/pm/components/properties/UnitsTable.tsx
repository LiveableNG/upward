'use client'

import React from 'react'
import { Search, Plus, FileSpreadsheet, CreditCard as CreditCardIcon, Calendar } from 'lucide-react'
import { UnitTableRow } from './UnitTableRow'
import { Unit, Property } from '../../services/propertyService'

interface UnitsTableProps {
  units: Unit[];
  properties: Property[];
  paymentRequests: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPropertyFilter: string;
  setSelectedPropertyFilter: (filter: string) => void;
  paymentFilter: 'all' | 'pending';
  setPaymentFilter: (filter: 'all' | 'pending') => void;
  dueFilter: 'all' | 'passed' | '30days' | '60days' | '90days';
  setDueFilter: (filter: 'all' | 'passed' | '30days' | '60days' | '90days') => void;
  onAddUnit: () => void;
  onBulkImport: () => void;
  onRequestPayment: (unit: Unit) => void;
  hasProperties: boolean;
}

export function UnitsTable({
  units,
  properties,
  paymentRequests,
  searchQuery,
  setSearchQuery,
  selectedPropertyFilter,
  setSelectedPropertyFilter,
  paymentFilter,
  setPaymentFilter,
  dueFilter,
  setDueFilter,
  onAddUnit,
  onBulkImport,
  onRequestPayment,
  hasProperties
}: UnitsTableProps) {
  return (
    <div className="units-view-wrapper animate-fade-in">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">Units Management</h1>
          <p className="dashboard__subtitle">Manage your units, invite tenants, and track onboarding.</p>
        </div>
        <div className="properties-header__actions">
          <button 
            className="btn btn--secondary" 
            onClick={onAddUnit}
          >
            <Plus size={18} />
            Add Unit
          </button>
          <button 
            className="btn btn--primary" 
            onClick={onBulkImport}
          >
            <FileSpreadsheet size={18} />
            Bulk Import
          </button>
        </div>
      </header>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search units, tenants, properties..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select className="filter-select" value={selectedPropertyFilter} onChange={e => setSelectedPropertyFilter(e.target.value)}>
          <option>All Properties</option>
          {properties.map(p => <option key={p.uuid}>{p.name}</option>)}
        </select>

        <div className="filter-group">
          <CreditCardIcon size={14} className="filter-group__icon" />
          <select className="filter-select-minimal" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)}>
            <option value="all">All Payments</option>
            <option value="pending">Pending Requests</option>
          </select>
        </div>

        <div className="filter-group">
          <Calendar size={14} className="filter-group__icon" />
          <select className="filter-select-minimal" value={dueFilter} onChange={e => setDueFilter(e.target.value as any)}>
            <option value="all">Any Due Date</option>
            <option value="passed">Overdue</option>
            <option value="30days">Due in 30 days</option>
            <option value="60days">Due in 60 days</option>
            <option value="90days">Due in 90 days</option>
          </select>
        </div>
      </div>

      <div className="tenant-table-container animate-fade-in">
        <table className="tenant-table">
          <thead>
            <tr>
              <th>UNIT & PROPERTY</th>
              <th>TENANT</th>
              <th>RENT AMOUNT</th>
              <th>STATUS</th>
              <th className="col-actions" style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              const prop = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId);
              const propName = prop?.name || 'Unknown Property';
              const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id) || [];
              return (
                <UnitTableRow 
                  key={unit.uuid} 
                  unit={unit} 
                  propertyName={propName} 
                  property={prop}
                  onRequestPayment={onRequestPayment}
                  paymentRequests={unitRequests}
                />
              )
            })}
          </tbody>
        </table>
        {units.length === 0 && (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-muted">No units found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
