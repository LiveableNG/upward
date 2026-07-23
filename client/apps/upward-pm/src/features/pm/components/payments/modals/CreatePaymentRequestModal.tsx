'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, CreditCard, AlertCircle } from 'lucide-react'
import { Unit } from '../../../services/propertyService'
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '../../../hooks/usePayments'
import { useToast } from '@/components/common/Toast'
import { PmPaymentRequest } from '../../../services/paymentService'
import { useDocuments } from '../../../hooks/useDocuments'
import { useAuth } from '@/features/auth/AuthContext'
import { formatTenantName } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'

interface CreatePaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  payments?: any[];
  existingRequest?: PmPaymentRequest;
  onProceedToEditor?: (template: any, paymentContext: any) => void;
}

const getInitialLeaseYears = (unit: any) => {
  if (unit && unit.rentType && String(unit.rentType).toUpperCase().trim() === 'LEASE' && unit.rentStartDate && unit.rentDueDate) {
    const start = new Date(unit.rentStartDate);
    const end = new Date(unit.rentDueDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime > 0) {
      return Math.round(diffTime / (1000 * 60 * 60 * 24 * 365));
    }
  }
  return 1; // Default to 1 year if we can't calculate
}

const EMPTY_PAYMENTS: any[] = []

export function CreatePaymentRequestModal({
  isOpen,
  onClose,
  unit,
  payments = EMPTY_PAYMENTS,
  existingRequest,
  onProceedToEditor
}: CreatePaymentRequestModalProps) {
  const isEditing = !!existingRequest
  const [hasInitialized, setHasInitialized] = useState(false)
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
  const [includeManagementFee, setIncludeManagementFee] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState<string>('NONE')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<string>('MONTHLY')
  const { templates } = useDocuments()

  const { success, error } = useToast()
  const { user } = useAuth()
  const createMutation = useCreatePaymentRequest()
  const updateMutation = useUpdatePaymentRequest()

  const hasBankDetails = !!(user?.bankCode && user?.accountNumber)

  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false)
      return
    }

    if (hasInitialized) return

    if (existingRequest) {
      setAmount(existingRequest.amount.toString())
      setDueDate(new Date(existingRequest.dueDate).toISOString().split('T')[0])
      if (existingRequest.rentStartDate) setRentStartDate(new Date(existingRequest.rentStartDate).toISOString().split('T')[0])
      if (existingRequest.rentEndDate) setRentEndDate(new Date(existingRequest.rentEndDate).toISOString().split('T')[0])
      setDescription(existingRequest.description || '')
      setAllowPartial(existingRequest.allowPartial)
      setMinAmount(existingRequest.minAmount?.toString() || '')
      setReminderFrequency(existingRequest.reminderFrequency || 'NONE')
      
      const isSched = !!existingRequest.scheduledAt
      setIsScheduled(isSched)
      setIsRecurring(existingRequest.isRecurring || false)
      setRecurrenceInterval(existingRequest.recurrenceInterval || 'MONTHLY')
      if (existingRequest.scheduledAt) {
        const date = new Date(existingRequest.scheduledAt)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        setScheduledAt(`${year}-${month}-${day}T${hours}:${minutes}`)
      } else {
        setScheduledAt('')
      }

      if (existingRequest.lineItems) {
        setLineItems(existingRequest.lineItems.map(li => ({
          name: li.name,
          amount: li.amount.toString()
        })))
      }
      setHasInitialized(true)
    } else if (unit) {
      const type = unit.rentType?.toUpperCase() || 'ANNUALLY'
      setRentType(type)
      setReminderFrequency('WEEKLY') // Default to weekly for new requests

      let calculatedStartDate = unit.rentStartDate ? new Date(unit.rentStartDate) : new Date()
      let calculatedEndDate = unit.rentDueDate ? new Date(unit.rentDueDate) : new Date()
      
      if (!unit.rentDueDate && unit.rentStartDate) {
        // Calculate initial end date if missing
        const end = new Date(unit.rentStartDate)
        const computedLeaseYears = (unit as any).leaseYears || getInitialLeaseYears(unit)
        if (type === 'MONTHLY') end.setMonth(end.getMonth() + 1)
        else if (type === 'LEASE') end.setFullYear(end.getFullYear() + Number(computedLeaseYears))
        else end.setFullYear(end.getFullYear() + 1)
        end.setDate(end.getDate() - 1)
        calculatedEndDate = end
      }

      // 2. Check for payments in this current period
      const currentPeriodPayments = payments.filter(p => {
        if (!p.periodStart || !p.periodEnd) return false;
        const pStart = new Date(p.periodStart).toISOString().split('T')[0];
        const pEnd = new Date(p.periodEnd).toISOString().split('T')[0];
        const uStart = calculatedStartDate.toISOString().split('T')[0];
        const uEnd = calculatedEndDate.toISOString().split('T')[0];
        return pStart === uStart && pEnd === uEnd;
      });

      const totalPaidForPeriod = currentPeriodPayments.reduce((sum, p) => sum + p.amount, 0);
      const isFullyPaid = totalPaidForPeriod >= unit.rentAmount;

      let requestAmountForRent = unit.rentAmount || 0;
      let finalStartDate = calculatedStartDate;
      let finalEndDate = calculatedEndDate;

      if (!isFullyPaid && totalPaidForPeriod > 0) {
        // Part-payment detected! Request the balance for the SAME period
        requestAmountForRent = (unit.rentAmount || 0) - totalPaidForPeriod;
      } else if (isFullyPaid) {
        // Fully paid! Advance to the NEXT period
        finalStartDate = new Date(calculatedEndDate);
        finalStartDate.setDate(finalStartDate.getDate() + 1);

        finalEndDate = new Date(finalStartDate);
        const computedLeaseYears = (unit as any).leaseYears || getInitialLeaseYears(unit)
        if (type === 'MONTHLY') finalEndDate.setMonth(finalEndDate.getMonth() + 1);
        else if (type === 'LEASE') finalEndDate.setFullYear(finalEndDate.getFullYear() + Number(computedLeaseYears));
        else finalEndDate.setFullYear(finalEndDate.getFullYear() + 1);
        finalEndDate.setDate(finalEndDate.getDate() - 1);
        
        requestAmountForRent = unit.rentAmount || 0;
      }

      const items = [{ name: 'Rent', amount: requestAmountForRent.toString() }]
      if (unit.managementFee && unit.managementFee > 0 && includeManagementFee) {
        items.push({ name: 'Management Fee', amount: unit.managementFee.toString() })
      }

      setLineItems(items)
      const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
      setAmount(total.toString())

      const startDateStr = finalStartDate.toISOString().split('T')[0]
      const endDateStr = finalEndDate.toISOString().split('T')[0]
      
      setRentStartDate(startDateStr)
      setRentEndDate(endDateStr)
      setDueDate(startDateStr)
      setIsScheduled(false)
      setScheduledAt('')
      setHasInitialized(true)
    }
  }, [isOpen, unit, existingRequest, payments, hasInitialized])

  // Update End Date when Rent Type changes
  useEffect(() => {
    if (isEditing || !rentStartDate) return

    const endDate = new Date(rentStartDate)
    const computedLeaseYears = (unit as any).leaseYears || getInitialLeaseYears(unit)
    if (rentType === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else if (rentType === 'LEASE') {
      endDate.setFullYear(endDate.getFullYear() + Number(computedLeaseYears))
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }
    endDate.setDate(endDate.getDate() - 1)
    const endDateStr = endDate.toISOString().split('T')[0]
    setRentEndDate(endDateStr)
    setDueDate(rentStartDate)
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

  const handleToggleManagementFee = (checked: boolean) => {
    setIncludeManagementFee(checked)
    if (checked) {
      if (unit?.managementFee && !lineItems.some(item => item.name === 'Management Fee')) {
        const newItems = [...lineItems, { name: 'Management Fee', amount: unit.managementFee.toString() }]
        setLineItems(newItems)
        updateTotalFromItems(newItems)
      }
    } else {
      const newItems = lineItems.filter(item => item.name !== 'Management Fee')
      setLineItems(newItems)
      updateTotalFromItems(newItems)
    }
  }

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return error('Please enter a valid amount')
    if (!dueDate) return error('Please select a due date')
    if (!hasBankDetails) return error('Please set up your bank information in settings to receive payments')
    if (!isEditing && !selectedTemplateUuid) return error('Please select a document template')
    
    if (isScheduled) {
      if (!scheduledAt) return error('Please select a scheduled delivery date and time')
      if (new Date(scheduledAt) <= new Date()) return error('Scheduled date and time must be in the future')
    }

    const paymentContext = {
      unitUuid: unit!.uuid,
      amount: parseFloat(amount),
      dueDate: rentEndDate || dueDate,
      rentType: lineItems.some(item => item.name === 'Rent') ? rentType : undefined,
      rentStartDate,
      rentEndDate,
      reminderFrequency,
      description: description || `Payment request for Unit ${unit!.unitName}`,
      allowPartial,
      minAmount: allowPartial ? parseFloat(minAmount) || 0 : undefined,
      scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      isRecurring: isScheduled ? isRecurring : false,
      recurrenceInterval: isScheduled && isRecurring ? recurrenceInterval : null,
      lineItems: lineItems.filter(li => li.name && li.amount).map(li => ({
        name: li.name,
        amount: parseFloat(li.amount)
      }))
    }

    if (!isEditing && selectedTemplateUuid && onProceedToEditor) {
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
        onSuccess: (res: any) => {
          if (unit.tenant?.email?.endsWith('@upward.com')) {
            if (res?.paymentLink) {
              navigator.clipboard.writeText(res.paymentLink)
                .then(() => {
                  success('Payment link copied to clipboard! Share it manually as this tenant has no registered email.')
                })
                .catch(() => {
                  success('Payment request created! Share the link: ' + res.paymentLink)
                })
            } else {
              success('Payment request created successfully!')
            }
          } else {
            success('Payment request sent successfully!')
          }
          onClose()
        },
        onError: (err: any) => {
          error(err?.message || 'Failed to send payment request')
        }
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Payment Request' : 'Request Payment'}
      subtitle={`Unit ${unit.unitName} • ${unit.tenant ? formatTenantName(unit.tenant) : 'No Tenant'}`}
      icon={CreditCard}
      maxWidth={600}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
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
                (!isEditing && selectedTemplateUuid) ? 'Proceed to Editor' :
                  isEditing ? 'Update Request' : 'Send Request'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!unit.isSynced && (
          <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⚠️</span> Unit must be synced to Upward Pay for this request to succeed.
          </p>
        )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Breakdown <span style={{ color: 'var(--error)' }}>*</span></label>
            {unit.managementFee > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Include Mgt. Fee</span>
                <input 
                  type="checkbox" 
                  checked={includeManagementFee}
                  onChange={(e) => handleToggleManagementFee(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
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
            <label className="form-label">Total Amount (₦) <span style={{ color: 'var(--error)' }}>*</span></label>
            <input
              type="number"
              value={amount}
              className="form-input"
              readOnly
              style={{ background: 'var(--surface-hover)', fontWeight: 700 }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Due Date <span style={{ color: 'var(--error)' }}>*</span></label>
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

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="isScheduled"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isScheduled" className="form-label" style={{ marginBottom: 0 }}>Schedule Delivery (Bill in Advance)</label>
          </div>

          {isScheduled && (
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
                  <strong>How it works:</strong> The tenant won't receive the payment link immediately.
                  It will automatically be delivered on your scheduled date and time.
                </p>
              </div>
              <label className="form-label">Activation Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="form-input"
                style={{ marginBottom: 16 }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isRecurring ? 12 : 0 }}>
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="isRecurring" className="form-label" style={{ marginBottom: 0, fontSize: 13, color: 'var(--text)' }}>Repeat this schedule (Recurring)</label>
              </div>

              {isRecurring && (
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>Repeat Interval</label>
                  <FormSelect
                    value={recurrenceInterval}
                    onChange={(val) => setRecurrenceInterval(val)}
                    options={[
                      { label: 'Monthly', value: 'MONTHLY' },
                      { label: 'Quarterly', value: 'QUARTERLY' },
                      { label: 'Yearly', value: 'YEARLY' }
                    ]}
                    portalOnDesktop
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={14} color="var(--clay)" /> Automated Reminders
            </label>
            <FormSelect
              value={reminderFrequency}
              onChange={(val) => setReminderFrequency(val)}
              options={[
                { label: 'No Reminders', value: 'NONE' },
                { label: 'Every Day', value: 'DAILY' },
                { label: 'Every 2 Days', value: 'EVERY_2_DAYS' },
                { label: 'Every Week', value: 'WEEKLY' }
              ]}
              portalOnDesktop
            />
          </div>

          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Follow-up Document <span style={{ color: 'var(--error)' }}>*</span></label>
              {templates.filter((t: any) => t.type !== 'SYSTEM').length === 0 ? (
                <div style={{ padding: '12px 16px', background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No custom templates available.</span>
                  <a href="/documents" className="btn btn--secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}>
                    Create Template
                  </a>
                </div>
              ) : (
                <FormSelect
                  value={selectedTemplateUuid}
                  onChange={(val) => setSelectedTemplateUuid(val)}
                  options={[
                    { label: 'Select template', value: '' },
                    ...templates.filter((t: any) => t.type !== 'SYSTEM').map((t: any) => ({ label: t.name, value: t.uuid }))
                  ]}
                  portalOnDesktop
                />
              )}
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}
