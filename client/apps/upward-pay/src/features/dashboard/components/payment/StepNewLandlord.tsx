'use client'

import React, { useState, useEffect } from 'react'
import { Check, AlertCircle, ChevronDown, Landmark } from 'lucide-react'
import { LandlordAvatar } from './LandlordAvatar'
import { BankSelectionModal } from './BankSelectionModal'
import { PayFlowPrimaryButton } from './PayPageShell'
import { type Landlord } from './types'
import { api } from '@/lib/api'

export function StepNewLandlord({
  onContinue,
  onBack,
  isVerifiedUser = false,
}: {
  onContinue: (
    data: Partial<Landlord> & {
      amount: number
      narration: string
    },
  ) => void
  onBack: () => void
  isVerifiedUser?: boolean
}) {
  void onBack
  void isVerifiedUser

  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [form, setForm] = useState({
    accountNumber: '',
    bankCode: '',
    accountName: '',
  })

  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [bankError, setBankError] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

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
    setResolved(false)
    setResolveError(null)
    set('accountName', '')

    if (form.accountNumber.length === 10 && form.bankCode) {
      const handler = setTimeout(() => {
        setResolving(true)
        api
          .resolveAccount(form.accountNumber, form.bankCode)
          .then((res) => {
            setResolved(true)
            set('accountName', res.accountName)
            setResolveError(null)
          })
          .catch((err) => {
            setResolved(false)
            setResolveError(err.message || 'Account could not be resolved')
            console.error('Resolution error:', err)
          })
          .finally(() => setResolving(false))
      }, 600)

      return () => clearTimeout(handler)
    }
  }, [form.accountNumber, form.bankCode])

  const selectedBank = banks.find((b) => b.code === form.bankCode)
  const canProceed = resolved

  const inputWrapClass = [
    'pay-flow__input-wrap',
    resolving ? 'pay-flow__input-wrap--loading' : '',
    resolveError && !resolving ? 'pay-flow__input-wrap--error' : '',
    resolved ? 'pay-flow__input-wrap--success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <p className="pay-flow__intro">
        Enter the landlord&apos;s bank account. We&apos;ll confirm the account name before you pay.
      </p>

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
            set('bankCode', bank.code)
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
            value={form.accountNumber}
            onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          {resolving && (
            <span className="pay-flow__cta-spinner" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
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

      {resolved && !resolving && (
        <div className="pay-flow__resolved">
          <LandlordAvatar letter={form.accountName?.[0] || '?'} size={36} />
          <div>
            <div className="pay-flow__resolved-name">{form.accountName}</div>
            <div className="pay-flow__resolved-bank">{selectedBank?.name}</div>
          </div>
          <span className="pay-flow__resolved-check">
            <Check size={16} />
          </span>
        </div>
      )}

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton
          disabled={!canProceed}
          onClick={() => {
            if (!canProceed) return

            onContinue({
              id: Date.now().toString(),
              name: form.accountName,
              accountName: form.accountName,
              accountNumber: form.accountNumber,
              bankName: selectedBank?.name || '',
              bankCode: form.bankCode,
              avatar: form.accountName?.[0] || '?',
              amount: 0,
              narration: '',
              lastPaid: null,
              lastAmount: 0,
              isNewLocal: true,
            } as any)
          }}
        >
          Review payment
        </PayFlowPrimaryButton>
      </div>
    </div>
  )
}
