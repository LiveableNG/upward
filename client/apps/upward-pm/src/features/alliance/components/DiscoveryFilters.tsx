'use client'

import React from 'react'
import {
  AllianceListingIntent,
  AllianceTargetType,
  DiscoverAllianceListingsParams,
} from '../types/alliance.types'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterGroup } from '@/components/ui/ControlBar/FilterGroup'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'
import { ArrowUpDown, Tag, Layers } from 'lucide-react'

interface DiscoveryFiltersProps {
  filters: DiscoverAllianceListingsParams
  onFiltersChange: (filters: DiscoverAllianceListingsParams) => void
}

export function DiscoveryFilters({ filters, onFiltersChange }: DiscoveryFiltersProps) {
  const handleIntentChange = (intentValue: string) => {
    const intent = intentValue === 'ALL' ? undefined : (intentValue as AllianceListingIntent)
    onFiltersChange({ ...filters, intent, page: 1 })
  }

  const handleTargetTypeChange = (targetValue: string) => {
    const targetType = targetValue === 'ALL' ? undefined : (targetValue as AllianceTargetType)
    onFiltersChange({ ...filters, targetType, page: 1 })
  }

  const handleSortChange = (sortValue: string) => {
    const sortBy = sortValue as 'newest' | 'price_asc' | 'price_desc'
    onFiltersChange({ ...filters, sortBy, page: 1 })
  }

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search.trim() || undefined, page: 1 })
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <ControlBar>
        <SearchInput
          value={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="Search by title, location, or property type..."
        />

        <FilterGroup>
          <FilterDropdown
            label="Intent"
            value={filters.intent || 'ALL'}
            icon={Tag}
            options={[
              { label: 'All Intent', value: 'ALL' },
              { label: 'For Rent', value: 'RENT' },
              { label: 'For Sale', value: 'SALE' },
            ]}
            onChange={handleIntentChange}
          />

          <FilterDropdown
            label="Target Level"
            value={filters.targetType || 'ALL'}
            icon={Layers}
            options={[
              { label: 'All Targets', value: 'ALL' },
              { label: 'Property Level', value: 'PROPERTY' },
              { label: 'Unit Level', value: 'UNIT' },
            ]}
            onChange={handleTargetTypeChange}
          />

          <FilterDropdown
            label="Sort By"
            value={filters.sortBy || 'newest'}
            icon={ArrowUpDown}
            options={[
              { label: 'Newest Published', value: 'newest' },
              { label: 'Price: Low to High', value: 'price_asc' },
              { label: 'Price: High to Low', value: 'price_desc' },
            ]}
            onChange={handleSortChange}
          />
        </FilterGroup>
      </ControlBar>
    </div>
  )
}
