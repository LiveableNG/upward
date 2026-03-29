'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ReceiptData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import ReceiptTemplate from '@/components/payment/ReceiptTemplate'
import { Receipt, ArrowLeft, ChevronRight } from 'lucide-react'

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

  useEffect(() => {
    if (receipts.length > 0) {
      const searchParams = new URLSearchParams(window.location.search)
      const id = searchParams.get('id')
      if (id) {
        const found = receipts.find((r) => r.uuid === id)
        if (found) setSelectedReceipt(found)
      }
    }
  }, [receipts])

  if (selectedReceipt) {
    return (
      <ReceiptTemplate 
        receipt={selectedReceipt} 
        onClose={() => {
          setSelectedReceipt(null)
          // Also clear the URL param
          const url = new URL(window.location.href)
          url.searchParams.delete('id')
          window.history.replaceState({}, '', url)
        }} 
      />
    )
  }

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Receipts</h2>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Receipts</h1>
          <p className="dashboard__desktop-subtitle">View and download your payment history</p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">

      {loading ? (
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon"><Receipt size={32} /></span>
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
                <div className="receipt-list-card__icon"><Receipt size={20} /></div>
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
                <span className="receipt-list-card__arrow"><ChevronRight size={16} /></span>
              </div>
            </button>
          ))}
        </div>
      )}
      </div>
        
      <div className="dashboard__col--right">
           <section className="dashboard__section">
            <div className="dashboard__adverts">
               <div className="dashboard__ad-card dashboard__ad-card--primary" style={{ cursor: 'default' }}>
                  <div className="dashboard__ad-badge">Tip</div>
                  <h4 className="dashboard__ad-title">Expense Tracking</h4>
                  <p className="dashboard__ad-desc">Print any receipt for your employer or business accounting.</p>
                  <div className="dashboard__ad-icon"><Receipt size={40} /></div>
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
