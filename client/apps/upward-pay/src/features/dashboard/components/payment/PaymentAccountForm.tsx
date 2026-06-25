'use client'

import { useEffect, useState } from 'react'
import { Check, AlertCircle, ChevronDown, Landmark } from 'lucide-react'
import { LandlordAvatar } from './LandlordAvatar'
import { BankSelectionModal } from './BankSelectionModal'
import { api } from '@/lib/api'

export type PaymentAccountFormValue = {
  accountNumber: string
  bankCode: string
  accountName: string
  bankName: string
}

type PaymentAccountFormProps = {
  value: PaymentAccountFormValue
  onChange: (value: PaymentAccountFormValue) => void
  intro?: string
  className?: string
}

export function isPaymentAccountResolved(value: PaymentAccountFormValue): boolean {
  return (
    value.accountNumber.length === 10 &&
    !!value.bankCode &&
    !!value.accountName.trim()
  )
}

export function PaymentAccountForm({
  value,
  onChange,
  intro = "Enter the bank account rent should be paid to. We'll confirm the account name before you continue.",
  className,
}: PaymentAccountFormProps) {
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState(() => isPaymentAccountResolved(value))
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [bankError, setBankError] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  useEffect(() => {
    setLoadingBanks(true)
    api
      .getBanks()
      .then((data) => {
        if (Array.isArray(data)) {
          const uniqueBanks = Array.from(new Map(data.map((b) => [b.code, b])).values())
          setBanks(uniqueBanks)
          setBankError(false)
        } else {
          setBankError(true)
        }
      })
      .catch((err) => {
        console.error('Failed to load banks', err)
        setBankError(true)
      })
      .finally(() => setLoadingBanks(false))
  }, [])

  useEffect(() => {
    if (isPaymentAccountResolved(value)) {
      setResolved(true)
      setResolveError(null)
      return
    }

    setResolved(false)
    setResolveError(null)

    if (value.accountNumber.length === 10 && value.bankCode) {
      const handler = setTimeout(() => {
        setResolving(true)
        api
          .resolveAccount(value.accountNumber, value.bankCode)
          .then((res) => {
            const bankName = banks.find((b) => b.code === value.bankCode)?.name || value.bankName
            onChange({
              ...value,
              accountName: res.accountName,
              bankName,
            })
            setResolved(true)
            setResolveError(null)
          })
          .catch((err) => {
            setResolved(false)
            setResolveError(err.message || 'Account could not be resolved')
          })
          .finally(() => setResolving(false))
      }, 600)

      return () => clearTimeout(handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.accountNumber, value.bankCode])

  const selectedBank = banks.find((b) => b.code === value.bankCode)

  const inputWrapClass = [
    'pay-flow__input-wrap',
    resolving ? 'pay-flow__input-wrap--loading' : '',
    resolveError && !resolving ? 'pay-flow__input-wrap--error' : '',
    resolved ? 'pay-flow__input-wrap--success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const rootClass = ['payment-account-form', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      {intro ? <p className="pay-flow__intro">{intro}</p> : null}

      <div className="pay-flow__field">
        <label className="pay-flow__field-label">Bank</label>
        <div
          role="button"
          tabIndex={0}
          className={`pay-flow__select-trigger ${isBankModalOpen ? 'pay-flow__select-trigger--open' : ''}`}
          onClick={() => !loadingBanks && setIsBankModalOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && !loadingBanks && setIsBankModalOpen(true)}
        >
          <span className="pay-flow__select-trigger-icon">
            <Landmark size={20} />
          </span>
          {selectedBank ? (
            <span className="pay-flow__select-value">{selectedBank.name}</span>
          ) : (
            <span className="pay-flow__select-placeholder">
              {loadingBanks ? 'Loading banks...' : 'Select bank'}
            </span>
          )}
          <ChevronDown
            size={18}
            style={{
              color: '#a9a096',
              transform: isBankModalOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </div>

      {isBankModalOpen && (
        <BankSelectionModal
          banks={banks}
          loading={loadingBanks}
          error={bankError}
          onClose={() => setIsBankModalOpen(false)}
          onSelect={(bank) => {
            onChange({
              ...value,
              bankCode: bank.code,
              bankName: bank.name,
              accountName: '',
            })
            setIsBankModalOpen(false)
          }}
        />
      )}

      <div className="pay-flow__field">
        <label className="pay-flow__field-label">Account number</label>
        <div className={inputWrapClass}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="10-digit account number"
            maxLength={10}
            value={value.accountNumber}
            onChange={(e) =>
              onChange({
                ...value,
                accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                accountName: '',
              })
            }
          />
          {resolving && (
            <span
              className="pay-flow__cta-spinner"
              style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }}
            />
          )}
          {resolved && (
            <span style={{ color: '#22c55e' }}>
              <Check size={18} />
            </span>
          )}
          {resolveError && !resolving && (
            <span style={{ color: '#ef4444' }}>
              <AlertCircle size={18} />
            </span>
          )}
        </div>
      </div>

      {resolveError && !resolving && (
        <div className="pay-flow__alert pay-flow__alert--error">
          <AlertCircle size={18} />
          <span>{resolveError}</span>
        </div>
      )}

      {resolved && !resolving && value.accountName && (
        <div className="pay-flow__resolved">
          <LandlordAvatar letter={value.accountName[0] || '?'} size={36} />
          <div>
            <div className="pay-flow__resolved-name">{value.accountName}</div>
            <div className="pay-flow__resolved-bank">{selectedBank?.name || value.bankName}</div>
          </div>
          <span className="pay-flow__resolved-check">
            <Check size={16} />
          </span>
        </div>
      )}
    </div>
  )
}
