'use client'

import { Check, Download, ReceiptText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PaymentSuccess({
  amount,
  currency = 'NGN',
  invoiceNumber,
  companyName,
  isLoggedIn,
  onLogin,
  onGoToDashboard,
}: {
  amount: number
  currency?: string
  invoiceNumber: string
  companyName: string
  isLoggedIn: boolean
  onLogin: () => void
  onGoToDashboard: () => void
}) {
  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; padding: 40px; margin: 0; background: #fff; line-height: 1.5; }
            .receipt { border: 1px solid #eaeaea; border-radius: 12px; padding: 40px; max-width: 500px; margin: 0 auto; text-align: center; }
            .check-icon { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #dcfce7; color: #16a34a; border-radius: 50%; margin-bottom: 24px; }
            h1 { font-size: 24px; margin: 0 0 12px; color: #111; }
            p { color: #666; margin: 0 0 32px; font-size: 15px; }
            .details { text-align: left; background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #eaeaea; }
            .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eaeaea; font-size: 14px; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; font-weight: 500; }
            .val { font-weight: 600; color: #111; }
            .val-amount { font-size: 16px; color: #d97757; }
            .val-status { color: #16a34a; display: flex; align-items: center; gap: 4px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="check-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h1>Payment Verified</h1>
            <p>Your payment to ${companyName} was successful.</p>
            <div class="details">
              <div class="row">
                <span class="label">Receipt No.</span>
                <span class="val">${invoiceNumber}</span>
              </div>
              <div class="row">
                <span class="label">Amount</span>
                <span class="val val-amount">${formatCurrency(amount, currency)}</span>
              </div>
              <div class="row">
                <span class="label">Status</span>
                <span class="val val-status">Confirmed <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              </div>
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          </script>
        </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="ps-layout">
      {/* ── Confetti ── */}
      <div className="payment-success__confetti">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ['#d97757', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)],
            }}
          />
        ))}
      </div>

      {/* ── LEFT / MAIN panel ── */}
      <div className="ps-main">
        <div className="ps-main__inner">

          {/* Badge */}
          <div className="ps-badge">
            <Check size={28} strokeWidth={2.5} />
          </div>

          <h1 className="ps-title">Payment Verified</h1>
          <p className="ps-subtitle">
            Your payment of <strong>{formatCurrency(amount, currency)}</strong> to <strong>{companyName}</strong> was successful.
          </p>

          {/* Receipt card */}
          <div className="ps-receipt">
            <div className="ps-receipt__row">
              <span className="ps-receipt__label">Receipt No.</span>
              <span className="ps-receipt__value">{invoiceNumber}</span>
            </div>
            <div className="ps-receipt__row">
              <span className="ps-receipt__label">Amount</span>
              <span className="ps-receipt__value ps-receipt__value--amount">{formatCurrency(amount, currency)}</span>
            </div>
            <div className="ps-receipt__row ps-receipt__row--last">
              <span className="ps-receipt__label">Status</span>
              <span className="ps-receipt__value ps-receipt__value--status">
                <Check size={12} strokeWidth={2.5} />
                Confirmed
              </span>
            </div>
          </div>

          {/* Download */}
          <button className="btn btn--secondary btn--full btn--sm ps-download-btn" onClick={handlePrint}>
            <Download size={14} />
            Download Receipt as PDF
          </button>

          {/* CTA */}
          {!isLoggedIn ? (
            <div className="ps-cta">
              <h3 className="ps-cta__title">Access your receipt anytime</h3>
              <p className="ps-cta__text">
                Log in to save your payment history, build rent credit, and manage your tenancy documents in one place.
              </p>
              <button className="btn btn--primary btn--full" onClick={onLogin}>
                Log In to Your Account
              </button>
              <p className="ps-cta__note">Securely view your payment history</p>
            </div>
          ) : (
            <div className="ps-cta">
              <button className="btn btn--primary btn--full" onClick={onGoToDashboard}>
                Go to Dashboard
              </button>
              <button className="btn btn--secondary btn--full btn--sm" onClick={onGoToDashboard} style={{ marginTop: 8 }}>
                <ReceiptText size={14} />
                View All Receipts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT panel (desktop only) ── */}
      <div className="ps-side">
        <div className="dashboard__adverts">
          <div className="dashboard__ad-card dashboard__ad-card--primary" style={{ cursor: 'default' }}>
            <div className="dashboard__ad-badge">Info</div>
            <h4 className="dashboard__ad-title">Download Receipt</h4>
            <p className="dashboard__ad-desc">You can safely download a PDF copy of your verified payment receipt for your records.</p>
            <div className="dashboard__ad-icon"><Download size={40} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}