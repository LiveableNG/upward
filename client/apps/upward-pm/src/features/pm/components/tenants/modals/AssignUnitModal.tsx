import React, { useState } from 'react'
import { Search, Building2, CheckCircle2, Calendar, CreditCard } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
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
  const [selectedUnitUuid, setSelectedUnitUuid] = useState<string | null>(null)
  const [rentDetails, setRentDetails] = useState({
    rentAmount: '',
    rentType: 'Annually',
    leaseYears: '1',
    rentStartDate: '',
    rentDueDate: '',
    rentAmountPaid: '0'
  })

  const selectedUnit = units.find(u => u.uuid === selectedUnitUuid)

  // Update rent details when a unit is selected
  React.useEffect(() => {
    if (selectedUnit) {
      setRentDetails({
        rentAmount: selectedUnit.rentAmount?.toString() || '',
        rentType: selectedUnit.rentType || 'Annually',
        leaseYears: (selectedUnit as any).leaseYears?.toString() || '1',
        rentStartDate: selectedUnit.rentStartDate ? new Date(selectedUnit.rentStartDate).toISOString().split('T')[0] : '',
        rentDueDate: selectedUnit.rentDueDate ? new Date(selectedUnit.rentDueDate).toISOString().split('T')[0] : '',
        rentAmountPaid: '0'
      })
    }
  }, [selectedUnit])

  // Auto-calculate End Date
  React.useEffect(() => {
    if (rentDetails.rentStartDate && rentDetails.rentType) {
      const [y, m, d] = rentDetails.rentStartDate.split('-').map(Number)
      if (!y || !m || !d) return
      const start = new Date(Date.UTC(y, m - 1, d))
      if (isNaN(start.getTime())) return

      const end = new Date(start.getTime())
      if (rentDetails.rentType === 'Monthly') {
        end.setUTCMonth(end.getUTCMonth() + 1)
      } else if (rentDetails.rentType === 'Lease') {
        const years = Math.max(1, parseInt(String(rentDetails.leaseYears || '1'), 10) || 1)
        end.setUTCFullYear(end.getUTCFullYear() + years)
      } else {
        end.setUTCFullYear(end.getUTCFullYear() + 1)
      }
      end.setUTCDate(end.getUTCDate() - 1)

      const formatted = end.toISOString().split('T')[0]
      if (formatted !== rentDetails.rentDueDate) {
        setRentDetails(prev => ({ ...prev, rentDueDate: formatted }))
      }
    }
  }, [rentDetails.rentStartDate, rentDetails.rentType, rentDetails.leaseYears])

  if (!isOpen) return null

  const availableUnits = units.filter(unit => {
    const isAvailable = !unit.tenant && unit.status !== 'MAINTENANCE'
    const matchesSearch = 
      unit.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return isAvailable && matchesSearch
  })

  const isInvalid = !!(selectedUnitUuid && (
    !rentDetails.rentAmount || 
    !rentDetails.rentType || 
    !rentDetails.rentStartDate || 
    !rentDetails.rentDueDate ||
    (rentDetails.rentType === 'Lease' && (!rentDetails.leaseYears || parseInt(String(rentDetails.leaseYears), 10) < 1))
  ))

  const handleConfirmAssign = () => {
    if (!selectedUnitUuid) return

    assignTenant.mutate({ 
      tenantUuid, 
      unitUuid: selectedUnitUuid,
      rentAmountPaid: parseFloat(rentDetails.rentAmountPaid) || 0,
      rentAmount: parseFloat(rentDetails.rentAmount),
      rentType: rentDetails.rentType,
      rentStartDate: rentDetails.rentStartDate,
      rentDueDate: rentDetails.rentDueDate
    }, {
      onSuccess: () => onClose()
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Unit"
      subtitle={`Select a vacant unit to assign to ${tenantName}.`}
      maxWidth={640}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1, fontSize: 13 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            style={{ flex: 1, fontSize: 13 }} 
            onClick={handleConfirmAssign}
            disabled={!selectedUnitUuid || assignTenant.isPending || isInvalid}
          >
            {assignTenant.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      }
    >
        <div className="search-input" style={{ marginBottom: 20 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            style={{ fontSize: 13, padding: '10px 14px 10px 40px' }}
            placeholder="Search property or unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="unit-selection-list" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 24 }}>
          {availableUnits.map(unit => (
            <div 
              key={unit.uuid} 
              className={cn("unit-selection-item", selectedUnitUuid === unit.uuid && "unit-selection-item--selected")}
              onClick={() => setSelectedUnitUuid(unit.uuid)}
              style={{ padding: '10px 14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="unit-icon-box" style={{ width: 32, height: 32 }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="unit-name" style={{ fontSize: 13 }}>Unit {unit.unitName}</div>
                  <div className="property-name" style={{ fontSize: 11 }}>{unit.property?.name}</div>
                </div>
              </div>
              {selectedUnitUuid === unit.uuid && <CheckCircle2 size={18} color="var(--forest)" />}
            </div>
          ))}
          {availableUnits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No units available.</p>
            </div>
          )}
        </div>

        {selectedUnitUuid && (
          <div className="assignment-details animate-fade-in" style={{ background: 'var(--bg)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
             <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CreditCard size={14} color="var(--forest)" />
                <h5 style={{ fontSize: 11, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenancy Terms</h5>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: rentDetails.rentType === 'Lease' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>Rent Amount (₦)</label>
                <input 
                  type="number"
                  className={cn("form-input", !rentDetails.rentAmount && "form-input--error")}
                  style={{ fontSize: 13, padding: '10px 14px' }}
                  value={rentDetails.rentAmount}
                  onChange={(e) => setRentDetails({...rentDetails, rentAmount: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>Initial Paid (₦)</label>
                <input 
                  type="number"
                  className="form-input"
                  style={{ fontSize: 13, padding: '10px 14px' }}
                  value={rentDetails.rentAmountPaid}
                  onChange={(e) => setRentDetails({...rentDetails, rentAmountPaid: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>Rent Cycle</label>
                <FormSelect
                  className={cn(!rentDetails.rentType && "form-input--error")}
                  value={rentDetails.rentType}
                  onChange={(val) => setRentDetails({...rentDetails, rentType: val})}
                  options={[
                    { label: 'Annually', value: 'Annually' },
                    { label: 'Monthly', value: 'Monthly' },
                    { label: 'Lease', value: 'Lease' }
                  ]}
                />
              </div>
              {rentDetails.rentType === 'Lease' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Lease Years</label>
                  <input 
                    type="number"
                    min="1"
                    className={cn("form-input", (!rentDetails.leaseYears || parseInt(String(rentDetails.leaseYears), 10) < 1) && "form-input--error")}
                    style={{ fontSize: 13, padding: '10px 14px' }}
                    value={rentDetails.leaseYears}
                    onChange={(e) => setRentDetails({...rentDetails, leaseYears: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> Start Date
                </label>
                <input 
                  type="date"
                  className={cn("form-input", !rentDetails.rentStartDate && "form-input--error")}
                  style={{ fontSize: 13, padding: '10px 14px' }}
                  value={rentDetails.rentStartDate}
                  onChange={(e) => setRentDetails({...rentDetails, rentStartDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> End Date (Auto-calculated)
                </label>
                <input 
                  type="date"
                  readOnly
                  className={cn("form-input", !rentDetails.rentDueDate && "form-input--error")}
                  style={{ fontSize: 13, padding: '10px 14px', background: 'var(--bg)', cursor: 'not-allowed', opacity: 0.8 }}
                  value={rentDetails.rentDueDate}
                  title="Auto-calculated based on rent start date and cycle"
                />
              </div>
            </div>
          </div>
        )}


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
        .unit-selection-item--selected {
          background: white;
          border-color: var(--forest);
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
    </Modal>
  )
}
