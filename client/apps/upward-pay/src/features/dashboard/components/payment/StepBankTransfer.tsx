'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Landmark } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
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
  const [verifyError, setVerifyError] = useState('')
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  const { data: banks = [], isLoading: loadingBanks } = useQuery<{ name: string; code: string }[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks,
  })

  const resolveBankName = (code?: string, fallback = '') => {
    if (!code) return fallback
    return banks.find(b => b.code === code)?.name || fallback
  }

  const enrichedSuggestions = suggestions.map(account => ({
    ...account,
    bankName: account.bankName || resolveBankName(account.bankCode),
  }))

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
    setVerifyError('')
    setIsVerifying(false)
  }, [bankCode, accountNumber])

  useEffect(() => {
    if (!showCustomEntry || !bankCode || accountNumber.length !== 10) return

    setIsVerifying(true)
    setVerifyError('')

    const timer = setTimeout(async () => {
      try {
        const data = await api.resolveAccount(accountNumber, bankCode)
        const name = data.accountName || data.account_name
        if (name) {
          setAccountName(name)
          setIsVerified(true)
          setVerifyError('')
        } else {
          setIsVerified(false)
          setVerifyError('Could not verify this account. Check the details and try again.')
        }
      } catch {
        setIsVerified(false)
        setVerifyError('Could not verify this account. Check the details and try again.')
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

  const displayAccount = activeAccount
    ? {
        ...activeAccount,
        bankName: activeAccount.bankName || resolveBankName(activeAccount.bankCode),
      }
    : null

  if (phase === 'proof' && displayAccount) {
    return (
      <div className="pay-flow__bank-transfer">
        <p className="pay-flow__payment-method-intro">
          Paying <strong>{formatCurrency(amount, currency)}</strong> — transfer to the account below, then upload your receipt.
        </p>

        <div className="pay-flow__transfer-account-summary">
          <p className="pay-flow__transfer-account-label">Transfer to</p>
          <p className="pay-flow__method-card-title">{displayAccount.accountName}</p>
          <p className="pay-flow__method-card-desc">
            {displayAccount.bankName ? `${displayAccount.bankName} · ` : ''}
            {displayAccount.accountNumber}
          </p>
        </div>

        <UploadProofOfPayment
          userPropertyUuid={property.uuid}
          amount={amount}
          currency={currency}
          lineItems={lineItems}
          bankName={displayAccount.bankName}
          accountName={displayAccount.accountName}
          accountNumber={displayAccount.accountNumber}
          hideAccountDetails
          onSuccess={handleProofSuccess}
          onCancel={() => setPhase('account')}
        />
      </div>
    )
  }

  return (
    <div className="pay-flow__bank-transfer">
      <p className="pay-flow__payment-method-intro">
        Paying <strong>{formatCurrency(amount, currency)}</strong> — choose where to send it.
      </p>

      {enrichedSuggestions.length > 0 && !showCustomEntry ? (
        <div className="pay-flow__transfer-account-list">
          {enrichedSuggestions.map(account => {
            const isSelected = !!(selectedAccount && accountsMatch(selectedAccount, account))
            return (
              <button
                key={account.accountNumber}
                type="button"
                className={`pay-flow__method-card pay-flow__transfer-account-card${
                  isSelected ? ' pay-flow__transfer-account-card--selected' : ''
                }`}
                onClick={() => setSelectedAccount(account)}
                aria-pressed={isSelected}
              >
                <span
                  className={`pay-flow__transfer-account-radio${
                    isSelected ? ' pay-flow__transfer-account-radio--selected' : ''
                  }`}
                  aria-hidden
                >
                  {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </span>
                <div className="pay-flow__method-card-body">
                  <p className="pay-flow__method-card-title">{account.accountName}</p>
                  <p className="pay-flow__method-card-desc">
                    {account.label}
                    {account.bankName || account.accountNumber
                      ? ` · ${[account.bankName, account.accountNumber].filter(Boolean).join(' · ')}`
                      : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}

      {!showCustomEntry ? (
        <p className="pay-flow__breakdown-offer pay-flow__transfer-enter-link">
          Paying to a different account?{' '}
          <button
            type="button"
            className="pay-flow__breakdown-offer-link"
            onClick={() => {
              setShowCustomEntry(true)
              setSelectedAccount(null)
            }}
          >
            Enter details
          </button>
        </p>
      ) : (
        <div className="pay-flow__transfer-entry">
          {enrichedSuggestions.length === 0 ? (
            <p className="pay-flow__field-hint pay-flow__transfer-entry-lead">
              Enter the bank account to transfer to. We’ll verify it before you continue.
            </p>
          ) : null}

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
              className={`pay-flow__input-wrap${isVerifying ? ' pay-flow__input-wrap--loading' : ''}${
                isVerified ? ' pay-flow__input-wrap--success' : ''
              }${verifyError ? ' pay-flow__input-wrap--error' : ''}`}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="10-digit account number"
                maxLength={10}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              />
              {isVerifying ? (
                <span
                  className="pay-flow__cta-spinner pay-flow__cta-spinner--muted"
                  aria-label="Verifying account"
                />
              ) : null}
              {isVerified && !isVerifying ? (
                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
              ) : null}
            </div>
            {isVerifying ? <p className="pay-flow__field-hint">Verifying account…</p> : null}
            {verifyError ? <p className="pay-flow__field-error">{verifyError}</p> : null}
          </div>

          {isVerified && accountName && !isVerifying ? (
            <div className="pay-flow__transfer-verified">
              <CheckCircle2 size={16} />
              <span>{accountName}</span>
            </div>
          ) : null}

          {isVerified &&
          customAccount &&
          !suggestions.some(s => accountsMatch(s, customAccount)) ? (
            <label className="pay-flow__save-account">
              <input
                type="checkbox"
                checked={saveForLater}
                onChange={e => setSaveForLater(e.target.checked)}
              />
              <span>Save this account for next time</span>
            </label>
          ) : null}

          {enrichedSuggestions.length > 0 ? (
            <button
              type="button"
              className="pay-flow__cancel-link pay-flow__transfer-switch-link"
              onClick={() => {
                setShowCustomEntry(false)
                setSelectedAccount(enrichedSuggestions[0] ?? null)
                setSaveForLater(false)
              }}
            >
              Use suggested account instead
            </button>
          ) : null}
        </div>
      )}

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton disabled={!canContinueAccount || isSaving} onClick={handleContinueToProof}>
          Continue
        </PayFlowPrimaryButton>
        <button type="button" className="pay-flow__cancel-link pay-flow__transfer-back-link" onClick={onBack}>
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
