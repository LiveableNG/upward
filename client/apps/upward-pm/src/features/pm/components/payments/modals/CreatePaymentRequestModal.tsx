'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, CreditCard, AlertCircle, PieChart, Sliders, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Unit } from '../../../services/propertyService'
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '../../../hooks/usePayments'
import { useToast } from '@/components/common/Toast'
import { PmPaymentRequest, getPropertySettlementSplits, SettlementSplitRule } from '../../../services/paymentService'
import { useDocuments } from '../../../hooks/useDocuments'
import { useSettlementAccounts } from '../../../hooks/useSettlementAccounts'
import { useAuth } from '@/features/auth/AuthContext'
import { formatTenantName } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useSubscription } from '../../../hooks/useSubscription'
import { usePricingModal } from '../../../hooks/usePricingModal'
import { FeatureKey } from '../../../types/subscription'

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
  const router = useRouter()
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
  const [selectedSettlementAccountUuid, setSelectedSettlementAccountUuid] = useState<string>('')
  const [includeManagementFee, setIncludeManagementFee] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState<string>('NONE')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<string>('MONTHLY')
  const { templates } = useDocuments()
  const { accounts, primaryAccount } = useSettlementAccounts()

  // Settlement Split State
  const propertyUuid = (unit?.property as any)?.uuid
  const { data: propertySplits = [] } = useQuery<SettlementSplitRule[]>({
    queryKey: ['property-settlement-splits', propertyUuid],
    queryFn: () => getPropertySettlementSplits(propertyUuid!),
    enabled: isOpen && !!propertyUuid,
  })

  const [isCustomRentSplits, setIsCustomRentSplits] = useState(false)
  const [customRentSplits, setCustomRentSplits] = useState<Array<{ manualAccountUuid: string; percentage: number }>>([])
  const [lineItemRoutes, setLineItemRoutes] = useState<Record<number, string>>({})

  const { success, error } = useToast()
  const { user } = useAuth()
  const createMutation = useCreatePaymentRequest()
  const updateMutation = useUpdatePaymentRequest()
  const { checkAccess } = useSubscription()
  const { openPricing } = usePricingModal()

  const isEmployee = user?.accountType === 'PM_EMPLOYEE' || user?.canManageCompanySettings === false
  const hasBankDetails = isEmployee
    ? Boolean(accounts.length > 0 || user?.hasBankDetails || user?.employer?.hasBankDetails || (user?.bankCode && user?.accountNumber) || (user?.employer?.bankCode && user?.employer?.accountNumber))
    : Boolean(accounts.length > 0 || user?.hasBankDetails || (user?.bankCode && user?.accountNumber))

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
      if (existingRequest.settlementAccount?.uuid) {
        setSelectedSettlementAccountUuid(existingRequest.settlementAccount.uuid)
      } else if ((existingRequest as any).manualAccountId) {
        const found = accounts.find(a => a.id === (existingRequest as any).manualAccountId)
        if (found) setSelectedSettlementAccountUuid(found.uuid)
      }
      setHasInitialized(true)
    } else if (unit) {
      const type = unit.rentType?.toUpperCase() || 'ANNUALLY'
      setRentType(type)
      setReminderFrequency('NONE') // Default to no reminders for new requests

      // Initialize settlement account from property or primary
      const propAccUuid = (unit.property as any)?.manualAccount?.uuid
      if (propAccUuid) {
        setSelectedSettlementAccountUuid(propAccUuid)
      } else if (primaryAccount) {
        setSelectedSettlementAccountUuid(primaryAccount.uuid)
      } else if (accounts.length > 0) {
        setSelectedSettlementAccountUuid(accounts[0].uuid)
      }

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

  // Fallback to select primary or first settlement account if not yet selected
  useEffect(() => {
    if (!selectedSettlementAccountUuid && accounts.length > 0) {
      const propAccountUuid = (unit?.property as any)?.manualAccount?.uuid
      const matchingProp = accounts.find(a => a.uuid === propAccountUuid)
      if (matchingProp) {
        setSelectedSettlementAccountUuid(matchingProp.uuid)
      } else if (primaryAccount) {
        setSelectedSettlementAccountUuid(primaryAccount.uuid)
      } else {
        setSelectedSettlementAccountUuid(accounts[0].uuid)
      }
    }
  }, [accounts, primaryAccount, unit, selectedSettlementAccountUuid])

  // Sync inherited property splits when loaded
  useEffect(() => {
    if (!isOpen) {
      setIsCustomRentSplits(false)
      setLineItemRoutes({})
      return
    }
    if (propertySplits && propertySplits.length > 0) {
      const rentSplits = propertySplits.filter(s => !s.lineItemName || s.lineItemName.toLowerCase() === 'rent')
      if (rentSplits.length > 0) {
        setCustomRentSplits(rentSplits.map(s => ({
          manualAccountUuid: s.manualAccount?.uuid || s.manualAccountUuid,
          percentage: Number(s.percentage)
        })))
      }
    }
  }, [isOpen, propertySplits])

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

  const hasSentWelcome = !unit.tenant || unit.tenant.hasReceivedWelcomeTemplate

  if (!hasSentWelcome) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Welcome Template Required"
        subtitle={`Unit ${unit.unitName} • ${unit.tenant ? formatTenantName(unit.tenant) : 'No Tenant'}`}
        icon={AlertCircle}
        maxWidth={500}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={() => {
                onClose()
                router.push(`/documents?tenantUuid=${unit.tenant!.uuid}&unitUuid=${unit.uuid}&templateUuid=system-onboarding-1&disableRecipientEdit=true`)
              }}
            >
              Send Welcome Template
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--error-faint, #fef2f2)', color: 'var(--error, #ef4444)', marginBottom: 8 }}>
            <AlertCircle size={32} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>Onboarding Document Required</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            You cannot request payments from this tenant yet. You must first send them the <strong>Welcome system template ("Getting Started")</strong> to complete their onboarding.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            This ensures they receive the welcome email detailing how to register and access their rent payment passport on Upward.
          </p>
        </div>
      </Modal>
    )
  }

  const handleAddLineItem = () => {
    if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
      openPricing()
      return
    }
    setLineItems([...lineItems, { name: '', amount: '' }])
  }

  const handleRemoveLineItem = (index: number) => {
    if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
      openPricing()
      return
    }
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
    if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
      openPricing()
      return
    }
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
    if (!hasBankDetails) {
      return error(
        isEmployee
          ? 'Your organization has not configured payout bank details yet. Please notify your account administrator to configure bank settings.'
          : 'Please set up your bank information in settings to receive payments'
      )
    }
    const access = checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS)
    if (!isEditing && !selectedTemplateUuid && access.hasAccess) return error('Please select a document template')
    
    if (isScheduled) {
      if (!scheduledAt) return error('Please select a scheduled delivery date and time')
      if (new Date(scheduledAt) <= new Date()) return error('Scheduled date and time must be in the future')
    }

    const selectedAccount = accounts.find(a => a.uuid === selectedSettlementAccountUuid) || primaryAccount;

    // Resolve Settlement Split Rules
    let resolvedSplitRules: Array<{ lineItemName: string; manualAccountUuid: string; percentage: number }> = []

    if (isCustomRentSplits && customRentSplits.length > 0) {
      const rentTotal = Math.round(customRentSplits.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) * 10) / 10
      if (Math.abs(rentTotal - 100) > 0.05) {
        return error(`Total percentage for custom Rent splits must equal 100%. Current sum: ${rentTotal}%`)
      }
      for (const r of customRentSplits) {
        resolvedSplitRules.push({
          lineItemName: 'Rent',
          manualAccountUuid: r.manualAccountUuid,
          percentage: Number(r.percentage)
        })
      }
    } else if (propertySplits && propertySplits.length > 0) {
      for (const s of propertySplits) {
        resolvedSplitRules.push({
          lineItemName: s.lineItemName || 'Rent',
          manualAccountUuid: s.manualAccount?.uuid || s.manualAccountUuid,
          percentage: Number(s.percentage)
        })
      }
    }

    // Add destination routes for additional line items (Management Fee, Service Charge, etc.)
    lineItems.forEach((li, idx) => {
      if (li.name && li.name.toLowerCase() !== 'rent' && lineItemRoutes[idx]) {
        resolvedSplitRules = resolvedSplitRules.filter(r => r.lineItemName.toLowerCase() !== li.name.toLowerCase())
        resolvedSplitRules.push({
          lineItemName: li.name,
          manualAccountUuid: lineItemRoutes[idx],
          percentage: 100
        })
      }
    })

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
      settlementAccountUuid: selectedSettlementAccountUuid || selectedAccount?.uuid,
      settlementSplitRules: resolvedSplitRules.length > 0 ? resolvedSplitRules : undefined,
      settlementAccount: selectedAccount ? {
        uuid: selectedAccount.uuid,
        bankName: selectedAccount.bankName,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.accountName,
        isPrimary: selectedAccount.isPrimary
      } : undefined,
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
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> Unit must be synced to Upward Pay for this request to succeed.
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
              <p style={{ margin: 0, fontSize: 12 }}>
                {isEmployee
                  ? 'Your organization has not configured payout bank details yet. Please notify your account administrator to configure bank settings before sending payment requests.'
                  : 'You must set up your bank account in Settings to receive payments.'}
              </p>
            </div>
          </div>
        )}

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Breakdown <span style={{ color: 'var(--error)' }}>*</span></label>
            {unit.managementFee > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Include Mgt. Fee</span>
                <label className="ios-switch" style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                  <input 
                    type="checkbox" 
                    checked={includeManagementFee}
                    onChange={(e) => handleToggleManagementFee(e.target.checked)}
                  />
                  <span className="ios-switch__slider"></span>
                </label>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--surface-hover)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            {lineItems.map((item, index) => (
              <div key={index} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: index < lineItems.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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

                {item.name !== 'Rent' && accounts.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payout destination:</span>
                    <select
                      value={lineItemRoutes[index] || ''}
                      onChange={(e) => setLineItemRoutes(prev => ({ ...prev, [index]: e.target.value }))}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: '#ffffff',
                        color: 'var(--dark)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Default (Property Routing)</option>
                      {accounts.map(acc => (
                        <option key={acc.uuid} value={acc.uuid}>
                          {acc.bankName} - {acc.accountNumber} {acc.title ? `[${acc.title}]` : `(${acc.accountName})`}
                        </option>
                      ))}
                    </select>
                  </div>
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

        <div className="form-group" onClickCapture={(e) => {
          if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
            e.stopPropagation()
            e.preventDefault()
            openPricing()
          }
        }}>
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

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <PieChart size={15} color="var(--clay)" /> Settlement & Split Routing <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            {accounts.length > 1 && (
              <button
                type="button"
                onClick={() => setIsCustomRentSplits(!isCustomRentSplits)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--forest, #166534)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Sliders size={12} />
                {isCustomRentSplits ? 'Use Property Default' : 'Customize for this invoice'}
              </button>
            )}
          </div>

          {accounts.length === 0 ? (
            <div style={{ padding: '12px 16px', background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No settlement account configured yet.</span>
              {!isEmployee && (
                <a href="/settings" className="btn btn--secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}>
                  Configure Bank
                </a>
              )}
            </div>
          ) : !isCustomRentSplits ? (
            /* Property Default / Inherited Mode */
            <div style={{
              padding: 14,
              borderRadius: 12,
              background: '#ffffff',
              border: '1.5px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} color="var(--forest, #166534)" />
                  Inheriting property settlement rules
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-soft)', color: 'var(--text-muted)' }}>
                  PROPERTY DEFAULT
                </span>
              </div>

              {propertySplits.length > 1 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {propertySplits.map((split, i) => (
                    <span
                      key={split.uuid || i}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--forest-faint, #f0fdf4)',
                        color: 'var(--forest, #166534)',
                        border: '1px solid rgba(22, 101, 52, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>{split.percentage}%</span>
                      <span>{split.manualAccount?.bankName}</span>
                      {split.manualAccount?.title && (
                        <span style={{ opacity: 0.8, fontSize: 10 }}>({split.manualAccount.title})</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <FormSelect
                    value={selectedSettlementAccountUuid}
                    onChange={(val) => setSelectedSettlementAccountUuid(val)}
                    options={accounts.map((acc) => ({
                      label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountName})${acc.title ? ` [${acc.title}]` : ''}${acc.isPrimary ? ' • Primary' : ''}`,
                      value: acc.uuid
                    }))}
                    portalOnDesktop
                  />
                </div>
              )}
            </div>
          ) : (
            /* Custom Rent Split Editor for this invoice */
            <div style={{
              padding: 14,
              borderRadius: 12,
              background: '#ffffff',
              border: '1.5px solid var(--forest, #166534)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>
                  Custom Rent Split Allocation
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: Math.abs(customRentSplits.reduce((s, r) => s + (Number(r.percentage) || 0), 0) - 100) < 0.05 ? 'var(--forest, #166534)' : 'var(--error, #e11d48)'
                }}>
                  Total: {customRentSplits.reduce((s, r) => s + (Number(r.percentage) || 0), 0)}% / 100%
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customRentSplits.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={row.manualAccountUuid}
                      onChange={(e) => {
                        const next = [...customRentSplits]
                        next[idx].manualAccountUuid = e.target.value
                        setCustomRentSplits(next)
                      }}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-soft, #f8fafc)',
                        color: 'var(--dark)'
                      }}
                    >
                      {accounts.map(acc => (
                        <option key={acc.uuid} value={acc.uuid}>
                          {acc.bankName} - {acc.accountNumber} {acc.title ? `[${acc.title}]` : `(${acc.accountName})`}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 6px', height: 32 }}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={row.percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          const next = [...customRentSplits]
                          next[idx].percentage = isNaN(val) ? 0 : val
                          setCustomRentSplits(next)
                        }}
                        style={{ width: 44, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 2 }}>%</span>
                    </div>

                    {customRentSplits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCustomRentSplits(customRentSplits.filter((_, i) => i !== idx))}
                        style={{ color: 'var(--error, #e11d48)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {customRentSplits.length < accounts.length && (
                  <button
                    type="button"
                    onClick={() => {
                      const used = new Set(customRentSplits.map(r => r.manualAccountUuid))
                      const unused = accounts.find(a => !used.has(a.uuid)) || accounts[0]
                      setCustomRentSplits([...customRentSplits, { manualAccountUuid: unused.uuid, percentage: 0 }])
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--clay, #b45309)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      alignSelf: 'flex-start',
                      marginTop: 2
                    }}
                  >
                    <Plus size={13} /> Add Account Split
                  </button>
                )}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Rent payouts are split and transferred to the configured destination accounts automatically upon settlement.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" onClickCapture={(e) => {
            if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
              e.stopPropagation()
              e.preventDefault()
              openPricing()
            }
          }}>
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
            <div className="form-group" onClickCapture={(e) => {
              if (!checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess) {
                e.stopPropagation()
                e.preventDefault()
                openPricing()
              }
            }}>
              <label className="form-label">Follow-up Document {checkAccess(FeatureKey.SERVICE_CHARGE_PAYMENTS).hasAccess && <span style={{ color: 'var(--error)' }}>*</span>}</label>
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
