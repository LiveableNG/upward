'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  User,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PayPageShell } from '../payment/PayPageShell'
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
      aria-label="Save bank details"
    >
      {saving ? <Loader2 size={15} className="animate-spin" /> : 'Save'}
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
      hideNav
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
            <button
              type="button"
              className="pay-flow__cta banking-refund-card__cta"
              onClick={handleEditClick}
            >
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
        </div>

        <div className="banking-notice">
          <ShieldCheck size={20} className="banking-notice__icon" />
          <div>
            <p className="banking-notice__title">Secure Refund Protection</p>
            <p className="banking-notice__text">
              This account is used exclusively to deposit rent overpayments, deposit returns, and
              transaction refunds. We will never debit funds from this account.
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="banking-form">
            <div className="personal-field">
              <label htmlFor="bankCode">Select Bank</label>
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
                <option value="">Choose your bank...</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="personal-field">
              <label htmlFor="accountNumber">10-Digit Account Number</label>
              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 0123456789"
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
              <label>Account Name Verification</label>
              <div
                className={`banking-resolved-name${
                  bankDetails.accountName ? ' banking-resolved-name--verified' : ''
                }`}
              >
                {resolvingBank ? (
                  <span className="banking-resolved-name__loading">
                    <Loader2 size={14} className="banking-resolved-name__spin" />
                    Verifying account with bank…
                  </span>
                ) : bankDetails.accountName ? (
                  <span className="banking-resolved-name__success">
                    <CheckCircle2 size={16} />
                    <span>{bankDetails.accountName}</span>
                  </span>
                ) : (
                  <span className="banking-resolved-name__placeholder">
                    Enter bank and 10-digit account number to verify
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : hasPayoutAccount ? (
          <div className="banking-card-preview">
            <div className="banking-card-preview__top">
              <div className="banking-card-preview__bank">
                <div className="banking-card-preview__icon">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="banking-card-preview__bank-name">{bankDetails.bankName}</h3>
                  <span className="banking-card-preview__tag">Primary Payout Destination</span>
                </div>
              </div>
              <span className="banking-card-preview__badge">
                <CheckCircle2 size={13} />
                <span>Verified</span>
              </span>
            </div>

            <div className="banking-card-preview__middle">
              <span className="banking-card-preview__num-label">Account Number</span>
              <span className="banking-card-preview__number">
                {maskAccountNumber(bankDetails.accountNumber)}
              </span>
            </div>

            <div className="banking-card-preview__bottom">
              <div>
                <span className="banking-card-preview__name-label">Account Name</span>
                <span className="banking-card-preview__name-value">{bankDetails.accountName}</span>
              </div>
              <button
                type="button"
                className="banking-card-preview__change-btn"
                onClick={handleEditClick}
              >
                <Pencil size={13} />
                <span>Change Account</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="banking-empty">
            <div className="banking-empty__icon">
              <Landmark size={26} />
            </div>
            <h3 className="banking-empty__title">No payout account linked</h3>
            <p className="banking-empty__text">
              Link your Nigerian bank account to receive rent overpayments, deposit refunds, and
              cashbacks safely and automatically.
            </p>
            <button
              type="button"
              className="pay-flow__cta banking-empty__cta"
              onClick={handleEditClick}
            >
              <Plus size={16} />
              <span>Link Payout Account</span>
            </button>
          </div>
        )}
      </section>
    </PayPageShell>
  )
}
