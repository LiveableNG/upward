'use client'

import React from 'react'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface SettledStepProps {
  amountPaid: number
  currency: string
  companyName: string
  description: string
  onDashboard: () => void
  onOnboarding: () => void
  isLoggedIn: boolean
  hasAccount: boolean
}

export function SettledStep({
  amountPaid,
  currency,
  companyName,
  description,
  onDashboard,
  onOnboarding,
  isLoggedIn,
  hasAccount
}: SettledStepProps) {
  const showOnboarding = !hasAccount

  return (
    <div className="pay-settled-view">
      <div className="pay-settled-card">
        <div className="pay-settled-header">
          <UpwardLogo size={32} />
          <div className="pay-settled-badge">
            <CheckCircle2 size={14} />
            Fully Paid
          </div>
        </div>

        <div className="pay-settled-hero">
          <h1 className="pay-settled-title">
            {showOnboarding ? 'Payment Confirmed' : 'Payment Settled'}
          </h1>
          <p className="pay-settled-sub">
            {showOnboarding
              ? 'Your payment is secure. Create a password to access your receipt and track future payments.'
              : 'This invoice has been cleared in full. No further balance is due at this time.'}
          </p>
        </div>

        <div className="pay-settled-amount-box">
          <span className="label">Amount Paid</span>
          <span className="value">
            {formatCurrency(amountPaid, currency)}
          </span>
        </div>

        <div className="pay-settled-details">
          <div className="row">
            <span>Recipient</span>
            <span>{companyName}</span>
          </div>
          <div className="row">
            <span>Description</span>
            <span>{description}</span>
          </div>
        </div>

        <div className="pay-settled-actions">
          {showOnboarding ? (
            <button className="btn primary clay" onClick={onOnboarding}>
              Secure My Account <ChevronRight size={18} />
            </button>
          ) : (
            <button className="btn primary" onClick={onDashboard}>
              {isLoggedIn ? 'Go to Dashboard' : 'Login to View Activity'}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .pay-settled-view {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(circle at 100% 0%, var(--clay-faint), transparent 400px),
            var(--bg);
        }

        .pay-settled-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg);
          border-radius: 40px;
          padding: 40px;
          border: 1px solid var(--border-solid);
          box-shadow: var(--shadow-lg);
          text-align: center;
          animation: slideUp 0.5s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pay-settled-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .pay-settled-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          background: var(--success-bg);
          color: var(--success);
          border: 1px solid var(--border);
        }

        .pay-settled-title {
          font-size: 30px;
          font-weight: 900;
          color: var(--text);
          margin-bottom: 10px;
        }

        .pay-settled-sub {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 320px;
          margin: 0 auto 32px;
        }

        .pay-settled-amount-box {
          background: var(--surface);
          border-radius: 24px;
          padding: 28px;
          margin-bottom: 28px;
          border: 1px solid var(--border-solid);
        }

        .label {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .value {
          font-size: 34px;
          font-weight: 900;
          color: var(--text);
        }

        .pay-settled-details {
          margin-bottom: 32px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
        }

        .row span:first-child {
          color: var(--text-muted);
        }

        .row span:last-child {
          color: var(--text);
          font-weight: 600;
          text-align: right;
        }

        .pay-settled-actions {
          margin-bottom: 24px;
        }

        .btn {
          width: 100%;
          height: 60px;
          border-radius: 999px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          border: none;
          transition: 0.2s;
        }

        .btn.primary {
          background: var(--text);
          color: var(--bg);
        }

        .btn.primary:hover {
          opacity: 0.9;
        }

        .btn.primary.clay {
          background: var(--clay);
          color: white;
          box-shadow: var(--shadow-clay);
        }

        .footer {
          font-size: 12px;
          color: var(--text-muted);
        }

        .footer a {
          color: var(--clay);
          font-weight: 600;
        }

        @media (max-width: 520px) {
          .pay-settled-card {
            padding: 28px 20px;
          }

          .pay-settled-title {
            font-size: 26px;
          }

          .value {
            font-size: 30px;
          }
        }
      `}</style>
    </div>
  )
}