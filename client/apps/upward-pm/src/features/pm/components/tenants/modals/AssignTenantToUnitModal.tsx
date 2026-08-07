import React, { useState } from 'react'
import { Search, UserPlus, CheckCircle2, Calendar, CreditCard } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useTenants, useTenantActions } from '@/features/pm/hooks/useTenants'
import { cn } from '@/lib/utils'
import { TenantNameDisplay } from '@/components/common/TenantNameDisplay'

interface AssignTenantToUnitModalProps {
  isOpen: boolean
  onClose: () => void
  unitUuid: string
  unitName: string
  initialRentAmount?: number
  initialRentType?: string
  initialRentStartDate?: string
  initialRentDueDate?: string
}

const CONTROL_HEIGHT = 48

const controlStyle: React.CSSProperties = {
  fontSize: 13,
  height: CONTROL_HEIGHT,
  padding: '0 14px',
  boxSizing: 'border-box',
  width: '100%',
}

function formatAmountDisplay(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return ''
  const raw = String(value).replace(/[^0-9.]/g, '')
  if (!raw) return ''
  const [intPart, decPart] = raw.split('.')
  const formattedInt = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (decPart !== undefined) return `${formattedInt}.${decPart.slice(0, 2)}`
  return formattedInt
}

function parseAmountValue(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0
}

export const AssignTenantToUnitModal: React.FC<AssignTenantToUnitModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  unitName,
  initialRentAmount,
  initialRentType,
  initialRentStartDate,
  initialRentDueDate
}) => {
  const { data: tenants = [] } = useTenants()
  const { assignTenant } = useTenantActions()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTenantUuid, setSelectedTenantUuid] = useState<string | null>(null)
  
  const [rentDetails, setRentDetails] = useState({
    rentAmount: formatAmountDisplay(initialRentAmount),
    rentType: initialRentType || 'Annually',
    leaseYears: '1',
    rentStartDate: initialRentStartDate ? new Date(initialRentStartDate).toISOString().split('T')[0] : '',
    rentDueDate: initialRentDueDate ? new Date(initialRentDueDate).toISOString().split('T')[0] : '',
    rentAmountPaid: '0'
  })

  // Auto-calculate End Date when start/cycle/years change (still editable afterward)
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

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      (t.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const isInvalid = !!(selectedTenantUuid && (
    !rentDetails.rentAmount || 
    !rentDetails.rentType || 
    !rentDetails.rentStartDate || 
    !rentDetails.rentDueDate ||
    (rentDetails.rentType === 'Lease' && (!rentDetails.leaseYears || parseInt(String(rentDetails.leaseYears), 10) < 1))
  ))

  const handleConfirmAssign = () => {
    if (!selectedTenantUuid) return

    assignTenant.mutate({ 
      tenantUuid: selectedTenantUuid, 
      unitUuid,
      rentAmountPaid: parseAmountValue(rentDetails.rentAmountPaid),
      rentAmount: parseAmountValue(rentDetails.rentAmount),
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
      title="Assign Tenant"
      subtitle={`Select a tenant to assign to ${unitName}.`}
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
            disabled={!selectedTenantUuid || assignTenant.isPending || isInvalid}
          >
            {assignTenant.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      }
    >
        <div className="search-input" style={{ marginBottom: 20, width: '100%', maxWidth: 'none', flex: 'none' }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            style={{ ...controlStyle, paddingLeft: 40, width: '100%' }}
            placeholder="Search tenant name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="unit-selection-list" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 24 }}>
          {filteredTenants.map(tenant => (
            <div 
              key={tenant.uuid} 
              className={cn("unit-selection-item", selectedTenantUuid === tenant.uuid && "unit-selection-item--selected")}
              onClick={() => setSelectedTenantUuid(tenant.uuid)}
              style={{ padding: '10px 14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="unit-icon-box" style={{ width: 32, height: 32, background: 'var(--clay-faint)', color: 'var(--clay)' }}>
                  <UserPlus size={16} />
                </div>
                <div>
                  <div className="unit-name" style={{ fontSize: 13 }}>
                    <TenantNameDisplay tenant={tenant} fallback="No Tenant" />
                  </div>
                  <div className="property-name" style={{ fontSize: 11 }}>{tenant.email || tenant.phone}</div>
                </div>
              </div>
              {selectedTenantUuid === tenant.uuid && <CheckCircle2 size={18} color="var(--clay)" />}
            </div>
          ))}
          {filteredTenants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No tenants found.</p>
            </div>
          )}
        </div>

        {selectedTenantUuid && (
          <div className="assignment-details animate-fade-in" style={{ background: 'var(--bg)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
             <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CreditCard size={14} color="var(--forest)" />
                <h5 style={{ fontSize: 11, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenancy Terms</h5>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: rentDetails.rentType === 'Lease' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>Rent Amount (₦)</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  className={cn("form-input", !rentDetails.rentAmount && "form-input--error")}
                  style={controlStyle}
                  value={rentDetails.rentAmount}
                  onChange={(e) => setRentDetails({...rentDetails, rentAmount: formatAmountDisplay(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>Initial Paid (₦)</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  style={controlStyle}
                  value={rentDetails.rentAmountPaid}
                  onChange={(e) => setRentDetails({...rentDetails, rentAmountPaid: formatAmountDisplay(e.target.value)})}
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
                  triggerStyle={controlStyle}
                />
              </div>
              {rentDetails.rentType === 'Lease' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Lease Years</label>
                  <input 
                    type="number"
                    min="1"
                    className={cn("form-input", (!rentDetails.leaseYears || parseInt(String(rentDetails.leaseYears), 10) < 1) && "form-input--error")}
                    style={controlStyle}
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
                  style={controlStyle}
                  value={rentDetails.rentStartDate}
                  onChange={(e) => setRentDetails({...rentDetails, rentStartDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> End Date
                </label>
                <input 
                  type="date"
                  className={cn("form-input", !rentDetails.rentDueDate && "form-input--error")}
                  style={controlStyle}
                  value={rentDetails.rentDueDate}
                  onChange={(e) => setRentDetails({...rentDetails, rentDueDate: e.target.value})}
                  title="Auto-filled from start date and cycle — you can edit if needed"
                />
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Auto-filled from start date and cycle. Edit if needed.
                </p>
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
          border-color: var(--clay-faint);
          box-shadow: var(--shadow-sm);
        }
        .unit-selection-item--selected {
          background: white;
          border-color: var(--clay);
          box-shadow: var(--shadow-sm);
        }
        .unit-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .form-input--error {
          border-color: var(--error) !important;
          background: var(--error-bg) !important;
        }
      `}</style>
    </Modal>
  )
}
