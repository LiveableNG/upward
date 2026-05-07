import React, { useState, useEffect } from 'react'
import { LandlordAvatar } from './LandlordAvatar'
import { type Landlord, type LineItem } from './types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Info, ChevronRight } from 'lucide-react'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 8,
}
const inputWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  background: 'var(--surface)',
  border: '1px solid var(--border-solid)',
  borderRadius: 'var(--radius-md)',
  transition: 'all 0.2s',
}
const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  padding: '14px 0',
  fontSize: 14,
  fontFamily: 'var(--font)',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBack,
}: {
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
  } | null
  requestedAmount?: number
  totalPaidAlready?: number
  onContinue: (amount: number, narration: string, propertyAddress: string, propertyName: string, lineItems?: LineItem[], propertyUuid?: string) => void
  onBack?: () => void
}) {
  const remainingBalance = Math.max(0, requestedAmount - totalPaidAlready)
  const [amount, setAmount] = useState(
    initialLineItems && initialLineItems.length > 0
        ? String(initialLineItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))
        : requestedAmount > 0 
          ? String(remainingBalance) 
          : (landlord.lastAmount > 0 ? String(landlord.lastAmount) : '')
  )
  const [narration, setNarration] = useState(initialNarration || '')
  const [propertyAddress, setPropertyAddress] = useState(initialPropertyAddress)
  const [selectedPropUuid, setSelectedPropUuid] = useState<string | null>(null)

  useEffect(() => {
    if (userProperties.length > 0 && initialPropertyUuid) {
      const prop = userProperties.find(p => p.uuid === initialPropertyUuid)
      if (prop) {
        setSelectedPropUuid(initialPropertyUuid)
      }
    }
  }, [userProperties, initialPropertyUuid])

  useEffect(() => {
    if (propertyBalance && propertyBalance.remainingBalance > 0) {
      setAmount(String(propertyBalance.remainingBalance))
      setLineItems(prev => {
        const newItems = [...prev];
        const rentItem = newItems.find(i => i.label === 'Rent');
        if (rentItem) {
          rentItem.amount = propertyBalance.remainingBalance;
        } else {
          newItems.push({ label: 'Rent', amount: propertyBalance.remainingBalance });
        }
        return newItems;
      });

    }
  }, [propertyBalance])
  const [paymentType, setPaymentType] = useState(initialPaymentType)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false)
  
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    const items = initialLineItems && initialLineItems.length > 0 ? [...initialLineItems] : [
      { 
        label: 'Rent', 
        amount: propertyBalance 
          ? (propertyBalance.remainingBalance > 0 ? propertyBalance.remainingBalance : 0)
          : (requestedAmount > 0 
             ? remainingBalance 
             : (landlord.lastAmount > 0 ? landlord.lastAmount : 0))
      },
    ]

    const feeItem = items.find(i => i.label === 'Processing Fee')
    if (!feeItem) {
      items.unshift({ label: 'Processing Fee', amount: 2000 })
    } else {
      feeItem.amount = 2000
    }

    return items
  })

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
      
      // Cap rent amount if property balance exists
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

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div
        style={{
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <LandlordAvatar
          letter={landlord.avatar}
          size={40}
          color={landlord.source === 'pm' ? '#3b82f6' : undefined}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {landlord.accountName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {landlord.bankName} · {landlord.accountNumber}
          </div>
        </div>
      </div>

      {propertyBalance && (
        <div 
          style={{ 
            padding: '24px', 
            background: 'var(--surface2)', 
            borderRadius: '24px', 
            marginBottom: 24,
            border: '1px solid var(--border-solid)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Total Rent
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {formatCurrency(propertyBalance.totalOwed, propertyBalance.currency)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Remaining
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--clay)' }}>
                {formatCurrency(propertyBalance.remainingBalance, propertyBalance.currency)}
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, 
            paddingTop: 16, borderTop: '1px solid var(--border-solid)' 
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
                Amount Paid
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(propertyBalance.amountPaid, propertyBalance.currency)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
                Next Due Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {propertyBalance.dueDate ? new Date(propertyBalance.dueDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Line Items List */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>Breakdown Payment</label>
          <button
            onClick={addLineItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'var(--clay-faint)',
              color: 'var(--clay)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--clay)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--clay-faint)'
              e.currentTarget.style.color = 'var(--clay)'
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  ...inputWrapStyle, 
                  padding: '0 12px',
                  background: 'var(--surface)',
                  border: idx === 0 ? '1px solid var(--clay-low)' : '1px solid var(--border-solid)',
                  boxShadow: idx === 0 ? '0 0 4px var(--clay-glow)' : 'none'
                }}>
                  <input
                    list="common-labels"
                    placeholder="e.g. Service Charge"
                    value={item.label}
                    onChange={(e) => updateLineItem(idx, e.target.value, 'label')}
                    style={{ 
                      ...inputStyle, 
                      padding: '14px 0', 
                      fontSize: 13, 
                      fontWeight: 600,
                      opacity: idx === 0 ? 0.7 : 1 
                    }}
                    readOnly={idx === 0 || item.label === 'Processing Fee' || item.label === 'Rent'}
                  />
                  <div
                    style={{
                      height: 20,
                      width: 1,
                      background: 'var(--border-solid)',
                      margin: '0 12px',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      marginRight: 4,
                    }}
                  >
                    ₦
                  </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.amount || ''}
                      onChange={(e) => updateLineItem(idx, e.target.value, 'amount')}
                      style={{
                        ...inputStyle,
                        padding: '14px 0',
                        fontSize: 14,
                        fontWeight: 700,
                        width: 90,
                        flex: 'none',
                        opacity: idx === 0 ? 0.7 : 1,
                      }}
                      readOnly={item.label === 'Processing Fee' || item.label === 'Rent'}
                    />
                </div>
              </div>
              {item.label !== 'Processing Fee' && (
                <button
                  onClick={() => removeLineItem(idx)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-solid)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <datalist id="common-labels">
          {COMMON_LABELS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        {/* Dynamic Total Box */}
        <div
          style={{
            marginTop: 20,
            padding: '18px 24px',
            background: 'var(--surface2)',
            borderRadius: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid var(--border-solid)',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total to Pay
            </span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--clay)' }}>
            {formatCurrency(Number(amount))}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>
          Narration <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
        </label>
        <div style={inputWrapStyle}>
          <input
            type="text"
            placeholder="e.g. March rent & service charge"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        disabled={!canProceed}
        onClick={() => {
          if (requestedAmount > 0 && Number(amount) > remainingBalance) {
            setShowOverpaymentDialog(true)
          } else {
            onContinue(Number(amount), narration, propertyAddress, paymentType, lineItems, initialPropertyUuid || undefined)
          }
        }}
        className="btn btn--primary btn--full"
        style={{ 
          opacity: canProceed ? 1 : 0.4, 
          marginBottom: 16, 
          height: 56, 
          fontSize: 15, 
          fontWeight: 700,
          borderRadius: 16
        }}
      >
        Confirm Transaction
      </button>

      {showOverpaymentDialog && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          zIndex: 1000
        }}>
          <div className="modal-card" style={{
            background: 'var(--bg)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            width: '100%',
            maxWidth: 400,
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--clay-faint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--clay)'
            }}>
              <Info size={28} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Confirm Overpayment</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              You are about to pay <strong>{formatCurrency(Number(amount))}</strong>, which is <strong>{formatCurrency(Number(amount) - remainingBalance)}</strong> more than the remaining balance. Do you wish to proceed?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn--secondary btn--full" 
                onClick={() => setShowOverpaymentDialog(false)}
                style={{ height: 48 }}
              >
                No, Edit
              </button>
              <button 
                className="btn btn--primary btn--full" 
                onClick={() => {
                  setShowOverpaymentDialog(false)
                  onContinue(Number(amount), narration, propertyAddress, paymentType, lineItems, initialPropertyUuid || undefined)
                }}
                style={{ height: 48 }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <p
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Info size={12} /> Minimum payment amount is ₦1,000
      </p>
    </div>
  )
}
