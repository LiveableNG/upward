'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Copy,
  Check,
  Building,
  ShieldCheck,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Info,
  CreditCard,
  Download,
  Loader2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'
import '@/styles/deposit-balance.css'

export default function RentDepositBalancePage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [downloadingUuid, setDownloadingUuid] = useState<string | null>(null)

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['rent-deposit-summary'],
    queryFn: () => api.getRentDepositSummary(),
    staleTime: 1000 * 30, // 30s
  })

  const handleCopyAccount = (accountNumber: string) => {
    if (!accountNumber) return
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadReceipt = async (uuid: string, reference: string) => {
    if (!uuid) return
    try {
      setDownloadingUuid(uuid)
      const res = await api.getRentDepositReceipt(uuid)
      const url = res?.url || res?.data?.url
      const fileName = res?.fileName || res?.data?.fileName || `deposit_receipt_${reference || uuid.slice(0, 8)}.pdf`

      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Failed to download deposit receipt:', err)
    } finally {
      setDownloadingUuid(null)
    }
  }

  if (isLoading) {
    return <FallbackSuspense message="Loading rent deposit balance..." />
  }

  if (error || !summary) {
    return (
      <div className="deposit-balance-page">
        <div className="deposit-balance__header">
          <button className="deposit-balance__back-btn" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
        <div className="pay-page__error">
          <Info size={32} />
          <h2>Could not load balance</h2>
          <p>We couldn't retrieve your rent deposit summary right now. Please try again.</p>
          <button className="btn btn--secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { availableBalance, currency, property, history } = summary
  const hasDva = !!property?.dva?.accountNumber

  return (
    <div className="deposit-balance-page">
      {/* Top Navigation & Title */}
      <div className="deposit-balance__header">
        <button
          type="button"
          className="deposit-balance__back-btn"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="deposit-balance__title-group">
          <h1 className="deposit-balance__title">Rent Deposit Balance</h1>
          <p className="deposit-balance__subtitle">
            Advance deposits and excess funds applied automatically to upcoming rent
          </p>
        </div>
      </div>

      {/* Grid: Balance Hero & DVA Card */}
      <div className="deposit-balance__grid">
        {/* Left: Glowing Hero Card */}
        <div className="deposit-hero-card">
          <div className="deposit-hero-card__top">
            <span className="deposit-hero-card__label">Available Deposit</span>
            <div className="deposit-hero-card__badge">
              <span className="deposit-hero-card__badge-dot" />
              {availableBalance > 0 ? 'Active & Ready' : 'Available'}
            </div>
          </div>

          <div>
            <div className="deposit-hero-card__amount">
              {formatCurrency(availableBalance, currency || 'NGN')}
            </div>
            <p className="deposit-hero-card__desc">
              Your balance is held securely and can be applied anytime during checkout to clear or
              reduce active rent requests.
            </p>
          </div>
        </div>

        {/* Right: Dedicated Virtual Account Top-Up Card */}
        <div className="deposit-dva-card">
          <div className="deposit-dva-card__header">
            <div className="deposit-dva-card__icon">
              <Building size={22} />
            </div>
            <div>
              <h3 className="deposit-dva-card__title">Direct Rent Top-Up</h3>
              <p className="deposit-dva-card__subtitle">
                Transfer anytime to deposit rent ahead of your next invoice.
              </p>
            </div>
          </div>

          {hasDva ? (
            <div className="deposit-dva-card__details">
              <div className="deposit-dva-card__row">
                <span className="deposit-dva-card__row-label">Bank Name</span>
                <span className="deposit-dva-card__row-val">{property.dva.bankName}</span>
              </div>

              <div className="deposit-dva-card__row">
                <span className="deposit-dva-card__row-label">Account Name</span>
                <span className="deposit-dva-card__row-val">{property.dva.accountName}</span>
              </div>

              <div className="deposit-dva-card__row" style={{ paddingTop: '4px' }}>
                <span className="deposit-dva-card__row-label">Account Number</span>
                <div className="deposit-dva-card__row-val">
                  <span className="deposit-dva-card__account-number">
                    {property.dva.accountNumber}
                  </span>
                  <button
                    type="button"
                    className="deposit-dva-card__copy-btn"
                    onClick={() => handleCopyAccount(property.dva.accountNumber)}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="deposit-dva-card__details">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Your dedicated virtual account is being prepared. In the meantime, you can top up
                during standard rent checkout.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How It Works Explainer */}
      <div className="deposit-explainer">
        <h3 className="deposit-explainer__title">
          <Sparkles size={18} style={{ color: 'var(--clay)' }} />
          How Rent Deposit Balance Works
        </h3>

        <div className="deposit-explainer__steps">
          <div className="deposit-step">
            <div className="deposit-step__number">1</div>
            <h4 className="deposit-step__heading">Transfer Anytime</h4>
            <p className="deposit-step__body">
              Send any amount to your Dedicated Virtual Account or pay above your invoice total.
            </p>
          </div>

          <div className="deposit-step">
            <div className="deposit-step__number">2</div>
            <h4 className="deposit-step__heading">Held Safely in Balance</h4>
            <p className="deposit-step__body">
              All hanging or excess funds are instantly stored in your verified Rent Deposit Balance.
            </p>
          </div>

          <div className="deposit-step">
            <div className="deposit-step__number">3</div>
            <h4 className="deposit-step__heading">Apply During Rent Checkout</h4>
            <p className="deposit-step__body">
              When a rent invoice is issued, you decide how much of your balance to apply towards your
              bill or specific line items during payment checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Deposit Activity & Drawdown Timeline */}
      <div className="deposit-history">
        <div className="deposit-history__header">
          <h3 className="deposit-history__title">Deposit Activity & History</h3>
        </div>

        {(!history || history.length === 0) ? (
          <div className="deposit-history__empty">
            <CreditCard size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>No deposit transactions yet.</p>
            <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
              Transfers to your dedicated virtual account will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="deposit-history__list">
            {history.map((item: any) => {
              const isCredit = item.status === 'AVAILABLE' || item.type === 'CREDIT'
              return (
                <div key={item.uuid || item.id} className="deposit-history__item">
                  <div className="deposit-history__item-left">
                    <div
                      className={`deposit-history__icon-box ${
                        isCredit
                          ? 'deposit-history__icon-box--credit'
                          : 'deposit-history__icon-box--used'
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="deposit-history__details">
                      <span className="deposit-history__name">
                        {item.narration || item.sourceLabel}
                      </span>
                      <span className="deposit-history__meta">
                        {formatDate(item.createdAt)} • Ref: {item.reference || item.uuid.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="deposit-history__item-right">
                    <span
                      className={`deposit-history__amount ${
                        isCredit
                          ? 'deposit-history__amount--credit'
                          : 'deposit-history__amount--used'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(item.amount, item.currency)}
                    </span>
                    <div className="deposit-history__actions">
                      <span
                        className={`deposit-history__status ${
                          isCredit
                            ? 'deposit-history__status--available'
                            : 'deposit-history__status--used'
                        }`}
                      >
                        {item.status}
                      </span>
                      <button
                        type="button"
                        className="deposit-history__receipt-btn"
                        onClick={() => handleDownloadReceipt(item.uuid, item.reference)}
                        disabled={downloadingUuid === item.uuid}
                        title="Download Deposit Receipt"
                      >
                        {downloadingUuid === item.uuid ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
