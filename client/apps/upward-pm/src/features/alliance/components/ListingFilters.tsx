'use client'

import React from 'react'
import { AllianceListingStatus, AllianceTargetType, AllianceSourceType } from '../types/alliance.types'

interface ListingFiltersProps {
  status?: AllianceListingStatus
  targetType?: AllianceTargetType
  sourceType?: AllianceSourceType
  onStatusChange: (status?: AllianceListingStatus) => void
  onTargetTypeChange: (targetType?: AllianceTargetType) => void
  onSourceTypeChange: (sourceType?: AllianceSourceType) => void
}

const statusTabs: Array<{ label: string; value?: AllianceListingStatus }> = [
  { label: 'All Listings', value: undefined },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Unpublished', value: 'UNPUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
]

export function ListingFilters({
  status,
  targetType,
  sourceType,
  onStatusChange,
  onTargetTypeChange,
  onSourceTypeChange,
}: ListingFiltersProps) {
  return (
    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Status Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '8px',
        }}
      >
        {statusTabs.map((tab) => {
          const isActive = status === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className="btn btn--text"
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--forest)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--forest)' : '2px solid transparent',
                borderRadius: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Target & Source Dropdown Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Target:</label>
          <select
            className="input"
            style={{ width: 'auto', height: '36px', fontSize: '13px', padding: '0 12px' }}
            value={targetType || ''}
            onChange={(e) => onTargetTypeChange((e.target.value as AllianceTargetType) || undefined)}
          >
            <option value="">All Targets</option>
            <option value="PROPERTY">Property</option>
            <option value="UNIT">Unit</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Source:</label>
          <select
            className="input"
            style={{ width: 'auto', height: '36px', fontSize: '13px', padding: '0 12px' }}
            value={sourceType || ''}
            onChange={(e) => onSourceTypeChange((e.target.value as AllianceSourceType) || undefined)}
          >
            <option value="">All Sources</option>
            <option value="LINKED_INVENTORY">Linked Inventory</option>
            <option value="INDEPENDENT">Independent</option>
          </select>
        </div>
      </div>
    </div>
  )
}
