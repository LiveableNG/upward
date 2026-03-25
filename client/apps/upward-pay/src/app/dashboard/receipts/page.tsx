'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ReceiptData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import ReceiptTemplate from '@/components/payment/ReceiptTemplate'

export default function ReceiptsPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/receipts')
      return
    }
    loadReceipts()
  }, [router])

  async function loadReceipts() {
    try {
      const data = await api.getMyDocuments()
      setReceipts(data.receipts)
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  if (selectedReceipt) {
    return <ReceiptTemplate receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
  }

  return (
    <div className="subpage">
      <header className="subpage__header">
        <button className="subpage__back" onClick={() => router.push('/dashboard')}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="subpage__title">Receipts</h1>
        <div style={{ width: 36 }} />
      </header>

      {loading ? (
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon">🧾</span>
          <p>No receipts yet. They&apos;ll appear here after each payment.</p>
        </div>
      ) : (
        <div className="subpage__list">
          {receipts.map((r) => (
            <button
              key={r.uuid}
              className="receipt-list-card"
              onClick={() => setSelectedReceipt(r)}
            >
              <div className="receipt-list-card__left">
                <div className="receipt-list-card__icon">🧾</div>
                <div>
                  <span className="receipt-list-card__title">{r.title}</span>
                  <span className="receipt-list-card__meta">
                    {r.receiptNumber} · {formatDate(r.paidAt)}
                  </span>
                </div>
              </div>
              <div className="receipt-list-card__right">
                <span className="receipt-list-card__amount">
                  {formatCurrency(r.amount, r.currency)}
                </span>
                <span className="receipt-list-card__arrow">→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}
