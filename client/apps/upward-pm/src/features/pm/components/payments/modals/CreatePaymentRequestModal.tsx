'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, CreditCard } from 'lucide-react'
import { Unit } from '../../../services/propertyService'
import { useCreatePaymentRequest } from '../../../hooks/usePayments'
import { useToast } from '@/components/common/Toast'

interface CreatePaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
}

export function CreatePaymentRequestModal({ isOpen, onClose, unit }: CreatePaymentRequestModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [allowPartial, setAllowPartial] = useState(false)
  const [minAmount, setMinAmount] = useState<string>('')
  const [lineItems, setLineItems] = useState<{ name: string; amount: string }[]>([
    { name: 'Rent', amount: '' }
  ])

  const { success, error } = useToast()
  const createMutation = useCreatePaymentRequest()

  useEffect(() => {
    if (unit) {
      setAmount(unit.rentAmount.toString())
      setLineItems([{ name: 'Rent', amount: unit.rentAmount.toString() }])
      
      const date = new Date()
      date.setDate(date.getDate() + 7)
      setDueDate(date.toISOString().split('T')[0])
    }
  }, [unit])

  if (!isOpen || !unit) return null

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { name: '', amount: '' }])
  }

  const handleRemoveLineItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index)
    setLineItems(newItems)
    updateTotalFromItems(newItems)
  }

  const handleLineItemChange = (index: number, field: 'name' | 'amount', value: string) => {
    const newItems = [...lineItems]
    newItems[index][field] = value
    setLineItems(newItems)
    
    if (field === 'amount') {
      updateTotalFromItems(newItems)
    }
  }

  const updateTotalFromItems = (items: { name: string; amount: string }[]) => {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    setAmount(total.toString())
  }

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return error('Please enter a valid amount')
    if (!dueDate) return error('Please select a due date')

    createMutation.mutate({
      unitUuid: unit.uuid,
      amount: parseFloat(amount),
      dueDate,
      description: description || `Payment request for Unit ${unit.unitName}`,
      allowPartial,
      minAmount: allowPartial ? parseFloat(minAmount) || 0 : undefined,
      lineItems: lineItems.filter(li => li.name && li.amount).map(li => ({
        name: li.name,
        amount: parseFloat(li.amount)
      }))
    }, {
      onSuccess: () => {
        success('Payment request sent successfully!')
        onClose()
      },
      onError: (err: any) => {
        error(err?.message || 'Failed to send payment request')
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ padding: 10, background: 'var(--forest-faint)', borderRadius: 12, color: 'var(--forest)' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="modal__title">Request Payment</h2>
              <p className="modal__desc">Unit {unit.unitName} • {unit.tenant ? `${unit.tenant.firstName} ${unit.tenant.lastName}` : 'No Tenant'}</p>
              {!unit.isSynced && (
                <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚠️</span> Unit must be synced to Upward Pay for this request to succeed.
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Breakdown</label>
          <div style={{ background: 'var(--surface-hover)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            {lineItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Item name (e.g. Rent)" 
                  value={item.name}
                  onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                  className="form-input"
                  style={{ flex: 2, background: item.name === 'Rent' ? 'var(--ivory-dim)' : undefined }}
                  readOnly={item.name === 'Rent'}
                />
                <input 
                  type="number" 
                  placeholder="Amount" 
                  value={item.amount}
                  onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                  className="form-input"
                  style={{ flex: 1, background: item.name === 'Rent' ? 'var(--ivory-dim)' : undefined }}
                  readOnly={item.name === 'Rent'}
                />
                {lineItems.length > 1 && (
                  <button onClick={() => handleRemoveLineItem(index)} style={{ color: 'var(--error)' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            <button className="btn-text" onClick={handleAddLineItem} style={{ color: 'var(--clay)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Add Line Item
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Total Amount (₦)</label>
            <input 
              type="number" 
              value={amount} 
              className="form-input" 
              readOnly 
              style={{ background: 'var(--surface-hover)', fontWeight: 700 }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              className="form-input" 
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <input 
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            placeholder="e.g. Rent for November"
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="checkbox" 
              id="allowPartial" 
              checked={allowPartial} 
              onChange={(e) => setAllowPartial(e.target.checked)} 
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="allowPartial" className="form-label" style={{ marginBottom: 0 }}>Allow Partial Payments</label>
          </div>
          
          {allowPartial && (
            <div style={{ marginTop: 12 }}>
              <div style={{ 
                background: 'var(--ivory-dim)', 
                padding: '12px 16px', 
                borderRadius: 10, 
                fontSize: 12, 
                color: 'var(--text-muted)',
                marginBottom: 16,
                borderLeft: '3px solid var(--clay)',
                lineHeight: 1.5
              }}>
                <p style={{ margin: 0 }}>
                  <strong>How it works:</strong> Enabling this allows the tenant to pay in installments. 
                  The unit's <strong>due date</strong> will only advance once the total 
                  ₦{parseFloat(amount || '0').toLocaleString()} is fully settled.
                </p>
              </div>
              <label className="form-label">Minimum Amount (₦)</label>
              <input 
                type="number" 
                placeholder="e.g. 50000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="form-input"
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            style={{ flex: 1 }} 
            onClick={handleSubmit} 
            disabled={createMutation.isPending || !unit.isSynced}
          >
            {createMutation.isPending ? 'Sending...' : !unit.isSynced ? 'Sync Required' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
