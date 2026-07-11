'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, Landmark, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { addManualAccount } from '@/features/payments/services/paymentService'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton } from './PayPageShell'
import { BankSelectionModal } from './BankSelectionModal'
import { UploadProofOfPayment } from '@/features/payments/components/unified-pay/UploadProofOfPayment'
import { type LineItem } from './types'
import {
  accountsMatch,
  getSuggestedTransferAccounts,
  type TransferBankAccount,
} from './propertyBankAccount'

type StepBankTransferProps = {
  property: any
  amount: number
  lineItems?: LineItem[]
  currency?: string
  onBack: () => void
  onSuccess: () => void
}

export function StepBankTransfer({
  property,
  amount,
  lineItems = [],
  currency = 'NGN',
  onBack,
  onSuccess,
}: StepBankTransferProps) {
  const toast = useToast()
  const suggestions = getSuggestedTransferAccounts(property)

  const [phase, setPhase] = useState<'account' | 'proof'>('account')
  const [selectedAccount, setSelectedAccount] = useState<TransferBankAccount | null>(
    () => suggestions[0] ?? null,
  )
  const [showCustomEntry, setShowCustomEntry] = useState(suggestions.length === 0)
  const [saveForLater, setSaveForLater] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  const { data: banks = [], isLoading: loadingBanks } = useQuery<{ name: string; code: string }[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks,
  })

  const customAccount: TransferBankAccount | null =
    accountNumber.length === 10 && accountName
      ? {
          accountNumber,
          accountName,
          bankName,
          bankCode,
          label: 'Entered account',
        }
      : null

  const activeAccount = showCustomEntry ? customAccount : selectedAccount

  useEffect(() => {
    setIsVerified(false)
    setAccountName('')
  }, [bankCode, accountNumber])

  useEffect(() => {
    if (!showCustomEntry || !bankCode || accountNumber.length !== 10) return
    const timer = setTimeout(async () => {
      setIsVerifying(true)
      try {
        const data = await api.resolveAccount(accountNumber, bankCode)
        const name = data.accountName || data.account_name
        if (name) {
          setAccountName(name)
          setIsVerified(true)
        }
      } catch {
        setIsVerified(false)
      } finally {
        setIsVerifying(false)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [showCustomEntry, bankCode, accountNumber])

  const canContinueAccount = !!activeAccount?.accountNumber && !!activeAccount?.accountName

  const handleContinueToProof = () => {
    if (!activeAccount) return
    setSelectedAccount(activeAccount)
    setPhase('proof')
  }

  const handleProofSuccess = async () => {
    const shouldSave =
      saveForLater &&
      showCustomEntry &&
      customAccount &&
      property?.id &&
      !suggestions.some(s => accountsMatch(s, customAccount))

    if (shouldSave) {
      setIsSaving(true)
      try {
        await addManualAccount({
          propertyId: property.id,
          accountNumber: customAccount.accountNumber,
          accountName: customAccount.accountName,
          bankName: customAccount.bankName || bankName,
          bankCode: customAccount.bankCode || bankCode,
        })
        toast.success('Account saved for next time', 'Saved')
      } catch (err: any) {
        toast.error(err.message || 'Could not save account', 'Save failed')
      } finally {
        setIsSaving(false)
      }
    }
    onSuccess()
  }

  if (phase === 'proof' && activeAccount) {
    return (
      <div className="pay-flow__bank-transfer">
        <div className="pay-flow__transfer-account-summary">
          <p className="pay-flow__transfer-account-label">Transfer to</p>
          <p className="pay-flow__transfer-account-name">{activeAccount.accountName}</p>
          <p className="pay-flow__transfer-account-meta">
            {activeAccount.bankName ? `${activeAccount.bankName} · ` : ''}
            {activeAccount.accountNumber}
          </p>
        </div>

        <UploadProofOfPayment
          userPropertyUuid={property.uuid}
          amount={amount}
          currency={currency}
          lineItems={lineItems}
          bankName={activeAccount.bankName}
          accountName={activeAccount.accountName}
          accountNumber={activeAccount.accountNumber}
          onSuccess={handleProofSuccess}
          onCancel={() => setPhase('account')}
        />
      </div>
    )
  }

  return (
    <div className="pay-flow__bank-transfer">
      {suggestions.length > 0 && !showCustomEntry ? (
        <div className="pay-flow__section">
          <p className="pay-flow__section-label">Suggested accounts</p>
          <div className="pay-flow__transfer-account-list">
            {suggestions.map(account => (
              <button
                key={account.accountNumber}
                type="button"
                className={`pay-flow__transfer-account-card${
                  selectedAccount && accountsMatch(selectedAccount, account)
                    ? ' pay-flow__transfer-account-card--selected'
                    : ''
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="pay-flow__transfer-account-card-body">
                  <p className="pay-flow__transfer-account-card-label">{account.label}</p>
                  <p className="pay-flow__transfer-account-card-name">{account.accountName}</p>
                  <p className="pay-flow__transfer-account-card-meta">
                    {account.bankName ? `${account.bankName} · ` : ''}
                    {account.accountNumber}
                  </p>
                </div>
                <ChevronRight size={18} className="pay-flow__card-trailing" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!showCustomEntry ? (
        <button
          type="button"
          className="pay-flow__breakdown-offer-link pay-flow__transfer-enter-link"
          onClick={() => {
            setShowCustomEntry(true)
            setSelectedAccount(null)
          }}
        >
          <Plus size={14} /> Enter a different account
        </button>
      ) : (
        <div className="pay-flow__breakdown-panel">
          <p className="pay-flow__breakdown-panel-title">Enter account details</p>

          <div className="pay-flow__field">
            <label className="pay-flow__field-label">Bank</label>
            <div
              role="button"
              tabIndex={0}
              className="pay-flow__select-trigger"
              onClick={() => !loadingBanks && setIsBankModalOpen(true)}
              onKeyDown={e => e.key === 'Enter' && !loadingBanks && setIsBankModalOpen(true)}
            >
              <span className="pay-flow__select-trigger-icon">
                <Landmark size={18} />
              </span>
              {bankName ? (
                <span className="pay-flow__select-value">{bankName}</span>
              ) : (
                <span className="pay-flow__select-placeholder">
                  {loadingBanks ? 'Loading banks...' : 'Select bank'}
                </span>
              )}
            </div>
          </div>

          <div className="pay-flow__field">
            <label className="pay-flow__field-label">Account number</label>
            <div
              className={`pay-flow__input-wrap${isVerifying ? ' pay-flow__input-wrap--loading' : ''}${isVerified ? ' pay-flow__input-wrap--success' : ''}`}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="10-digit account number"
                maxLength={10}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              />
              {isVerified ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : null}
            </div>
          </div>

          {isVerified && accountName ? (
            <div className="pay-flow__transfer-verified">
              <CheckCircle2 size={16} />
              <span>{accountName}</span>
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <button
              type="button"
              className="pay-flow__breakdown-offer-link pay-flow__breakdown-collapse"
              onClick={() => {
                setShowCustomEntry(false)
                setSelectedAccount(suggestions[0] ?? null)
                setSaveForLater(false)
              }}
            >
              Use suggested account instead
            </button>
          ) : null}
        </div>
      )}

      {showCustomEntry && isVerified && customAccount && !suggestions.some(s => accountsMatch(s, customAccount)) ? (
        <label className="pay-flow__save-account">
          <input
            type="checkbox"
            checked={saveForLater}
            onChange={e => setSaveForLater(e.target.checked)}
          />
          <span>Save this account for next time</span>
        </label>
      ) : null}

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton disabled={!canContinueAccount || isSaving} onClick={handleContinueToProof}>
          I&apos;ve paid — submit proof
        </PayFlowPrimaryButton>
        <button type="button" className="pay-flow__breakdown-offer-link pay-flow__transfer-back-link" onClick={onBack}>
          Choose a different payment method
        </button>
      </div>

      {isBankModalOpen ? (
        <BankSelectionModal
          banks={banks}
          loading={loadingBanks}
          error={false}
          onClose={() => setIsBankModalOpen(false)}
          onSelect={bank => {
            setBankCode(bank.code)
            setBankName(bank.name)
            setIsBankModalOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
