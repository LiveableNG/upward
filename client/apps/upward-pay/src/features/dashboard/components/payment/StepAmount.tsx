import React, { useState, useEffect } from 'react'
import { LandlordAvatar } from './LandlordAvatar'
import { PayFlowPrimaryButton } from './PayPageShell'
import { type Landlord, type LineItem } from './types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Info } from 'lucide-react'

const COMMON_LABELS = [
  'Rent',
  'Service Charge',
  'Power/Electricity',
  'Water Bill',
  'Waste Disposal',
  'Security Fee',
  'Legal & Agreement',
  'Agency Fee',
  'Caution Deposit',
]

function BalancePanel({
  propertyBalance,
}: {
  propertyBalance: NonNullable<StepAmountProps['propertyBalance']>
}) {
  return (
    <div className="pay-flow__balance">
      <div className="pay-flow__balance-top">
        <div>
          <div className="pay-flow__balance-label">Total Rent</div>
          <div className="pay-flow__balance-value">
            {formatCurrency(propertyBalance.totalOwed, propertyBalance.currency)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="pay-flow__balance-label pay-flow__balance-label--accent">Remaining</div>
          <div className="pay-flow__balance-value pay-flow__balance-value--accent">
            {formatCurrency(propertyBalance.remainingBalance, propertyBalance.currency)}
          </div>
        </div>
      </div>
      <div className="pay-flow__balance-grid">
        <div>
          <div className="pay-flow__balance-grid-label">Amount Paid</div>
          <div className="pay-flow__balance-grid-value">
            {formatCurrency(propertyBalance.amountPaid, propertyBalance.currency)}
          </div>
        </div>
        <div className="pay-flow__balance-grid-right">
          <div className="pay-flow__balance-grid-label">Next Due Date</div>
          <div className="pay-flow__balance-grid-value">
            {propertyBalance.dueDate ? new Date(propertyBalance.dueDate).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

type StepAmountProps = {
  landlord: Landlord
  userProperties?: any[]
  initialPaymentType?: string
  initialPropertyAddress?: string
  initialPropertyUuid?: string | null
  initialNarration?: string
  initialLineItems?: LineItem[]
  propertyBalance?: {
    totalOwed: number
    amountPaid: number
    remainingBalance: number
    currency: string
    hasActiveRequest: boolean
    dueDate?: string
    processingFee?: number
  } | null
  requestedAmount?: number
  totalPaidAlready?: number
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

export function StepAmount({
  landlord,
  userProperties = [],
  initialPaymentType = 'Rent Payment',
  initialPropertyAddress = '',
  initialPropertyUuid = null,
  initialNarration = '',
  initialLineItems = [],
  propertyBalance = null,
  requestedAmount = 0,
  totalPaidAlready = 0,
  onContinue,
  onBack,
}: StepAmountProps) {
  void userProperties
  void initialPaymentType
  void initialPropertyAddress
  void onBack

  const remainingBalance = Math.max(0, requestedAmount - totalPaidAlready)
  const [amount, setAmount] = useState(
    initialLineItems && initialLineItems.length > 0
      ? String(initialLineItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))
      : requestedAmount > 0
        ? String(remainingBalance)
        : landlord.lastAmount > 0
          ? String(landlord.lastAmount)
          : '',
  )
  const [narration, setNarration] = useState(initialNarration || '')
  const [paymentType] = useState(initialPaymentType)

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    const items =
      initialLineItems && initialLineItems.length > 0
        ? [...initialLineItems]
        : [
            {
              label: 'Rent',
              amount: propertyBalance
                ? propertyBalance.remainingBalance > 0
                  ? propertyBalance.remainingBalance
                  : 0
                : requestedAmount > 0
                  ? remainingBalance
                  : landlord.lastAmount > 0
                    ? landlord.lastAmount
                    : 0,
            },
          ]

    const nonFeeTotal = items.reduce(
      (sum, i) => (i.label === 'Processing Fee' ? sum : sum + (Number(i.amount) || 0)),
      0,
    )
    const feeAmount = nonFeeTotal > 0 ? (propertyBalance?.processingFee ?? 2000) : 0

    const feeItem = items.find(i => i.label === 'Processing Fee')
    if (!feeItem) {
      items.unshift({ label: 'Processing Fee', amount: feeAmount })
    } else {
      feeItem.amount = feeAmount
    }

    return items
  })

  useEffect(() => {
    if (propertyBalance && propertyBalance.remainingBalance > 0) {
      setAmount(String(propertyBalance.remainingBalance))
      setLineItems(prev => {
        const newItems = [...prev]
        const rentItem = newItems.find(i => i.label === 'Rent')
        if (rentItem) {
          rentItem.amount = propertyBalance.remainingBalance
        } else {
          newItems.push({ label: 'Rent', amount: propertyBalance.remainingBalance })
        }
        return newItems
      })
    }
  }, [propertyBalance])

  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false)

  useEffect(() => {
    const nonFeeTotal = lineItems.reduce(
      (sum, i) => (i.label === 'Processing Fee' ? sum : sum + (Number(i.amount) || 0)),
      0,
    )
    const newFee = nonFeeTotal > 0 ? (propertyBalance?.processingFee ?? 2000) : 0

    setLineItems(prev => {
      const currentFee = prev.find(i => i.label === 'Processing Fee')?.amount
      if (currentFee === newFee) return prev
      return prev.map(item => (item.label === 'Processing Fee' ? { ...item, amount: newFee } : item))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lineItems
      .filter(i => i.label !== 'Processing Fee')
      .map(i => i.amount)
      .join(','),
    propertyBalance?.processingFee,
  ])

  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    setAmount(String(total))
  }, [lineItems])

  const addLineItem = () => {
    setLineItems([...lineItems, { label: '', amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems[index]?.label === 'Processing Fee') return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, val: string | number, field: 'label' | 'amount') => {
    const newItems = [...lineItems]

    if (field === 'label') {
      if (index === 0) return
      if (newItems[index].label === 'Processing Fee' || newItems[index].label === 'Rent') return
      newItems[index].label = String(val)
    } else {
      if (newItems[index].label === 'Processing Fee' || newItems[index].label === 'Rent') return
      let numVal = Number(val)
      if (isNaN(numVal)) numVal = 0

      if ((newItems[index].label === 'Rent' || index === 0) && propertyBalance) {
        if (numVal > propertyBalance.remainingBalance) {
          numVal = propertyBalance.remainingBalance
        }
      }
      newItems[index].amount = numVal
    }

    setLineItems(newItems)
  }

  const canProceed = Number(amount) >= 1000

  const handleContinue = () => {
    onContinue(
      Number(amount),
      narration,
      initialPropertyAddress,
      paymentType,
      lineItems,
      initialPropertyUuid || undefined,
    )
  }

  return (
    <div>
      <div className="pay-flow__recipient">
        <LandlordAvatar
          letter={landlord.avatar}
          size={40}
          color={landlord.source === 'pm' ? '#3b82f6' : undefined}
        />
        <div>
          <div className="pay-flow__recipient-name">{landlord.accountName}</div>
          <div className="pay-flow__recipient-meta">
            {landlord.bankName} · {landlord.accountNumber}
          </div>
        </div>
      </div>

      {propertyBalance && <BalancePanel propertyBalance={propertyBalance} />}

      <div className="pay-flow__amount-hero">
        <div className="pay-flow__amount-hero-label">Total to Pay</div>
        <div className="pay-flow__amount-hero-value">{formatCurrency(Number(amount))}</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="pay-flow__breakdown-head">
          <p className="pay-flow__section-heading" style={{ margin: 0 }}>
            Breakdown Payment
          </p>
          <button type="button" className="pay-flow__icon-btn" onClick={addLineItem} aria-label="Add line item">
            <Plus size={18} />
          </button>
        </div>

        <div className="pay-flow__breakdown-list">
          {lineItems.map((item, idx) => (
            <div key={idx} className="pay-flow__line-item">
              <div
                className={`pay-flow__line-item-row ${idx === 0 ? 'pay-flow__line-item-row--primary' : ''}`}
              >
                <input
                  list="common-labels"
                  placeholder="e.g. Service Charge"
                  value={item.label}
                  onChange={e => updateLineItem(idx, e.target.value, 'label')}
                  className="pay-flow__line-item-label"
                  readOnly={idx === 0 || item.label === 'Processing Fee' || item.label === 'Rent'}
                />
                <span className="pay-flow__line-item-divider" />
                <span className="pay-flow__line-item-currency">₦</span>
                <input
                  type="number"
                  placeholder="0"
                  value={item.amount || ''}
                  onChange={e => updateLineItem(idx, e.target.value, 'amount')}
                  className="pay-flow__line-item-amount"
                  readOnly={item.label === 'Processing Fee' || item.label === 'Rent'}
                />
              </div>
              {item.label !== 'Processing Fee' && (
                <button
                  type="button"
                  className="pay-flow__icon-btn pay-flow__icon-btn--danger"
                  onClick={() => removeLineItem(idx)}
                  aria-label="Remove line item"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <datalist id="common-labels">
          {COMMON_LABELS.map(l => (
            <option key={l} value={l} />
          ))}
        </datalist>

        <div className="pay-flow__total-box">
          <span className="pay-flow__total-label">Total to Pay</span>
          <span className="pay-flow__total-value">{formatCurrency(Number(amount))}</span>
        </div>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label">
          Narration <span style={{ fontWeight: 400, color: '#a9a096' }}>(optional)</span>
        </label>
        <div className="pay-flow__input-wrap">
          <input
            type="text"
            placeholder="e.g. March rent & service charge"
            value={narration}
            onChange={e => setNarration(e.target.value)}
          />
        </div>
      </div>

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton
          disabled={!canProceed}
          onClick={() => {
            if (requestedAmount > 0 && Number(amount) > remainingBalance) {
              setShowOverpaymentDialog(true)
            } else {
              handleContinue()
            }
          }}
        >
          Confirm Transaction
        </PayFlowPrimaryButton>
      </div>

      <p className="pay-flow__footnote">
        <Info size={12} /> Minimum payment amount is ₦1,000
      </p>

      {showOverpaymentDialog && (
        <div className="pay-flow__modal-overlay">
          <div className="pay-flow__modal">
            <div className="pay-flow__modal-icon">
              <Info size={28} />
            </div>
            <h3 className="pay-flow__modal-title">Confirm Overpayment</h3>
            <p className="pay-flow__modal-text">
              You are about to pay <strong>{formatCurrency(Number(amount))}</strong>, which is{' '}
              <strong>{formatCurrency(Number(amount) - remainingBalance)}</strong> more than the remaining balance. Do
              you wish to proceed?
            </p>
            <div className="pay-flow__modal-actions">
              <button type="button" className="pay-flow__btn-secondary" onClick={() => setShowOverpaymentDialog(false)}>
                No, Edit
              </button>
              <PayFlowPrimaryButton
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
      )}
    </div>
  )
}
