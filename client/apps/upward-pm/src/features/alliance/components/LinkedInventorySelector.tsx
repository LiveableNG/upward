'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProperties, getUnits, Property, Unit } from '@/features/pm/services/propertyService'
import { AllianceTargetType } from '../types/alliance.types'
import { OccupancyWarning } from './OccupancyWarning'
import { Building2, Home, CheckCircle2 } from 'lucide-react'

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

  // Filter units for the selected parent property if unit listing
  const filteredUnits = selectedParentPropertyId
    ? units.filter((u: Unit) => u.propertyId === selectedParentPropertyId)
    : units

  useEffect(() => {
    if (selectedUnit && !selectedParentPropertyId) {
      setSelectedParentPropertyId(selectedUnit.propertyId)
    }
  }, [selectedUnit, selectedParentPropertyId])

  if (targetType === 'PROPERTY') {
    return (
      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          Select Canonical Property from Your Inventory:
        </label>
        {loadingProperties ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading properties...</div>
        ) : properties.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            No properties found in your Upward PM inventory. You can create an Independent Listing instead.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {properties.map((p) => {
              const isSelected = selectedPropertyUuid === p.uuid
              return (
                <div
                  key={p.uuid}
                  onClick={() => !disabled && onSelectProperty(p)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid var(--forest)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={18} color={isSelected ? 'var(--forest)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.address || 'No address specified'} • {p.totalUnits || 0} units
                      </div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={18} color="var(--forest)" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Select Parent Property */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          Filter Units by Property (Optional):
        </label>
        <select
          className="input"
          disabled={disabled}
          value={selectedParentPropertyId || ''}
          onChange={(e) => setSelectedParentPropertyId(e.target.value ? Number(e.target.value) : null)}
          style={{ maxWidth: '400px' }}
        >
          <option value="">All Properties ({units.length} units total)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Select Unit */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          Select Canonical Unit:
        </label>
        {loadingUnits ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading units...</div>
        ) : filteredUnits.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            No units found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {filteredUnits.map((u) => {
              const isSelected = selectedUnitUuid === u.uuid
              return (
                <div
                  key={u.uuid}
                  onClick={() => !disabled && onSelectUnit(u)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid var(--forest)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Home size={18} color={isSelected ? 'var(--forest)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                        {u.unitName}
                        {u.property?.name && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>
                            {' '}
                            ({u.property.name})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Status: <strong style={{ color: u.status === 'OCCUPIED' ? '#b45309' : 'var(--forest)' }}>{u.status}</strong> • Canonical Rent: ₦{(u.rentAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={18} color="var(--forest)" />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Occupancy Warning if Selected Unit is Occupied */}
      {selectedUnit && <OccupancyWarning unitStatus={selectedUnit.status} />}
    </div>
  )
}
