'use client'

import { formatCurrency } from '@/lib/utils'

export default function PaymentSuccess({
  amount,
  currency = 'NGN',
  invoiceNumber,
  companyName,
  isLoggedIn,
  onSignUp,
  onGoToDashboard,
}: {
  amount: number
  currency?: string
  invoiceNumber: string
  companyName: string
  isLoggedIn: boolean
  onSignUp: () => void
  onGoToDashboard: () => void
}) {
  return (
    <div className="payment-success">
      <div className="payment-success__confetti">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ['#d97757', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'][
                Math.floor(Math.random() * 5)
              ],
            }}
          />
        ))}
      </div>

      <div className="payment-success__badge">
        <div className="payment-success__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <h1 className="payment-success__title">Payment Verified</h1>
      <p className="payment-success__subtitle">
        Your payment of {formatCurrency(amount, currency)} to {companyName} was successful.
      </p>

      <div className="payment-success__receipt">
        <div className="payment-success__receipt-row">
          <span>Receipt No.</span>
          <span>{invoiceNumber}</span>
        </div>
        <div className="payment-success__receipt-row">
          <span>Amount</span>
          <span className="payment-success__receipt-amount">
            {formatCurrency(amount, currency)}
          </span>
        </div>
        <div className="payment-success__receipt-row">
          <span>Status</span>
          <span className="payment-success__receipt-status">Confirmed ✓</span>
        </div>
      </div>

      {/* Download receipt button — always available */}
      <button
        className="btn btn--secondary btn--full btn--sm"
        onClick={() => window.print()}
        style={{ marginTop: 12 }}
      >
        📥 Download Receipt as PDF
      </button>

      {!isLoggedIn ? (
        <div className="payment-success__cta-section">
          <h3 className="payment-success__cta-title">Don&apos;t lose your receipt</h3>
          <p className="payment-success__cta-subtitle">
            Create an account to save your payment history, build rent credit, and never miss a
            payment.
          </p>
          <button className="btn btn--primary btn--full" onClick={onSignUp}>
            Create Your Account
          </button>
          <p className="payment-success__cta-note">Takes less than 30 seconds</p>
        </div>
      ) : (
        <div className="payment-success__cta-section">
          <button className="btn btn--primary btn--full" onClick={onGoToDashboard}>
            Go to Dashboard
          </button>
          <button
            className="btn btn--secondary btn--full btn--sm"
            onClick={onGoToDashboard}
            style={{ marginTop: 8 }}
          >
            🧾 View All Receipts
          </button>
        </div>
      )}
    </div>
  )
}
