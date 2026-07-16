import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'

interface EditRentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  unitName: string;
  rentType?: string;
  record: any;
}

export const EditRentRecordModal: React.FC<EditRentRecordModalProps> = ({
  isOpen, onClose, onSave, isPending, unitName, rentType, record
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: '',
    periodStart: '',
    periodEnd: '',
    method: 'Bank Transfer',
    status: 'SUCCESS',
    notes: ''
  })

  useEffect(() => {
    if (record) {
      setFormData({
        amount: record.amount.toString(),
        paymentDate: record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : '',
        periodStart: record.periodStart ? new Date(record.periodStart).toISOString().split('T')[0] : '',
        periodEnd: record.periodEnd ? new Date(record.periodEnd).toISOString().split('T')[0] : '',
        method: record.method || 'Bank Transfer',
        status: record.status || 'SUCCESS',
        notes: record.notes || ''
      })
    }
  }, [record])

  // Auto-calculate Period End based on Period Start and rentType
  useEffect(() => {
    if (formData.periodStart && rentType && record) {
        // Only auto-calc if periodStart changed from original OR if periodEnd was empty
        const originalStart = record.periodStart ? new Date(record.periodStart).toISOString().split('T')[0] : ''
        if (formData.periodStart !== originalStart || !formData.periodEnd) {
            const start = new Date(formData.periodStart)
            if (isNaN(start.getTime())) return

            const end = new Date(start)
            if (rentType === 'Monthly') {
                end.setMonth(end.getMonth() + 1)
            } else if (rentType === 'Annually' || rentType === 'Yearly') {
                end.setFullYear(end.getFullYear() + 1)
            }
            
            end.setDate(end.getDate() - 1)
            
            const formattedEnd = end.toISOString().split('T')[0]
            if (formattedEnd !== formData.periodEnd) {
                setFormData(prev => ({ ...prev, periodEnd: formattedEnd }))
            }
        }
    }
  }, [formData.periodStart, rentType, record])

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Rent Record"
      subtitle={`Modify payment details for Unit ${unitName}`}
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            style={{ flex: 1 }} 
            onClick={handleSubmit} 
            disabled={isPending || !formData.amount}
          >
            {isPending ? 'Saving...' : 'Update Record'}
          </button>
        </div>
      }
    >
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Amount (₦)</label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 500000"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payment Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.paymentDate}
            onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
              onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <FormSelect
            value={formData.method}
            onChange={val => setFormData({ ...formData, method: val })}
            options={[
              { label: 'Bank Transfer', value: 'Bank Transfer' },
              { label: 'Cash', value: 'Cash' },
              { label: 'Card', value: 'Card' },
              { label: 'Other', value: 'Other' },
              { label: 'Paystack', value: 'PAYSTACK' }
            ]}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <textarea
            className="form-input"
            style={{ height: '80px', padding: '12px' }}
            placeholder="Additional details..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

    </Modal>
  )
}
