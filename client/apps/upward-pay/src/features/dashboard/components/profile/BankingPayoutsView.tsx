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
            <div className="premium-card__header premium-card__header--split">
              <div>
                <h3 className="premium-card__title">Payout Account</h3>
                <p className="premium-card__desc">Where you receive refunds and overpayment payouts.</p>
              </div>
              {!isEditing && (
                <button 
                  className="btn btn--secondary btn--sm btn--pill desktop-only" 
                  onClick={handleEditClick}
                  title="Edit Bank Details"
                >
                  <Pencil size={14} className="mr-1" /> Edit Details
                </button>
              )}
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

            <div className={isEditing ? "premium-form" : "premium-details-list"}>
              {isEditing ? (
                <>
                  <div className="premium-field">
                    <label className="premium-field__label">Select Bank</label>
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
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Account Number</label>
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
                            if (res.accountName) {
                              setBankDetails({ ...newDetails, accountName: res.accountName })
                            }
                          } catch (err) {
                            console.error('Resolution failed', err)
                          } finally {
                            setResolvingBank(false)
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Account Name</label>
                    <div className="premium-field__read-only-box">
                      {resolvingBank ? (
                        <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Resolving...</span>
                      ) : (
                        bankDetails.accountName || <span className="text-muted italic">Not Set</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="premium-details-list">
                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Bank Name</span>
                    <span className="premium-field__value--readonly">{bankDetails.bankName || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Account Number</span>
                    <span className="premium-field__value--readonly">{bankDetails.accountNumber || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Account Name</span>
                    <span className="premium-field__value--readonly">{bankDetails.accountName || <span className="text-muted italic">Not Set</span>}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {isEditing && (
            <div className="floating-action-bar animate-slide-up">
              <button className="btn btn--outline" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving || !bankDetails?.accountName}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .banking-view {
          max-width: 640px;
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
          gap: 1.5rem;
        }

        .premium-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }

        .premium-card--alert {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .premium-card__header {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .premium-card__header--split {
          justify-content: space-between;
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
          margin-bottom: 1.5rem;
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

        /* Premium Form Fields & Lists */
        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .premium-details-list {
          display: flex;
          flex-direction: column;
        }

        .premium-field--readonly {
          display: flex;
          flex-direction: column;
          padding: 1rem 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        .premium-field--readonly:last-child {
          border-bottom: none;
        }

        .premium-field__label--readonly {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .premium-field__value--readonly {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
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

        .premium-field__input {
          width: 100%;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: all 0.2s ease;
        }

        .premium-field__input:focus {
          outline: none;
          border-color: var(--clay);
          background: var(--bg);
          box-shadow: 0 0 0 4px var(--clay-glow);
        }

        .premium-field__select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 44px;
        }

        .premium-field__read-only-box {
          width: 100%;
          padding: 12px 14px;
          background: var(--surface2);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        /* Desktop & Helpers */
        .desktop-only {
          display: none !important;
        }
        @media (min-width: 1024px) {
          .desktop-only {
            display: flex !important;
          }
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

        /* Floating Action Bar */
        .floating-action-bar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          position: sticky;
          bottom: 24px;
          background: var(--bg);
          padding: 1rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          margin-top: 2rem;
          z-index: 20;
        }

        .text-muted { color: var(--text-muted); }
        .italic { font-style: italic; }
      `}</style>
    </div>
  )
}
