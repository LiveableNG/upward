'use client'

import React from 'react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import {
  Download,
  ArrowLeft,
  Share2,
} from 'lucide-react'

export interface ReceiptData {
  uuid: string
  title: string
  receiptNumber: string
  paidAt: string
  generatedAt: string
  tenantName: string
  companyName: string
  companyLogo?: string
  themeColor?: string
  paymentType: string
  propertyAddress: string
  amount: number
  currency: string
  channel: string
  paystackReference: string
  type?: 'credit' | 'debit'
  status?: string
  lineItems: Array<{ label: string; amount: number; category?: string }>
  tenancyPeriod?: string
  isPartial?: boolean
  rentAmount?: number
  totalInvoiceAmount?: number
  totalPaidToDate?: number
  remainingBalance?: number
}

function formatMoney(amount: number | undefined | null, currency = 'NGN'): string {
  const val = amount ?? 0
  return `${currency} ${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatHeroDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const day = d.getDate()
    const month = d.toLocaleDateString('en-GB', { month: 'short' })
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${dayName}, ${day} ${month} ${year} · ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

function parseHex(hex: string) {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) {
    return { r: 182, g: 91, b: 55 }
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function getThemeStyles(themeColor?: string): React.CSSProperties {
  if (!themeColor || themeColor.toLowerCase() === '#b65b37') {
    return {
      '--clay': '#B65B37',
      '--clay-deep': '#8C4327',
      '--clay-tint': '#F3E4DC',
      '--stripe': '#F5F2ED',
    } as React.CSSProperties
  }
  const { r, g, b } = parseHex(themeColor)
  const deepR = Math.max(0, Math.round(r * 0.76))
  const deepG = Math.max(0, Math.round(g * 0.76))
  const deepB = Math.max(0, Math.round(b * 0.76))

  return {
    '--clay': themeColor,
    '--clay-deep': `rgb(${deepR}, ${deepG}, ${deepB})`,
    '--clay-tint': `rgba(${r}, ${g}, ${b}, 0.14)`,
    '--stripe': `rgba(${r}, ${g}, ${b}, 0.045)`,
  } as React.CSSProperties
}

export default function ReceiptTemplate({
  receipt,
  onClose,
  onDownload,
  onShare,
}: {
  receipt: ReceiptData
  onClose?: () => void
  onDownload?: () => void
  onShare?: () => void
}) {
  const isPartial =
    receipt.isPartial ??
    (receipt.remainingBalance !== undefined
      ? receipt.remainingBalance > 0
      : receipt.status === 'PARTIAL')

  const totalRent = receipt.rentAmount ?? receipt.totalInvoiceAmount ?? receipt.amount
  const totalPaid = receipt.totalPaidToDate ?? receipt.amount
  const balanceRemaining =
    receipt.remainingBalance !== undefined
      ? Math.max(0, receipt.remainingBalance)
      : Math.max(0, (receipt.totalInvoiceAmount ?? totalRent) - totalPaid)

  const breakdownItems =
    receipt.lineItems && receipt.lineItems.length > 0
      ? [...receipt.lineItems].sort((a, b) => {
          const aIsRent = (a.label || '').toLowerCase().includes('rent')
          const bIsRent = (b.label || '').toLowerCase().includes('rent')
          if (aIsRent && !bIsRent) return -1
          if (!aIsRent && bIsRent) return 1
          return 0
        })
      : [
          {
            label: receipt.paymentType || 'Rent',
            amount: receipt.amount,
          },
        ]

  const themeStyles = getThemeStyles(receipt.themeColor)

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
      />

      <div className="receipt-overlay">
        <div className="receipt-wrapper">
          {/* Top Actions Bar (No Print) */}
          <div className="receipt-actions no-print">
            <button
              type="button"
              className="receipt-action-btn"
              onClick={onClose}
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="receipt-actions__right">
              {onShare && (
                <button
                  type="button"
                  className="receipt-action-btn"
                  onClick={() => onShare?.()}
                >
                  <Share2 size={14} style={{ marginRight: 6 }} />
                  <span>Share</span>
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  className="receipt-action-btn receipt-action-btn--primary"
                  onClick={() => onDownload?.()}
                >
                  <Download size={14} style={{ marginRight: 6 }} />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>

          {/* Printable Card Area */}
          <div id="receipt-printable" className="receipt" style={themeStyles}>
            {/* Hero Section */}
            <div className="hero">
              <div className="brand">
                {receipt.companyLogo ? (
                  <img
                    src={receipt.companyLogo}
                    alt={receipt.companyName || 'Brand'}
                    className="brand-logo"
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="brand-svg">
                    <path d="M12 3L21 20H3L12 3Z" fill="#FBF3EE" />
                  </svg>
                )}
                <span>{receipt.companyName || 'Upward'}</span>
              </div>

              <div className="hero-label">Amount received</div>
              <div className="hero-amount">
                {formatMoney(receipt.amount, receipt.currency)}
              </div>

              <div className="hero-foot">
                <span className="status-pill">
                  {isPartial ? 'Partial payment' : 'Paid in full'}
                </span>
                <span className="hero-time">
                  {formatHeroDate(receipt.paidAt)}
                </span>
              </div>
            </div>

            {/* Scallop Tear Divider */}
            <div className="scallop" />

            {/* Floating 2x2 Stats Card */}
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Total rent</div>
                <div className="stat-value">
                  {formatMoney(totalRent, receipt.currency)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Paid so far</div>
                <div className="stat-value">
                  {formatMoney(totalPaid, receipt.currency)}
                </div>
              </div>
              <div className="stat highlight">
                <div className="stat-label">This payment</div>
                <div className="stat-value">
                  {formatMoney(receipt.amount, receipt.currency)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Balance remaining</div>
                <div className="stat-value">
                  {formatMoney(balanceRemaining, receipt.currency)}
                </div>
              </div>
            </div>

            {/* Payment Breakdown Section */}
            <section className="receipt-section">
              <div className="section-title">Payment breakdown</div>
              <div className="table-wrapper">
                <table>
                  <tbody>
                    {breakdownItems.map((item, index) => (
                      <tr key={index}>
                        <td>{item.label}</td>
                        <td>{formatMoney(item.amount, receipt.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>This payment</td>
                      <td>{formatMoney(receipt.amount, receipt.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Details Section */}
            <section className="receipt-section">
              <div className="section-title">Details</div>
              <div className="details-grid">
                <div className="full">
                  <div className="detail-label">Property</div>
                  <div className="detail-value">
                    {receipt.propertyAddress || 'Address not specified'}
                  </div>
                </div>

                {receipt.tenancyPeriod && (
                  <div>
                    <div className="detail-label">Rental period</div>
                    <div className="detail-value">{receipt.tenancyPeriod}</div>
                  </div>
                )}

                <div className={receipt.tenancyPeriod ? '' : 'full'}>
                  <div className="detail-label">Receipt no.</div>
                  <div className="detail-value">{receipt.receiptNumber}</div>
                </div>

                <div>
                  <div className="detail-label">Tenant</div>
                  <div className="detail-value">{receipt.tenantName}</div>
                </div>

                <div>
                  <div className="detail-label">Recipient / Landlord</div>
                  <div className="detail-value">
                    {receipt.companyName || 'Landlord'}
                  </div>
                </div>

                <div>
                  <div className="detail-label">Payment channel</div>
                  <div className="detail-value">
                    {receipt.channel || 'Paystack'}
                  </div>
                </div>

                <div className="full">
                  <div className="detail-label">Reference</div>
                  <div className="detail-value mono">
                    {receipt.paystackReference}
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="receipt-footer">
              <div className="foot-note">
                This receipt confirms a payment made through
                <br />
                the Upward platform.
              </div>
              <div className="foot-mark">
                <UpwardLogo size={12} color="var(--ink-faint)" />
                <span>UPWARD</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(:root) {
          --paper: #FBF9F6;
          --ink: #211C18;
          --ink-muted: #8F857A;
          --ink-faint: #C7BEB2;
          --clay: #B65B37;
          --clay-deep: #8C4327;
          --clay-tint: #F3E4DC;
          --line: #E7E1D8;
          --stripe: #F5F2ED;
          --shadow: rgba(33, 28, 24, 0.10);
        }

        .receipt-overlay {
          background: #EDEAE5;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--ink);
          display: flex;
          justify-content: center;
          padding: 48px 16px;
        }

        .receipt-wrapper {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .receipt-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 16px;
        }

        .receipt-actions__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .receipt-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--ink);
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px var(--shadow);
        }

        .receipt-action-btn:hover {
          background: #f0ebe4;
        }

        .receipt-action-btn:active {
          transform: scale(0.97);
        }

        .receipt-action-btn--primary {
          background: var(--clay);
          color: #fff;
          border-color: var(--clay);
        }

        .receipt-action-btn--primary:hover {
          background: var(--clay-deep);
          border-color: var(--clay-deep);
        }

        .receipt {
          width: 100%;
          background: var(--paper);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 60px -20px var(--shadow), 0 2px 8px var(--shadow);
        }

        .hero {
          padding: 36px 32px 44px;
          background: linear-gradient(155deg, var(--clay) 0%, var(--clay-deep) 100%);
          color: #FBF3EE;
          position: relative;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          opacity: 0.92;
          margin-bottom: 28px;
        }

        .brand-logo {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .brand-svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .hero-label {
          font-size: 13px;
          color: rgba(251, 243, 238, 0.72);
          margin-bottom: 6px;
        }

        .hero-amount {
          font-family: 'Fraunces', serif;
          font-size: 42px;
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.01em;
          color: #FBF3EE;
          word-break: break-word;
        }

        .hero-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 22px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(251, 243, 238, 0.16);
          border: 1px solid rgba(251, 243, 238, 0.3);
          font-size: 13px;
          font-weight: 500;
          color: #FBF3EE;
        }

        .hero-time {
          font-size: 13px;
          color: rgba(251, 243, 238, 0.72);
        }

        .scallop {
          height: 14px;
          background:
            radial-gradient(circle at 10px 0, transparent 10px, var(--clay-deep) 10.5px) top left,
            var(--paper);
          background-size: 20px 20px;
          background-repeat: repeat-x;
          margin-top: -14px;
          position: relative;
          z-index: 2;
        }

        .scallop::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 14px;
          background: radial-gradient(circle at 10px 14px, var(--paper) 10px, transparent 10.5px);
          background-size: 20px 20px;
          background-repeat: repeat-x;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--line);
          margin: 0 32px;
          border-radius: 14px;
          overflow: hidden;
          transform: translateY(-18px);
          box-shadow: 0 8px 20px -10px var(--shadow);
          position: relative;
          z-index: 3;
        }

        .stat {
          background: var(--paper);
          padding: 16px 18px;
        }

        .stat.highlight {
          background: var(--clay-tint);
        }

        .stat-label {
          font-size: 11.5px;
          color: var(--ink-muted);
          margin-bottom: 5px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }

        .stat.highlight .stat-value {
          color: var(--clay-deep);
        }

        .receipt-section {
          padding: 24px 32px 0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--ink);
        }

        .table-wrapper {
          width: 100%;
          max-height: 280px;
          overflow-y: auto;
          border-radius: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        tbody tr:nth-child(odd) {
          background: var(--stripe);
        }

        td {
          padding: 10px 12px;
          vertical-align: middle;
        }

        td:first-child {
          border-radius: 8px 0 0 8px;
          color: var(--ink);
          word-break: break-word;
        }

        td:last-child {
          border-radius: 0 8px 8px 0;
          text-align: right;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        tfoot td {
          padding: 14px 12px 6px;
          border-top: 1px solid var(--line);
          font-weight: 600;
          font-size: 14.5px;
        }

        tfoot td:last-child {
          text-align: right;
          color: var(--clay-deep);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 20px;
        }

        .details-grid .full {
          grid-column: 1 / -1;
        }

        .detail-label {
          font-size: 11.5px;
          color: var(--ink-muted);
          margin-bottom: 3px;
        }

        .detail-value {
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.4;
          color: var(--ink);
          word-break: break-word;
        }

        .detail-value.mono {
          font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          word-break: break-all;
        }

        .receipt-footer {
          margin-top: 28px;
          padding: 20px 32px 28px;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .foot-note {
          font-size: 11.5px;
          color: var(--ink-faint);
          line-height: 1.5;
        }

        .foot-mark {
          font-size: 11px;
          color: var(--ink-faint);
          font-weight: 600;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        @media (max-width: 480px) {
          .receipt-overlay {
            padding: 24px 12px;
          }
          .hero {
            padding: 28px 20px 36px;
          }
          .hero-amount {
            font-size: 34px;
          }
          .stats {
            margin: 0 16px;
          }
          .stat {
            padding: 12px 14px;
          }
          .stat-value {
            font-size: 14px;
          }
          .receipt-section {
            padding: 20px 20px 0;
          }
          .receipt-footer {
            padding: 16px 20px 24px;
          }
        }

        @media print {
          body,
          .receipt-overlay {
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          .table-wrapper {
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </>
  )
}
