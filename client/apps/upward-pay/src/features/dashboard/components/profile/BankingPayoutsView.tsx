'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Building, CreditCard, User, Loader2, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PageHeader } from '@/components/common/PageHeader'
import { formatCurrency } from '@/lib/utils'

interface BankingPayoutsViewProps {
  onBack: () => void
}

export function BankingPayoutsView({ onBack }: BankingPayoutsViewProps) {
  const { success, error: toastError } = useToast()
  
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resolvingBank, setResolvingBank] = useState(false)
  
  const [bankDetails, setBankDetails] = useState<any>({
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  })
  const [banks, setBanks] = useState<any[]>([])
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [bdData, paymentsData] = await Promise.all([
          api.getBankDetails().catch(() => null),
          api.getPendingPayments().catch(() => [])
        ])
        
        if (bdData) setBankDetails(bdData)
        setPendingRefunds(paymentsData.filter((p: any) => p.type === 'refund_alert'))
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

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveBankDetails(bankDetails)
      setIsEditing(false)
      success('Bank details updated')
    } catch (err) {
      toastError('Failed to save bank details')
    } finally {
      setSaving(false)
    }
  }

  const handleEditClick = () => {
    loadBanks()
    setIsEditing(true)
  }

  if (loading) {
    return (
      <div className="banking-view dashboard--nav-offset">
        <PageHeader
          title="Banking & Payouts"
          showBack
          backLabel="Profile"
          onBack={onBack}
        />
        <div className="flex flex-col justify-center items-center h-[60vh]">
          <Loader2 className="animate-spin text-clay" size={32} />
          <p className="text-muted text-sm mt-4 animate-pulse">Loading banking details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="banking-view dashboard--nav-offset">
      <PageHeader
        title="Banking & Payouts"
        showBack
        backLabel="Profile"
        onBack={onBack}
        rightElement={
          isEditing ? (
            <button 
              className="btn btn--primary btn--sm btn--pill" 
              onClick={handleSave}
              disabled={saving || !bankDetails?.accountName}
            >
              {saving ? '...' : 'Save'}
            </button>
          ) : (
            <button 
              className="dashboard__icon-btn" 
              onClick={handleEditClick}
            >
              <Pencil size={18} />
            </button>
          )
        }
      />

      <div className="banking-content">
        <div className="banking-sections">
          
          {pendingRefunds.length > 0 && (
            <section className="premium-card premium-card--alert animate-slide-up">
              <div className="premium-card__header">
                <div className="premium-card__icon-wrap bg-red-100 text-red-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="premium-card__title text-red-600">Refund Action Required</h3>
                  <p className="premium-card__desc text-red-500/80">You have {pendingRefunds.length} pending refund(s).</p>
                </div>
              </div>
              <div className="refunds-list">
                {pendingRefunds.map((r, i) => (
                  <div key={i} className="refund-item">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-700">{formatCurrency(r.amount, r.currency)}</span>
                      <span className="text-xs opacity-70 text-red-600">{r.reference}</span>
                    </div>
                    <p className="text-xs mt-1 text-red-600/80">{r.property_address}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="premium-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="premium-card__header">
              <div>
                <h3 className="premium-card__title">Payout Account</h3>
                <p className="premium-card__desc">Where you receive refunds and overpayment payouts.</p>
              </div>
            </div>

            <div className="notice-banner">
              <div className="notice-banner__icon">
                <AlertCircle size={20} />
              </div>
              <div className="notice-banner__content">
                <h4 className="notice-banner__title">Why do we need this?</h4>
                <p className="notice-banner__text">
                  These details are strictly used for <strong>automated refunds</strong>. If you accidentally underpay 
                  or violate a "Full Payment Only" requirement, the system will instantly send your money back to this account.
                </p>
              </div>
            </div>

            <div className="premium-form">
              <div className="premium-field">
                <label className="premium-field__label">Select Bank</label>
                <div className="premium-field__input-wrap">
                  <Building className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <select
                      className="premium-field__input premium-field__select"
                      value={bankDetails.bankCode || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        const bank = banks.find(b => b.code === v)
                        setBankDetails({ ...bankDetails, bankCode: v, bankName: bank?.name || '' })
                      }}
                    >
                      <option value="">Select a bank</option>
                      {banks.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="premium-field__read-only">
                      {bankDetails.bankName || <span className="text-muted italic">Not Set</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Account Number</label>
                <div className="premium-field__input-wrap">
                  <CreditCard className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <input
                      type="text"
                      className="premium-field__input"
                      placeholder="10 digits"
                      value={bankDetails.accountNumber || ''}
                      onChange={async (e) => {
                        const v = e.target.value
                        const newDetails = { ...bankDetails, accountNumber: v }
                        setBankDetails(newDetails)
                        
                        if (v.length === 10 && bankDetails.bankCode) {
                          setResolvingBank(true)
                          try {
                            const res = await api.resolveAccount(v, bankDetails.bankCode)
                            if (res.account_name) {
                              setBankDetails({ ...newDetails, accountName: res.account_name })
                            }
                          } catch (err) {
                            console.error('Resolution failed', err)
                          } finally {
                            setResolvingBank(false)
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="premium-field__read-only">
                      {bankDetails.accountNumber || <span className="text-muted italic">Not Set</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Account Name</label>
                <div className="premium-field__input-wrap">
                  <User className="premium-field__icon" size={18} />
                  <div className="premium-field__read-only premium-field__read-only--highlight">
                    {resolvingBank ? (
                      <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Resolving...</span>
                    ) : (
                      bankDetails.accountName || <span className="text-muted italic">Not Set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <style jsx>{`
        .banking-view {
          max-width: 860px;
          margin: 0 auto;
          padding-top: 1rem;
        }

        @media (min-width: 1024px) {
          .banking-view {
            padding-top: 2rem;
          }
        }

        .banking-content {
          padding: 1rem 1rem 10rem;
        }

        @media (min-width: 768px) {
          .banking-content {
            padding: 2rem 1.5rem 10rem;
          }
        }

        .banking-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .premium-card {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .premium-card--alert {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .premium-card__header {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 2rem;
        }

        .premium-card__icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .premium-card__title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 4px;
        }

        .premium-card__desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Notice Banner */
        .notice-banner {
          display: flex;
          gap: 1rem;
          background: var(--clay-faint);
          padding: 1.25rem;
          border-radius: 16px;
          border: 1px solid rgba(var(--clay-rgb), 0.1);
          margin-bottom: 2rem;
        }

        .notice-banner__icon {
          color: var(--clay);
          flex-shrink: 0;
        }

        .notice-banner__title {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--clay);
          margin: 0 0 6px;
        }

        .notice-banner__text {
          font-size: 0.8rem;
          line-height: 1.5;
          color: var(--text-secondary);
          margin: 0;
        }

        /* Premium Form Fields */
        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .premium-field__label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-left: 4px;
        }

        .premium-field__input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .premium-field__icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .premium-field__input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: var(--bg);
          border: 1.5px solid var(--border-solid);
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-field__input:focus {
          outline: none;
          border-color: var(--clay);
          box-shadow: 0 0 0 4px var(--clay-glow);
          background: var(--surface);
        }

        .premium-field__select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 44px;
        }

        .premium-field__read-only {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: transparent;
          border: 1.5px solid transparent;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        .premium-field__read-only--highlight {
          background: var(--surface2);
          border-radius: 16px;
        }

        /* Refunds Mini List */
        .refunds-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .refund-item {
          background: rgba(255, 255, 255, 0.6);
          padding: 1rem;
          border-radius: 14px;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        :global(.theme--dark) .refund-item {
          background: rgba(0, 0, 0, 0.2);
        }

        .text-muted { color: var(--text-muted); }
        .italic { font-style: italic; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  )
}
