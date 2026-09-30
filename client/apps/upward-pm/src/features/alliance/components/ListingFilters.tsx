'use client'

import React from 'react'
import {
  AllianceListingStatus,
  AllianceTargetType,
  AllianceSourceType,
} from '../types/alliance.types'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { FilterGroup } from '@/components/ui/ControlBar/FilterGroup'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'
import { Layers, Globe, CheckCircle2 } from 'lucide-react'

interface ListingFiltersProps {
  status?: AllianceListingStatus
  targetType?: AllianceTargetType
  sourceType?: AllianceSourceType
  onStatusChange: (status?: AllianceListingStatus) => void
  onTargetTypeChange: (targetType?: AllianceTargetType) => void
  onSourceTypeChange: (sourceType?: AllianceSourceType) => void
}

export function ListingFilters({
  status,
  targetType,
  sourceType,
  onStatusChange,
  onTargetTypeChange,
  onSourceTypeChange,
}: ListingFiltersProps) {
  const handleStatusChange = (val: string) => {
    onStatusChange(val === 'ALL' ? undefined : (val as AllianceListingStatus))
  }

  const handleTargetChange = (val: string) => {
    onTargetTypeChange(val === 'ALL' ? undefined : (val as AllianceTargetType))
  }

  const handleSourceChange = (val: string) => {
    onSourceTypeChange(val === 'ALL' ? undefined : (val as AllianceSourceType))
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <ControlBar>
        <FilterGroup>
          <FilterDropdown
            label="Listing Status"
            value={status || 'ALL'}
            icon={CheckCircle2}
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Published', value: 'PUBLISHED' },
              { label: 'Drafts', value: 'DRAFT' },
              { label: 'Unpublished', value: 'UNPUBLISHED' },
              { label: 'Archived', value: 'ARCHIVED' },
            ]}
            onChange={handleStatusChange}
          />

          <FilterDropdown
            label="Target Level"
            value={targetType || 'ALL'}
            icon={Layers}
            options={[
              { label: 'All Targets', value: 'ALL' },
              { label: 'Property Level', value: 'PROPERTY' },
              { label: 'Unit Level', value: 'UNIT' },
            ]}
            onChange={handleTargetChange}
          />

          <FilterDropdown
            label="Inventory Source"
            value={sourceType || 'ALL'}
            icon={Globe}
            options={[
              { label: 'All Sources', value: 'ALL' },
              { label: 'Linked Inventory', value: 'LINKED_INVENTORY' },
              { label: 'Independent', value: 'INDEPENDENT' },
            ]}
            onChange={handleSourceChange}
          />
        </FilterGroup>
      </ControlBar>
    </div>
  )
}
