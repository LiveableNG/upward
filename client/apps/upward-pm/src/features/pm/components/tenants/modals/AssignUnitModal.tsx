import React, { useState } from 'react'
import { X, Search, Building2, CheckCircle2 } from 'lucide-react'
import { useUnits } from '@/features/pm/hooks/useProperties'
import { useTenantActions } from '@/features/pm/hooks/useTenants'
import { cn } from '@/lib/utils'

interface AssignUnitModalProps {
  isOpen: boolean
  onClose: () => void
  tenantUuid: string
  tenantName: string
}

export const AssignUnitModal: React.FC<AssignUnitModalProps> = ({
  isOpen,
  onClose,
  tenantUuid,
  tenantName
}) => {
  const { data: units = [] } = useUnits()
  const { assignTenant } = useTenantActions()
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  // Only show units that are VACANT or have no tenant assigned
  const availableUnits = units.filter(unit => {
    const isAvailable = !unit.tenant && unit.status !== 'MAINTENANCE'
    const matchesSearch = 
      unit.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.property?.name.toLowerCase().includes(searchQuery.toLowerCase())
    return isAvailable && matchesSearch
  })

  const handleAssign = (unitUuid: string) => {
    assignTenant.mutate({ tenantUuid, unitUuid }, {
      onSuccess: () => onClose()
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 className="modal__title">Assign Unit</h2>
            <p className="modal__desc">Select a vacant unit to assign to <strong>{tenantName}</strong>.</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div className="search-input" style={{ marginBottom: 20 }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search property or unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="unit-selection-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {availableUnits.map(unit => (
            <div 
              key={unit.uuid} 
              className="unit-selection-item"
              onClick={() => handleAssign(unit.uuid)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="unit-icon-box">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="unit-name">Unit {unit.unitName}</div>
                  <div className="property-name">{unit.property?.name}</div>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm">Assign</button>
            </div>
          ))}

          {availableUnits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {searchQuery ? 'No units match your search.' : 'No vacant units available to assign.'}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .unit-selection-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .unit-selection-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--ivory-dim);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .unit-selection-item:hover {
          background: white;
          border-color: var(--forest-faint);
          box-shadow: var(--shadow-sm);
        }
        .unit-icon-box {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest);
        }
        .unit-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
        }
        .property-name {
          font-size: 12px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
