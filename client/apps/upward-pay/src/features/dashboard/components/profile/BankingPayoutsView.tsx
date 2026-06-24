'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Building2, CreditCard, Loader2, Pencil, User } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton, PayPageShell } from '../payment/PayPageShell'
import { formatCurrency } from '@/lib/utils'

interface BankingPayoutsViewProps {
  onBack: () => void
  initialEditing?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BankDetails = {
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
}

const emptyBankDetails = (): BankDetails => ({
  bankCode: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
})

function maskAccountNumber(value?: string) {
  if (!value) return ''
  if (value.length <= 4) return value
  return `•••• ${value.slice(-4)}`
}

function BankingPayoutsSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <PayPageShell title="Banking & Payouts" showBack onBack={onBack}>
      <section className="personal-card banking-page--skeleton">
        <div className="personal-card__header">
          <div className="personal-card__header-main">
            <div className="banking-page__skeleton-circle" />
            <div style={{ flex: 1 }}>
              <div className="banking-page__skeleton-line banking-page__skeleton-line--title" />
              <div className="banking-page__skeleton-line banking-page__skeleton-line--desc" />
            </div>
          </div>
        </div>
        <div className="banking-page__skeleton-banner" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="banking-page__skeleton-row">
            <div className="banking-page__skeleton-line banking-page__skeleton-line--label" />
            <div className="banking-page__skeleton-line banking-page__skeleton-line--value" />
          </div>
        ))}
      </section>
    </PayPageShell>
  )
}

export function BankingPayoutsView({ onBack, initialEditing = false }: BankingPayoutsViewProps) {
  const { success, error: toastError } = useToast()

  const [isEditing, setIsEditing] = useState(initialEditing)
  const [saving, setSaving] = useState(false)
  const [resolvingBank, setResolvingBank] = useState(false)

  const [bankDetails, setBankDetails] = useState<BankDetails>(emptyBankDetails())
  const [savedBankDetails, setSavedBankDetails] = useState<BankDetails>(emptyBankDetails())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [banks, setBanks] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const hasPayoutAccount = !!(
    bankDetails.bankName &&
    bankDetails.accountNumber &&
    bankDetails.accountName
  )

  useEffect(() => {
    if (initialEditing) setIsEditing(true)
  }, [initialEditing])

  useEffect(() => {
    async function loadData() {
      try {
        const [bdData, paymentsData] = await Promise.all([
          api.getBankDetails().catch(() => null),
          api.getPendingPayments().catch(() => []),
        ])

        if (bdData) {
          setBankDetails(bdData)
          setSavedBankDetails(bdData)
        }
        setPendingRefunds(paymentsData.filter((p: { type?: string }) => p.type === 'refund_alert'))
      } catch (err) {
        console.error('Failed to load banking data', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function loadBanks() {
    if (banks.length > 0) return
    try {
      const data = await api.getBanks()
      setBanks(data)
    } catch (err) {
      console.error('Failed to load banks', err)
    }
  }

  const resolveAccountName = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.length !== 10 || !bankCode) return
    setResolvingBank(true)
    try {
      const res = await api.resolveAccount(accountNumber, bankCode)
      if (res.accountName) {
        setBankDetails((prev) => ({ ...prev, accountName: res.accountName }))
      }
    } catch (err) {
      console.error('Resolution failed', err)
    } finally {
      setResolvingBank(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveBankDetails(bankDetails)
      setSavedBankDetails(bankDetails)
      setIsEditing(false)
      success('Bank details updated')
    } catch {
      toastError('Failed to save bank details')
    } finally {
      setSaving(false)
    }
  }

  const handleEditClick = () => {
    loadBanks()
    setIsEditing(true)
  }

  const handleCancel = () => {
    setBankDetails(savedBankDetails)
    setIsEditing(false)
  }

  const headerAction = isEditing ? (
    <button
      type="button"
      className="pay-flow__header-action pay-flow__header-action--primary"
      onClick={handleSave}
      disabled={saving || !bankDetails.accountName}
    >
      {saving ? '...' : 'Save'}
    </button>
  ) : (
    <button
      type="button"
      className="pay-flow__header-action pay-flow__header-action--icon"
      onClick={handleEditClick}
      aria-label="Edit bank details"
    >
      <Pencil size={16} />
    </button>
  )

  if (loading) {
    return <BankingPayoutsSkeleton onBack={onBack} />
  }

  return (
    <PayPageShell
      title={isEditing ? 'Edit payout account' : 'Banking & Payouts'}
      subtitle={isEditing ? undefined : 'Refunds and overpayments are sent here.'}
      showBack
      onBack={isEditing ? handleCancel : onBack}
      rightElement={headerAction}
    >
      {pendingRefunds.length > 0 ? (
        <section className="banking-refund-card">
          <div className="banking-refund-card__head">
            <div className="banking-refund-card__icon">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="banking-refund-card__title">Refund action required</h2>
              <p className="banking-refund-card__desc">
                {pendingRefunds.length} pending refund{pendingRefunds.length > 1 ? 's' : ''} need a
                payout account.
              </p>
            </div>
          </div>
          <div className="banking-refund-list">
            {pendingRefunds.map((refund, index) => (
              <div key={refund.reference || index} className="banking-refund-item">
                <div className="banking-refund-item__top">
                  <span className="banking-refund-item__amount">
                    {formatCurrency(refund.amount, refund.currency)}
                  </span>
                  {refund.reference ? (
                    <span className="banking-refund-item__ref">{refund.reference}</span>
                  ) : null}
                </div>
                {refund.property_address ? (
                  <p className="banking-refund-item__address">{refund.property_address}</p>
                ) : null}
              </div>
            ))}
          </div>
          {!hasPayoutAccount && !isEditing ? (
            <button type="button" className="pay-flow__cta banking-refund-card__cta" onClick={handleEditClick}>
              Add payout account
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="personal-card">
        <div className="personal-card__header">
          <div className="personal-card__header-main">
            <div className="personal-card__icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="personal-card__title">Payout account</h2>
              <p className="personal-card__desc">
                Where you receive refunds and overpayment payouts.
              </p>
            </div>
          </div>
          {!isEditing ? (
            <button type="button" className="personal-card__edit-btn" onClick={handleEditClick}>
              <Pencil size={14} />
              {hasPayoutAccount ? 'Edit details' : 'Add account'}
            </button>
          ) : null}
        </div>

        <div className="banking-notice">
          <AlertCircle size={18} className="banking-notice__icon" />
          <div>
            <p className="banking-notice__title">Why we need this</p>
            <p className="banking-notice__text">
              These details are used for automated refunds. If a payment cannot be applied, funds
              are returned to this account.
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="banking-form">
            <div className="personal-field">
              <label htmlFor="bankCode">Bank</label>
              <select
                id="bankCode"
                value={bankDetails.bankCode || ''}
                onChange={(e) => {
                  const bankCode = e.target.value
                  const bank = banks.find((b) => b.code === bankCode)
                  const next = {
                    ...bankDetails,
                    bankCode,
                    bankName: bank?.name || '',
                    accountName: '',
                  }
                  setBankDetails(next)
                  if (next.accountNumber.length === 10) {
                    void resolveAccountName(next.accountNumber, bankCode)
                  }
                }}
              >
                <option value="">Select a bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="personal-field">
              <label htmlFor="accountNumber">Account number</label>
              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digits"
                value={bankDetails.accountNumber || ''}
                onChange={(e) => {
                  const accountNumber = e.target.value.replace(/\D/g, '').slice(0, 10)
                  const next = { ...bankDetails, accountNumber, accountName: '' }
                  setBankDetails(next)
                  if (accountNumber.length === 10 && bankDetails.bankCode) {
                    void resolveAccountName(accountNumber, bankDetails.bankCode)
                  }
                }}
              />
            </div>

            <div className="personal-field">
              <label>Account name</label>
              <div className="banking-resolved-name">
                {resolvingBank ? (
                  <span className="banking-resolved-name__loading">
                    <Loader2 size={14} className="banking-resolved-name__spin" />
                    Resolving account name…
                  </span>
                ) : bankDetails.accountName ? (
                  bankDetails.accountName
                ) : (
                  <span className="personal-readonly-value--muted">Enter bank and account number</span>
                )}
              </div>
            </div>
          </div>
        ) : hasPayoutAccount ? (
          <div className="banking-account-card">
            <div className="banking-account-card__row">
              <span className="banking-account-card__icon-wrap">
                <Building2 size={16} />
              </span>
              <div>
                <span className="banking-account-card__label">Bank</span>
                <span className="banking-account-card__value">{bankDetails.bankName}</span>
              </div>
            </div>
            <div className="banking-account-card__row">
              <span className="banking-account-card__icon-wrap">
                <CreditCard size={16} />
              </span>
              <div>
                <span className="banking-account-card__label">Account number</span>
                <span className="banking-account-card__value">
                  {maskAccountNumber(bankDetails.accountNumber)}
                </span>
              </div>
            </div>
            <div className="banking-account-card__row">
              <span className="banking-account-card__icon-wrap">
                <User size={16} />
              </span>
              <div>
                <span className="banking-account-card__label">Account name</span>
                <span className="banking-account-card__value">{bankDetails.accountName}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="banking-empty">
            <div className="banking-empty__icon">
              <CreditCard size={24} />
            </div>
            <h3 className="banking-empty__title">No payout account yet</h3>
            <p className="banking-empty__text">
              Add your bank details so refunds and overpayments can be sent back to you.
            </p>
            <button type="button" className="pay-flow__cta" onClick={handleEditClick}>
              Add payout account
            </button>
          </div>
        )}
      </section>

      {isEditing ? (
        <div className="personal-sticky-actions">
          <button
            type="button"
            className="personal-sticky-actions__cancel"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <PayFlowPrimaryButton
            onClick={handleSave}
            disabled={saving || !bankDetails.accountName}
            loading={saving}
          >
            Save changes
          </PayFlowPrimaryButton>
        </div>
      ) : null}
    </PayPageShell>
  )
}
