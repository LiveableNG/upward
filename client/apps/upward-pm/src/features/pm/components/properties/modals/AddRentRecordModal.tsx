import React, { useState } from 'react'
import { X } from 'lucide-react'

interface AddRentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  unitName: string;
  rentType?: string;
}

export const AddRentRecordModal: React.FC<AddRentRecordModalProps> = ({
  isOpen, onClose, onSave, isPending, unitName, rentType
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    method: 'Bank Transfer',
    status: 'SUCCESS',
    notes: ''
  })

  // Auto-calculate Period End based on Period Start and rentType
  React.useEffect(() => {
    if (formData.periodStart && rentType) {
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
  }, [formData.periodStart, rentType])

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Add Rent Record</h2>
            <p className="modal__desc">Record a payment for Unit {unitName}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

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
          <select
            className="form-input"
            value={formData.method}
            onChange={e => setFormData({ ...formData, method: e.target.value })}
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
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

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={isPending || !formData.amount}
          >
            {isPending ? 'Saving...' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  )
}
