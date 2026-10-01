'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProperties, getUnits, Property, Unit } from '@/features/pm/services/propertyService'
import { AllianceTargetType } from '../types/alliance.types'
import { OccupancyWarning } from './OccupancyWarning'
import { Building2, Home, CheckCircle2, Search, Filter, AlertCircle, MapPin } from 'lucide-react'

interface LinkedInventorySelectorProps {
  targetType: AllianceTargetType
  selectedPropertyUuid?: string
  selectedUnitUuid?: string
  onSelectProperty: (property: Property) => void
  onSelectUnit: (unit: Unit) => void
  disabled?: boolean
}

export function LinkedInventorySelector({
  targetType,
  selectedPropertyUuid,
  selectedUnitUuid,
  onSelectProperty,
  onSelectUnit,
  disabled = false,
}: LinkedInventorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParentPropertyId, setSelectedParentPropertyId] = useState<number | null>(null)

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => getProperties(),
  })

  const { data: units = [], isLoading: loadingUnits } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => getUnits(),
  })

  // When a unit is selected, find its unit entity to show context
  const selectedUnit = units.find((u: Unit) => u.uuid === selectedUnitUuid)
  const selectedProperty = properties.find((p: Property) => p.uuid === selectedPropertyUuid)

  useEffect(() => {
    if (selectedUnit && !selectedParentPropertyId) {
      setSelectedParentPropertyId(selectedUnit.propertyId)
    }
  }, [selectedUnit, selectedParentPropertyId])

  // Filter properties by search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties
    const q = searchQuery.toLowerCase()
    return properties.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.area?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q)
    )
  }, [properties, searchQuery])

  // Filter units by parent property and search query
  const filteredUnits = useMemo(() => {
    let list = units
    if (selectedParentPropertyId) {
      list = list.filter((u) => u.propertyId === selectedParentPropertyId)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (u) =>
          u.unitName?.toLowerCase().includes(q) ||
          u.property?.name?.toLowerCase().includes(q) ||
          u.status?.toLowerCase().includes(q)
      )
    }
    return list
  }, [units, selectedParentPropertyId, searchQuery])

  if (targetType === 'PROPERTY') {
    return (
      <div className="alliance-picker">
        {/* Search Bar */}
        <div className="alliance-picker__search-bar">
          <div className="alliance-picker__search">
            <Search size={16} className="alliance-picker__search-icon" />
            <input
              type="text"
              placeholder="Search properties by name, area, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              className="alliance-picker__search-input"
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Showing {filteredProperties.length} of {properties.length} properties
          </span>
        </div>

        {/* Loading State */}
        {loadingProperties ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="loader" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '13px' }}>Loading properties from your inventory...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="alliance-callout">
            <AlertCircle size={18} className="alliance-callout__icon" />
            <div className="alliance-callout__content">
              {searchQuery.trim()
                ? `No properties match "${searchQuery}". Try a different search term.`
                : 'No properties found in your Upward PM inventory. You can switch to an Independent Listing.'}
            </div>
          </div>
        ) : (
          <div className="alliance-picker__list">
            {filteredProperties.map((p) => {
              const isSelected = selectedPropertyUuid === p.uuid
              return (
                <div
                  key={p.uuid}
                  onClick={() => !disabled && onSelectProperty(p)}
                  className={`alliance-picker__item ${isSelected ? 'alliance-picker__item--selected' : ''} ${
                    disabled ? 'alliance-picker__item--disabled' : ''
                  }`}
                >
                  <div className="alliance-picker__item-left">
                    <div className="alliance-picker__item-icon">
                      <Building2 size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="alliance-picker__item-name">{p.name}</div>
                      <div className="alliance-picker__item-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={12} /> {p.address || p.area || 'No address specified'}
                        </span>
                        <span>•</span>
                        <span>{p.totalUnits || 0} units</span>
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="alliance-picker__selection-pill">
                      <CheckCircle2 size={14} /> Selected
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Select
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="alliance-picker">
      {/* Search & Filter Bar */}
      <div className="alliance-picker__search-bar">
        <div className="alliance-picker__search">
          <Search size={16} className="alliance-picker__search-icon" />
          <input
            type="text"
            placeholder="Search unit name, status, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="alliance-picker__search-input"
          />
        </div>

        <div style={{ minWidth: '200px' }}>
          <select
            className="alliance-input"
            style={{ height: '42px', fontSize: '13px' }}
            disabled={disabled}
            value={selectedParentPropertyId || ''}
            onChange={(e) => setSelectedParentPropertyId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loadingUnits ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loader" style={{ margin: '0 auto 8px auto' }} />
          <p style={{ fontSize: '13px' }}>Loading units from your inventory...</p>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="alliance-callout">
          <AlertCircle size={18} className="alliance-callout__icon" />
          <div className="alliance-callout__content">
            {searchQuery.trim()
              ? `No units match "${searchQuery}".`
              : 'No units found under the selected property.'}
          </div>
        </div>
      ) : (
        <div className="alliance-picker__list">
          {filteredUnits.map((u) => {
            const isSelected = selectedUnitUuid === u.uuid
            const isOccupied = u.status?.toUpperCase() === 'OCCUPIED'

            return (
              <div
                key={u.uuid}
                onClick={() => !disabled && onSelectUnit(u)}
                className={`alliance-picker__item ${isSelected ? 'alliance-picker__item--selected' : ''} ${
                  disabled ? 'alliance-picker__item--disabled' : ''
                }`}
              >
                <div className="alliance-picker__item-left">
                  <div className="alliance-picker__item-icon">
                    <Home size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="alliance-picker__item-name">
                      {u.unitName}
                      {u.property?.name && (
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>
                          in {u.property.name}
                        </span>
                      )}
                    </div>
                    <div className="alliance-picker__item-meta">
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isOccupied ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.12)',
                          color: isOccupied ? '#b45309' : '#15803d',
                        }}
                      >
                        {u.status || 'VACANT'}
                      </span>
                      <span>•</span>
                      <span>Canonical Rent: ₦{(u.rentAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <span className="alliance-picker__selection-pill">
                    <CheckCircle2 size={14} /> Selected
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Select
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Occupancy Warning if Selected Unit is Occupied */}
      {selectedUnit && <OccupancyWarning unitStatus={selectedUnit.status} />}
    </div>
  )
}
