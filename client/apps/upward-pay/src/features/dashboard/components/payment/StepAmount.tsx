import React, { useState, useEffect } from 'react'
import { PayFlowPrimaryButton } from './PayPageShell'
import { type Landlord, type LineItem } from './types'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { Plus, Trash2, Info } from 'lucide-react'
import {
  formatManagerLabel,
  formatPropertyTitleWithUnit,
  getPropertyCardClassName,
  getRentCycleDisplay,
  getOwedRentAmount,
  isRentAmountEditable,
  shouldShowPropertyBalanceStrip,
} from './propertyPayDisplay'

function syncFeeLineItems(prevItems: LineItem[]): LineItem[] {
  return prevItems.filter(
    i => i.label !== 'Processing Fee' && i.label !== 'Transaction Fee' && i.label !== 'Upward Benefits',
  )
}

const EXTRA_ITEM_LABELS = [
  'Service Charge',
  'Power/Electricity',
  'Water Bill',
  'Waste Disposal',
  'Security Fee',
  'Legal & Agreement',
  'Agency Fee',
  'Caution Deposit',
]

function splitInitialLineItems(items: LineItem[]): { rentAmount: number; extras: LineItem[] } {
  const cleaned = syncFeeLineItems(items)
  if (cleaned.length === 0) return { rentAmount: 0, extras: [] }

  const rentItem = cleaned.find(i => i.label === 'Rent')
  const extras = cleaned.filter(i => i.label !== 'Rent')

  if (rentItem) {
    return { rentAmount: Number(rentItem.amount) || 0, extras }
  }

  return {
    rentAmount: cleaned.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    extras: [],
  }
}

function BalanceStrip({
  propertyBalance,
}: {
  propertyBalance: NonNullable<StepAmountProps['propertyBalance']>
}) {
  return (
    <div className="pay-flow__balance-strip">
      <div className="pay-flow__balance-chip">
        <span className="pay-flow__balance-chip-label">Owed</span>
        <span className="pay-flow__balance-chip-value pay-flow__balance-chip-value--accent">
          {formatCurrency(propertyBalance.remainingBalance, propertyBalance.currency)}
        </span>
      </div>
      <div className="pay-flow__balance-strip-divider" />
      <div className="pay-flow__balance-chip">
        <span className="pay-flow__balance-chip-label">Due</span>
        <span className="pay-flow__balance-chip-value">
          {propertyBalance.dueDate
            ? new Date(propertyBalance.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
            : 'N/A'}
        </span>
      </div>
      <div className="pay-flow__balance-strip-divider" />
      <div className="pay-flow__balance-chip">
        <span className="pay-flow__balance-chip-label">Paid</span>
        <span className="pay-flow__balance-chip-value">
          {formatCurrency(propertyBalance.amountPaid, propertyBalance.currency)}
        </span>
      </div>
    </div>
  )
}

function PropertyContextCard({ prop }: { prop: any }) {
  const rentCycle = getRentCycleDisplay(prop)
  const cardToneClass = getPropertyCardClassName(prop)

  return (
    <div
      className={`pay-flow__property-context${cardToneClass ? ` ${cardToneClass}` : ''}`}
      aria-label="Selected property"
    >
      <div className="pay-flow__card-top-row">
        <div className="pay-flow__card-title">{formatPropertyTitleWithUnit(prop)}</div>
        <span className={`pay-flow__rent-pill pay-flow__rent-pill--${rentCycle.tone}`}>{rentCycle.label}</span>
      </div>
      <div className="pay-flow__card-meta">{formatManagerLabel(prop)}</div>
    </div>
  )
}

type StepAmountProps = {
  landlord: Landlord
  userProperties?: any[]
  authUser?: any
  initialPaymentType?: string
  initialPropertyAddress?: string
  initialPropertyUuid?: string | null
  initialNarration?: string
  initialLineItems?: LineItem[]
  propertyBalance?: {
    totalOwed: number
    rentAmount?: number
    amountPaid: number
    remainingBalance: number
    currency: string
    hasActiveRequest: boolean
    allowPartial?: boolean
    dueDate?: string
    processingFee?: number
    processingRates?: {
      transactionFee: number
      benefitsFee: number
      rentValue: number
      benefitsPaid: boolean
      benefitsPaidForRequest: boolean
    }
  } | null
  requestedAmount?: number
  totalPaidAlready?: number
  processing?: boolean
  onContinue: (
    amount: number,
    narration: string,
    propertyAddress: string,
    propertyName: string,
    lineItems?: LineItem[],
    propertyUuid?: string,
  ) => void
  onBack?: () => void
}

function getDefaultRentAmount(
  propertyBalance: StepAmountProps['propertyBalance'],
  requestedAmount: number,
  totalPaidAlready: number,
  landlord: Landlord,
  initialSplit: { rentAmount: number; extras: LineItem[] },
  selectedProperty: { rentAmount?: number } | null | undefined,
): string {
  if (initialSplit.rentAmount > 0) return String(initialSplit.rentAmount)
  const remainingBalance = Math.max(0, requestedAmount - totalPaidAlready)
  if (requestedAmount > 0) return String(remainingBalance)

  const owedAmount = getOwedRentAmount(propertyBalance, selectedProperty)
  if (owedAmount > 0 && !isRentAmountEditable(propertyBalance)) return String(owedAmount)

  if (propertyBalance && propertyBalance.remainingBalance > 0 && propertyBalance.hasActiveRequest) {
    return String(propertyBalance.remainingBalance)
  }
  if (landlord.lastAmount > 0) return String(landlord.lastAmount)
  return ''
}

export function StepAmount({
  landlord,
  userProperties = [],
  authUser,
  initialPaymentType = 'Rent Payment',
  initialPropertyAddress = '',
  initialPropertyUuid = null,
  initialNarration = '',
  initialLineItems = [],
  propertyBalance = null,
  requestedAmount = 0,
  totalPaidAlready = 0,
  processing = false,
  onContinue,
  onBack,
}: StepAmountProps) {
  void authUser
  void initialPropertyAddress
  void onBack
  void landlord

  const initialSplit = splitInitialLineItems(initialLineItems)
  const selectedProperty = userProperties?.find(p => p.uuid === (initialPropertyUuid || undefined))
  const showBalanceStrip = shouldShowPropertyBalanceStrip(propertyBalance, requestedAmount)
  const remainingBalance = Math.max(0, requestedAmount - totalPaidAlready)
  const owedAmount = getOwedRentAmount(propertyBalance, selectedProperty)
  const lockRentAmount = owedAmount > 0 && !isRentAmountEditable(propertyBalance)

  const [showBreakdown, setShowBreakdown] = useState(() => initialSplit.extras.length > 0)
  const [amount, setAmount] = useState(() =>
    getDefaultRentAmount(
      propertyBalance,
      requestedAmount,
      totalPaidAlready,
      landlord,
      initialSplit,
      selectedProperty,
    ),
  )
  const [narration, setNarration] = useState(initialNarration || '')
  const [paymentType] = useState(initialPaymentType)
  const [extraLineItems, setExtraLineItems] = useState<LineItem[]>(() => initialSplit.extras)
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false)

  useEffect(() => {
    if (lockRentAmount && owedAmount > 0) {
      setAmount(String(owedAmount))
    }
  }, [lockRentAmount, owedAmount])

  const rentAmount = Number(amount) || 0
  const extrasTotal = extraLineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const resolvedAmount = rentAmount + extrasTotal

  const openBreakdown = () => {
    setShowBreakdown(true)
    if (extraLineItems.length === 0) {
      setExtraLineItems([{ label: '', amount: 0 }])
    }
  }

  const closeBreakdown = () => {
    setExtraLineItems([])
    setShowBreakdown(false)
  }

  const addLineItem = () => {
    setExtraLineItems([...extraLineItems, { label: '', amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    const next = extraLineItems.filter((_, i) => i !== index)
    if (next.length === 0) {
      closeBreakdown()
      return
    }
    setExtraLineItems(next)
  }

  const updateLineItem = (index: number, val: string | number, field: 'label' | 'amount') => {
    const newItems = [...extraLineItems]
    if (field === 'label') {
      newItems[index].label = String(val)
    } else {
      const parsed =
        typeof val === 'string' ? parseCurrencyInput(val) : Number.isFinite(Number(val)) ? Number(val) : null
      newItems[index].amount = parsed ?? 0
    }
    setExtraLineItems(newItems)
  }

  const canProceed = resolvedAmount >= 1000

  const resolvedLineItems = [
    { label: 'Rent', amount: rentAmount },
    ...extraLineItems.filter(item => (Number(item.amount) || 0) > 0 && item.label.trim()),
  ]

  const handleContinue = () => {
    onContinue(
      resolvedAmount,
      narration,
      initialPropertyAddress,
      paymentType,
      resolvedLineItems,
      initialPropertyUuid || undefined,
    )
  }

  return (
    <div className="pay-flow__step-amount">
      {selectedProperty ? <PropertyContextCard prop={selectedProperty} /> : null}

      {showBalanceStrip && propertyBalance ? <BalanceStrip propertyBalance={propertyBalance} /> : null}

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="pay-amount">
          {lockRentAmount ? 'Rent amount' : 'Amount'}
        </label>
        <div
          className={`pay-flow__input-wrap pay-flow__input-wrap--amount${lockRentAmount ? ' pay-flow__input-wrap--readonly' : ''}`}
        >
          <span className="pay-flow__amount-currency">₦</span>
          <input
            id="pay-amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            readOnly={lockRentAmount}
            value={amount ? formatCurrencyInput(Number(amount) || 0) : ''}
            onChange={e => {
              if (lockRentAmount) return
              const parsed = parseCurrencyInput(e.target.value)
              setAmount(parsed !== null ? String(parsed) : '')
            }}
          />
        </div>
      </div>

      {!showBreakdown ? (
        <p className="pay-flow__breakdown-offer">
          Also paying for a service charge or something else?{' '}
          <button type="button" className="pay-flow__breakdown-offer-link" onClick={openBreakdown}>
            Add items
          </button>
        </p>
      ) : (
        <div className="pay-flow__breakdown-panel">
          <div className="pay-flow__breakdown-panel-head">
            <p className="pay-flow__breakdown-panel-title">Also paying for</p>
            <button type="button" className="pay-flow__icon-btn" onClick={addLineItem} aria-label="Add line item">
              <Plus size={16} />
            </button>
          </div>

          <div className="pay-flow__breakdown-list">
            {extraLineItems.map((item, idx) => (
              <div key={idx} className="pay-flow__line-item">
                <div className="pay-flow__line-item-row">
                  <input
                    list="extra-item-labels"
                    placeholder="e.g. Service Charge"
                    value={item.label}
                    onChange={e => updateLineItem(idx, e.target.value, 'label')}
                    className="pay-flow__line-item-label"
                  />
                  <span className="pay-flow__line-item-divider" />
                  <span className="pay-flow__line-item-currency">₦</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatCurrencyInput(Number(item.amount) || 0)}
                    onChange={e => updateLineItem(idx, e.target.value, 'amount')}
                    className="pay-flow__line-item-amount"
                  />
                </div>
                <button
                  type="button"
                  className="pay-flow__icon-btn pay-flow__icon-btn--danger"
                  onClick={() => removeLineItem(idx)}
                  aria-label="Remove line item"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <datalist id="extra-item-labels">
            {EXTRA_ITEM_LABELS.map(l => (
              <option key={l} value={l} />
            ))}
          </datalist>

          <button
            type="button"
            className="pay-flow__breakdown-offer-link pay-flow__breakdown-collapse"
            onClick={closeBreakdown}
          >
            Remove breakdown
          </button>
        </div>
      )}

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="pay-narration">
          Narration <span className="pay-flow__field-optional">(optional)</span>
        </label>
        <div className="pay-flow__input-wrap">
          <input
            id="pay-narration"
            type="text"
            placeholder="e.g. March rent & service charge"
            value={narration}
            onChange={e => setNarration(e.target.value)}
          />
        </div>
      </div>

      <div className="pay-flow__summary-box">
        <div className="pay-flow__summary-lines">
          <span className="pay-flow__summary-label">Summary</span>
          {showBreakdown && extrasTotal > 0 ? (
            <span className="pay-flow__summary-detail">
              Rent {formatCurrency(rentAmount)} + other charges {formatCurrency(extrasTotal)}
            </span>
          ) : null}
        </div>
        <span className="pay-flow__summary-value">{formatCurrency(resolvedAmount)}</span>
      </div>

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton
          disabled={!canProceed || processing}
          loading={processing}
          onClick={() => {
            if (requestedAmount > 0 && resolvedAmount > remainingBalance) {
              setShowOverpaymentDialog(true)
            } else {
              handleContinue()
            }
          }}
        >
          Continue
        </PayFlowPrimaryButton>
      </div>

      {showOverpaymentDialog ? (
        <div className="pay-flow__modal-overlay">
          <div className="pay-flow__modal">
            <div className="pay-flow__modal-icon">
              <Info size={28} />
            </div>
            <h3 className="pay-flow__modal-title">Confirm Overpayment</h3>
            <p className="pay-flow__modal-text">
              You are about to pay <strong>{formatCurrency(resolvedAmount)}</strong>, which is{' '}
              <strong>{formatCurrency(resolvedAmount - remainingBalance)}</strong> more than the remaining balance. Do
              you wish to proceed?
            </p>
            <div className="pay-flow__modal-actions">
              <button
                type="button"
                className="pay-flow__btn-secondary"
                onClick={() => setShowOverpaymentDialog(false)}
                disabled={processing}
              >
                No, Edit
              </button>
              <PayFlowPrimaryButton
                disabled={processing}
                loading={processing}
                onClick={() => {
                  setShowOverpaymentDialog(false)
                  handleContinue()
                }}
              >
                Yes, Proceed
              </PayFlowPrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
