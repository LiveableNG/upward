'use client'

import React from 'react'
import {
  AllianceListingIntent,
  AllianceTargetType,
  DiscoverAllianceListingsParams,
} from '../types/alliance.types'
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

interface DiscoveryFiltersProps {
  filters: DiscoverAllianceListingsParams
  onFiltersChange: (filters: DiscoverAllianceListingsParams) => void
}

export function DiscoveryFilters({ filters, onFiltersChange }: DiscoveryFiltersProps) {
  const handleIntentChange = (intent?: AllianceListingIntent) => {
    onFiltersChange({ ...filters, intent, page: 1 })
  }

  const handleTargetTypeChange = (targetType?: AllianceTargetType) => {
    onFiltersChange({ ...filters, targetType, page: 1 })
  }

  const handleSortChange = (sortBy?: 'newest' | 'price_asc' | 'price_desc') => {
    onFiltersChange({ ...filters, sortBy, page: 1 })
  }

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search.trim() || undefined, page: 1 })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        background: 'var(--dark)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 20px',
      }}
    >
      {/* Search and Sort Top Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search by title, location, description, or property type..."
            defaultValue={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              paddingLeft: '36px',
              height: '40px',
              fontSize: '13px',
              width: '100%',
            }}
          />
        </div>

        {/* Sort By Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <select
            className="input"
            style={{ height: '40px', fontSize: '13px', padding: '0 12px', width: 'auto' }}
            value={filters.sortBy || 'newest'}
            onChange={(e) => handleSortChange(e.target.value as any)}
          >
            <option value="newest">Newest Published</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Filter Chips & Secondary Selects */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '14px',
        }}
      >
        {/* Intent Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleIntentChange(undefined)}
            className={`btn ${!filters.intent ? 'btn--primary' : 'btn--secondary'}`}
            style={{ height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '20px' }}
          >
            All Intent
          </button>
          <button
            type="button"
            onClick={() => handleIntentChange('RENT')}
            className={`btn ${filters.intent === 'RENT' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '20px' }}
          >
            For Rent
          </button>
          <button
            type="button"
            onClick={() => handleIntentChange('SALE')}
            className={`btn ${filters.intent === 'SALE' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '20px' }}
          >
            For Sale
          </button>
        </div>

        {/* Target Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Target:</label>
          <select
            className="input"
            style={{ height: '32px', fontSize: '12px', padding: '0 10px', width: 'auto' }}
            value={filters.targetType || ''}
            onChange={(e) => handleTargetTypeChange((e.target.value as AllianceTargetType) || undefined)}
          >
            <option value="">All Targets</option>
            <option value="PROPERTY">Property Level</option>
            <option value="UNIT">Unit Level</option>
          </select>
        </div>
      </div>
    </div>
  )
}
