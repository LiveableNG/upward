'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, CreditCard, AlertCircle } from 'lucide-react'
import { Unit } from '../../../services/propertyService'
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '../../../hooks/usePayments'
import { useToast } from '@/components/common/Toast'
import { PmPaymentRequest } from '../../../services/paymentService'
import { useDocuments } from '../../../hooks/useDocuments'
import { useAuth } from '@/features/auth/AuthContext'

interface CreatePaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  existingRequest?: PmPaymentRequest;
  onProceedToEditor?: (template: any, paymentContext: any) => void;
}

export function CreatePaymentRequestModal({
  isOpen,
  onClose,
  unit,
  existingRequest,
  onProceedToEditor
}: CreatePaymentRequestModalProps) {
  const isEditing = !!existingRequest
  const [amount, setAmount] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [rentStartDate, setRentStartDate] = useState<string>('')
  const [rentEndDate, setRentEndDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [rentType, setRentType] = useState<string>('ANNUALLY')
  const [allowPartial, setAllowPartial] = useState(false)
  const [minAmount, setMinAmount] = useState<string>('')
  const [lineItems, setLineItems] = useState<{ name: string; amount: string }[]>([
    { name: 'Rent', amount: '' }
  ])
  const [selectedTemplateUuid, setSelectedTemplateUuid] = useState<string>('')
  const { templates } = useDocuments()

  const { success, error } = useToast()
  const { user } = useAuth()
  const createMutation = useCreatePaymentRequest()
  const updateMutation = useUpdatePaymentRequest()

  const hasBankDetails = !!(user?.bankCode && user?.accountNumber)

  useEffect(() => {
    if (existingRequest) {
      setAmount(existingRequest.amount.toString())
      setDueDate(new Date(existingRequest.dueDate).toISOString().split('T')[0])
      if (existingRequest.rentStartDate) setRentStartDate(new Date(existingRequest.rentStartDate).toISOString().split('T')[0])
      if (existingRequest.rentEndDate) setRentEndDate(new Date(existingRequest.rentEndDate).toISOString().split('T')[0])
      setDescription(existingRequest.description || '')
      setAllowPartial(existingRequest.allowPartial)
      setMinAmount(existingRequest.minAmount?.toString() || '')

      if (existingRequest.lineItems) {
        setLineItems(existingRequest.lineItems.map(li => ({
          name: li.name,
          amount: li.amount.toString()
        })))
      }
    } else if (unit) {
      const items = [{ name: 'Rent', amount: unit.rentAmount.toString() }]
      if (unit.managementFee && unit.managementFee > 0) {
        items.push({ name: 'Management Fee', amount: unit.managementFee.toString() })
      }

      setLineItems(items)
      const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
      setAmount(total.toString())
      const type = unit.rentType?.toUpperCase() || 'ANNUALLY'
      setRentType(type)

      // The NEXT cycle starts when the current one ends
      const startDate = unit.rentDueDate || unit.rentStartDate || new Date()
      const startDateStr = new Date(startDate).toISOString().split('T')[0]
      setRentStartDate(startDateStr)

      // Calculate initial end date
      const endDate = new Date(startDate)
      if (type === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }
      const endDateStr = endDate.toISOString().split('T')[0]
      setRentEndDate(endDateStr)
      setDueDate(endDateStr)
    }
  }, [unit, existingRequest])

  // Update End Date when Rent Type changes
  useEffect(() => {
    if (isEditing || !rentStartDate) return

    const endDate = new Date(rentStartDate)
    if (rentType === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }
    const endDateStr = endDate.toISOString().split('T')[0]
    setRentEndDate(endDateStr)
    setDueDate(endDateStr)
  }, [rentType, rentStartDate, isEditing])

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
    if (!hasBankDetails) return error('Please set up your bank information in settings to receive payments')
    if (!selectedTemplateUuid) return error('Please select a document template')

    const paymentContext = {
      unitUuid: unit!.uuid,
      amount: parseFloat(amount),
      dueDate: rentEndDate || dueDate,
      rentType: lineItems.some(item => item.name === 'Rent') ? rentType : undefined,
      rentStartDate,
      rentEndDate,
      description: description || `Payment request for Unit ${unit!.unitName}`,
      allowPartial,
      minAmount: allowPartial ? parseFloat(minAmount) || 0 : undefined,
      lineItems: lineItems.filter(li => li.name && li.amount).map(li => ({
        name: li.name,
        amount: parseFloat(li.amount)
      }))
    }

    if (selectedTemplateUuid && onProceedToEditor) {
      const template = templates.find((t: any) => t.uuid === selectedTemplateUuid)
      onProceedToEditor(template, paymentContext)
      return
    }

    if (isEditing && existingRequest) {
      updateMutation.mutate({
        uuid: existingRequest.uuid,
        data: paymentContext
      }, {
        onSuccess: () => {
          success('Payment request updated successfully!')
          onClose()
        },
        onError: (err: any) => {
          error(err?.message || 'Failed to update payment request')
        }
      })
    } else {
      createMutation.mutate(paymentContext, {
        onSuccess: () => {
          success('Payment request sent successfully!')
          onClose()
        },
        onError: (err: any) => {
          error(err?.message || 'Failed to send payment request')
        }
      })
    }
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
              <h2 className="modal__title">{isEditing ? 'Edit Payment Request' : 'Request Payment'}</h2>
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

        {!hasBankDetails && (
          <div style={{
            background: 'var(--error-faint)',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--error)',
            marginBottom: 20,
            border: '1px solid var(--error-border)',
            display: 'flex',
            gap: 10,
            alignItems: 'center'
          }}>
            <AlertCircle size={20} />
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Missing Bank Details</p>
              <p style={{ margin: 0, fontSize: 12 }}>You must set up your bank account in Settings to receive payments.</p>
            </div>
          </div>
        )}

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
                  style={{ flex: 2, background: (item.name === 'Rent' || item.name === 'Management Fee') ? 'var(--ivory-dim)' : undefined }}
                  readOnly={item.name === 'Rent' || item.name === 'Management Fee'}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                  className="form-input"
                  style={{ flex: 1, background: (item.name === 'Rent' || item.name === 'Management Fee') ? 'var(--ivory-dim)' : undefined }}
                  readOnly={item.name === 'Rent' || item.name === 'Management Fee'}
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

        {lineItems.some(item => item.name === 'Rent') && (
          <div className="form-group" style={{ marginTop: 8, marginBottom: 24 }}>
            <label className="form-label">Rent Type (Frequency)</label>
            <select
              className="form-input"
              value={rentType}
              onChange={(e) => setRentType(e.target.value)}
              style={{ background: 'var(--surface-hover)', fontWeight: 600, borderRadius: 12 }}
            >
              <option value="ANNUALLY">Annually</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--clay)' }}>ℹ️</span> This determines how the next due date is calculated after payment.
            </p>
          </div>
        )}

        <div style={{
          background: 'var(--ivory-dim)',
          padding: '12px 16px',
          borderRadius: 12,
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 20,
          borderLeft: '3px solid var(--clay)',
          lineHeight: 1.6
        }}>
          <p style={{ margin: 0 }}>
            <strong>Cycle Dates:</strong> The <span style={{ color: 'var(--dark)', fontWeight: 600 }}>Start Date</span> is pre-set based on the tenant's current expiration.
            The <span style={{ color: 'var(--dark)', fontWeight: 600 }}>End Date</span> is automatically calculated based on your <strong>Rent Type</strong> (Annually/Monthly).
            Once paid, the tenant's next due date will be updated to the End Date shown below.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Rent Start Date</label>
            <input
              type="date"
              value={rentStartDate}
              className="form-input"
              readOnly
              style={{ background: 'var(--ivory-dim)', cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rent End Date</label>
            <input
              type="date"
              value={rentEndDate}
              className="form-input"
              readOnly
              style={{ background: 'var(--ivory-dim)', cursor: 'not-allowed', fontWeight: 600 }}
            />
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
            <label className="form-label">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="form-input"
            />
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>When should this payment be settled?</p>
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

        <div className="form-group" style={{ marginTop: 24, padding: '20px', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Follow-up Document</span>
            {selectedTemplateUuid && <span style={{ fontSize: 11, color: 'var(--forest)', fontWeight: 700 }}>Template Selected</span>}
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Choose a document template to send along with this payment request.</p>
          <select
            className="form-input"
            style={{ borderRadius: 12, background: 'white' }}
            value={selectedTemplateUuid}
            onChange={(e) => setSelectedTemplateUuid(e.target.value)}
          >
            <option value="">Select a document template</option>
            {templates.map((t: any) => (
              <option key={t.uuid} value={t.uuid}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || !unit.isSynced}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Processing...' :
              !unit.isSynced ? 'Sync Required' :
                selectedTemplateUuid ? 'Proceed to Editor' :
                  isEditing ? 'Update Request' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
