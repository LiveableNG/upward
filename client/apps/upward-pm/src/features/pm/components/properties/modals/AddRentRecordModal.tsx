import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Calendar, History, User } from 'lucide-react'
import { useToast } from '@/components/common/Toast'

interface AddRentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  unitName: string;
  rentType?: string;
  initialAmount?: number;
  currentUnitStartDate?: string;
  currentTenantName?: string;
  maxCurrentAmount?: number;
}

export const AddRentRecordModal: React.FC<AddRentRecordModalProps> = ({
  isOpen, onClose, onSave, isPending, unitName, rentType, initialAmount, currentUnitStartDate, currentTenantName, maxCurrentAmount
}) => {
  const [paymentType, setPaymentType] = useState<'CURRENT' | 'PAST'>('CURRENT')
  const [isForCurrentTenant, setIsForCurrentTenant] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    tenantName: ''
  })
  const [dateError, setDateError] = useState('')
  const { error } = useToast()

  useEffect(() => {
    if (isOpen) {
      setPaymentType('CURRENT')
      setIsForCurrentTenant(true)
      
      let defaultAmount = initialAmount?.toString() || '';
      if (maxCurrentAmount !== undefined) {
        defaultAmount = maxCurrentAmount.toString();
      }

      setFormData({
        amount: defaultAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        periodStart: '',
        periodEnd: '',
        tenantName: ''
      })
      setDateError('')
    }
  }, [isOpen, initialAmount, maxCurrentAmount])

  // Auto-calculate Period End based on Period Start and rentType
  useEffect(() => {
    if (paymentType === 'PAST' && formData.periodStart && rentType) {
      const start = new Date(formData.periodStart)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (rentType === 'Lease' || rentType === 'LEASE') {
        end.setFullYear(end.getFullYear() + 1)
      } else {
        end.setFullYear(end.getFullYear() + 1)
      }

      end.setDate(end.getDate() - 1)

      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.periodEnd) {
        setFormData(prev => ({ ...prev, periodEnd: formattedEnd }))
      }
    }
  }, [formData.periodStart, rentType, paymentType])

  // Date validation for Past Payments
  useEffect(() => {
    if (paymentType === 'PAST' && formData.periodEnd && currentUnitStartDate) {
      if (new Date(formData.periodEnd) >= new Date(currentUnitStartDate)) {
        setDateError(`Past payment end date must be strictly before the unit's current rent start date (${new Date(currentUnitStartDate).toLocaleDateString()}).`)
      } else {
        setDateError('')
      }
    } else {
      setDateError('')
    }
  }, [formData.periodEnd, currentUnitStartDate, paymentType])

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      error('Please enter a valid payment amount.')
      return
    }

    if (paymentType === 'CURRENT' && maxCurrentAmount !== undefined) {
      if (parseFloat(formData.amount) > maxCurrentAmount) {
        error(`Amount cannot exceed the remaining balance of ₦${maxCurrentAmount.toLocaleString()} for the current cycle.`)
        return
      }
    }

    if (!formData.paymentDate) {
      error('Please select a payment date.')
      return
    }

    if (paymentType === 'PAST') {
       if (!formData.periodStart) {
         error('Please select a period start date for the past payment.')
         return
       }
       if (!formData.periodEnd) {
         error('Please select a period end date for the past payment.')
         return
       }
       if (dateError) {
         error(dateError)
         return
       }
       if (!isForCurrentTenant && !formData.tenantName.trim()) {
         error('Please enter the name of the past tenant.')
         return
       }
    }

    onSave({
      paymentType,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate,
      periodStart: paymentType === 'PAST' ? formData.periodStart : undefined,
      periodEnd: paymentType === 'PAST' ? formData.periodEnd : undefined,
      isForCurrentTenant: paymentType === 'CURRENT' ? true : isForCurrentTenant,
      tenantName: (paymentType === 'PAST' && !isForCurrentTenant) ? formData.tenantName : undefined,
      method: 'Bank Transfer',
      status: 'SUCCESS'
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Rent Record"
      subtitle={`Record a payment for Unit ${unitName}`}
      maxWidth={550}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      }
    >
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <label className="form-label" style={{ marginBottom: 12 }}>Payment Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div 
            onClick={() => setPaymentType('CURRENT')}
            style={{
              padding: 16,
              borderRadius: 12,
              border: paymentType === 'CURRENT' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: paymentType === 'CURRENT' ? 'var(--forest-faint)' : 'var(--bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: paymentType === 'CURRENT' ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: paymentType === 'CURRENT' ? 'var(--forest)' : 'var(--text-muted)' }}>
                <Calendar size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Current / Upcoming</span>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: paymentType === 'CURRENT' ? '5px solid var(--forest)' : '2px solid var(--border)',
                background: 'var(--bg)',
                transition: 'all 0.2s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>For the active rent cycle</span>
          </div>

          <div 
            onClick={() => setPaymentType('PAST')}
            style={{
              padding: 16,
              borderRadius: 12,
              border: paymentType === 'PAST' ? '2px solid var(--clay)' : '1px solid var(--border)',
              background: paymentType === 'PAST' ? 'var(--clay-faint)' : 'var(--bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: paymentType === 'PAST' ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: paymentType === 'PAST' ? 'var(--clay)' : 'var(--text-muted)' }}>
                <History size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Past Payment</span>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: paymentType === 'PAST' ? '5px solid var(--clay)' : '2px solid var(--border)',
                background: 'var(--bg)',
                transition: 'all 0.2s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>For historical records</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: paymentType === 'PAST' ? 16 : 24 }}>
        <div className="form-group">
          <label className="form-label">Amount Paid (₦)</label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 500000"
            max={paymentType === 'CURRENT' ? maxCurrentAmount : undefined}
            value={formData.amount}
            onChange={e => {
              let val = e.target.value;
              if (paymentType === 'CURRENT' && maxCurrentAmount !== undefined && parseFloat(val) > maxCurrentAmount) {
                val = maxCurrentAmount.toString();
              }
              setFormData({ ...formData, amount: val })
            }}
          />
          {paymentType === 'CURRENT' && maxCurrentAmount !== undefined && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Remaining balance: ₦{maxCurrentAmount.toLocaleString()}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Date Paid</label>
          <input
            type="date"
            className="form-input"
            value={formData.paymentDate}
            onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
          />
        </div>
      </div>

      {paymentType === 'PAST' && (
        <div className="animate-fade-in" style={{ padding: 20, background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Period Start</label>
              <input
                type="date"
                className="form-input"
                value={formData.periodStart}
                onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period End</label>
              <input
                type="date"
                className="form-input"
                value={formData.periodEnd}
                style={{ borderColor: dateError ? 'var(--error)' : 'var(--border)' }}
                onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
              />
            </div>
          </div>
          {dateError && (
            <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 16, marginTop: -8 }}>
              {dateError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <User size={14} /> Is this for the current tenant?
            </label>
            <div className="toggle-switch">
              <input 
                type="checkbox" 
                id="isForCurrentTenant"
                checked={isForCurrentTenant}
                onChange={(e) => setIsForCurrentTenant(e.target.checked)}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="isForCurrentTenant"
                style={{
                  width: 44,
                  height: 24,
                  background: isForCurrentTenant ? 'var(--clay)' : '#cbd5e1',
                  borderRadius: 12,
                  display: 'block',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: '0.3s'
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 2,
                  left: isForCurrentTenant ? 22 : 2,
                  transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} />
              </label>
            </div>
          </div>

          {!isForCurrentTenant && (
            <div className="form-group animate-fade-in">
              <input
                type="text"
                className="form-input"
                placeholder="Enter past tenant's full name"
                value={formData.tenantName}
                onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
              />
            </div>
          )}
          {isForCurrentTenant && currentTenantName && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This record will be attached to <strong>{currentTenantName}</strong>.
            </div>
          )}
        </div>
      )}

    </Modal>
  )
}
