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
    receipt.status === 'PARTIAL' ||
    Boolean(receipt.isPartial) ||
    (receipt.remainingBalance !== undefined && receipt.remainingBalance > 0)

  const isInvoiceTotalDifferentFromRent =
    receipt.totalInvoiceAmount !== undefined &&
    receipt.rentAmount !== undefined &&
    receipt.totalInvoiceAmount !== receipt.rentAmount
  const statCardLabel =
    (receipt.lineItems && receipt.lineItems.length > 1) || isInvoiceTotalDifferentFromRent
      ? 'Total due'
      : 'Total due'
  const statCardAmount = isInvoiceTotalDifferentFromRent
    ? (receipt.totalInvoiceAmount ?? receipt.amount)
    : (receipt.rentAmount ?? receipt.totalInvoiceAmount ?? receipt.amount)

  const totalRent = statCardAmount
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
              <header className="receipt-header no-print">
                <button
                  type="button"
                  className="receipt-back-btn"
                  onClick={onClose}
                  aria-label="Go back"
                >
                  <ArrowLeft size={18} />
                </button>
                <h1 className="receipt-header__title">Payment Receipt</h1>
                <div className="receipt-header__actions">
                  {onShare && (
                    <button
                      type="button"
                      className="receipt-pill-btn"
                      onClick={() => onShare?.()}
                      aria-label="Share receipt"
                      title="Share receipt"
                    >
                      <Share2 size={15} />
                      <span className="receipt-pill-btn__label">Share</span>
                    </button>
                  )}
                  {onDownload && (
                    <button
                      type="button"
                      className="receipt-pill-btn receipt-pill-btn--primary"
                      onClick={() => onDownload?.()}
                      aria-label="Download receipt PDF"
                      title="Download receipt PDF"
                    >
                      <Download size={15} />
                      <span className="receipt-pill-btn__label">Download</span>
                    </button>
                  )}
                  {!onShare && !onDownload && <div className="receipt-header__spacer" />}
                </div>
              </header>

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
                    ) : (receipt.companyName || 'Upward').toUpperCase() === 'UPWARD' ? (
                      <UpwardLogo size={22} color="#FBF3EE" className="brand-svg" />
                    ) : null}
                    <span className="brand-name">{receipt.companyName || 'Upward'}</span>
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

                {/* 2x2 Inset Summary Stats */}
                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">{statCardLabel}</div>
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
          --paper: #FFFFFF;
          --ink: #211C18;
          --ink-muted: #7A7268;
          --ink-faint: #B8B0A5;
          --clay: #B65B37;
          --clay-deep: #8C4327;
          --clay-tint: #F3E4DC;
          --line: #ECE5DC;
          --stripe: #FAF8F5;
          --shadow: rgba(33, 28, 24, 0.08);
        }

        .receipt-overlay {
          background: var(--shell-page-bg, #FAF9F5);
          min-height: 100vh;
          min-height: 100dvh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--ink);
          display: flex;
          justify-content: center;
          padding: max(16px, env(safe-area-inset-top, 16px)) 16px max(40px, env(safe-area-inset-bottom, 24px));
        }

        .receipt-wrapper {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .receipt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 16px;
          min-height: 40px;
          position: relative;
          gap: 12px;
        }

        .receipt-back-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #ECE5DC;
          color: var(--ink);
          cursor: pointer;
          transition: transform 0.1s ease, background 0.15s ease;
          box-shadow: 0 1px 3px rgba(33, 28, 24, 0.04);
          flex-shrink: 0;
          -webkit-appearance: none;
          appearance: none;
        }

        .receipt-back-btn:active {
          transform: scale(0.94);
          background: #F3EFEA;
        }

        .receipt-header__title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin: 0;
          text-align: center;
          flex: 1;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .receipt-header__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .receipt-pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #FFFFFF;
          border: 1px solid #ECE5DC;
          color: var(--ink);
          padding: 8px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.1s ease, background 0.15s ease;
          box-shadow: 0 1px 3px rgba(33, 28, 24, 0.04);
          -webkit-appearance: none;
          appearance: none;
          white-space: nowrap;
        }

        .receipt-pill-btn:active {
          transform: scale(0.96);
          background: #F3EFEA;
        }

        .receipt-pill-btn--primary {
          background: var(--clay);
          color: #FFFFFF;
          border-color: var(--clay);
          box-shadow: 0 2px 8px rgba(182, 91, 55, 0.25);
        }

        .receipt-pill-btn--primary:active {
          background: var(--clay-deep);
          border-color: var(--clay-deep);
        }

        .receipt-header__spacer {
          width: 40px;
        }

        .receipt {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid #ECE5DC;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 10px 30px -10px rgba(33, 28, 24, 0.08), 0 2px 6px -1px rgba(33, 28, 24, 0.03);
        }

        .hero {
          padding: 30px 24px 32px;
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
          opacity: 0.95;
          margin-bottom: 24px;
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

        .brand-name {
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .hero-label {
          font-size: 12.5px;
          color: rgba(251, 243, 238, 0.76);
          margin-bottom: 6px;
          font-weight: 500;
        }

        .hero-amount {
          font-family: 'Fraunces', serif;
          font-size: clamp(32px, 7.5vw, 40px);
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: #FFFFFF;
          word-break: break-word;
        }

        .hero-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.28);
          font-size: 12.5px;
          font-weight: 500;
          color: #FFFFFF;
          backdrop-filter: blur(4px);
        }

        .hero-time {
          font-size: 12.5px;
          color: rgba(251, 243, 238, 0.76);
          font-variant-numeric: tabular-nums;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: #ECE5DC;
          margin: 20px 24px 0;
          border: 1px solid #ECE5DC;
          border-radius: 14px;
          overflow: hidden;
        }

        .stat {
          background: #FAF8F5;
          padding: 14px 16px;
        }

        .stat.highlight {
          background: var(--clay-tint, rgba(182, 91, 55, 0.08));
        }

        .stat-label {
          font-size: 11.5px;
          color: var(--ink-muted);
          margin-bottom: 4px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }

        .stat.highlight .stat-value {
          color: var(--clay-deep);
        }

        .receipt-section {
          padding: 22px 24px 0;
        }

        .section-title {
          font-size: 13.5px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--ink);
        }

        .table-wrapper {
          width: 100%;
          border-radius: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        td {
          padding: 10px 0;
          vertical-align: middle;
          border-bottom: 1px solid #F3EFEA;
        }

        td:first-child {
          color: var(--ink);
          word-break: break-word;
        }

        td:last-child {
          text-align: right;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        tfoot td {
          padding: 14px 0 4px;
          border-top: 1px solid var(--line);
          border-bottom: none;
          font-weight: 600;
          font-size: 14px;
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
          font-weight: 500;
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
          margin-top: 24px;
          padding: 20px 24px 24px;
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
            padding: max(12px, env(safe-area-inset-top, 12px)) 12px max(32px, env(safe-area-inset-bottom, 24px));
          }
          .receipt-header {
            gap: 8px;
            margin-bottom: 14px;
          }
          .receipt-header__title {
            font-size: 15px;
          }
          .receipt-back-btn {
            width: 38px;
            height: 38px;
          }
          .receipt-pill-btn {
            width: 38px;
            height: 38px;
            padding: 0;
            border-radius: 50%;
          }
          .receipt-pill-btn .receipt-pill-btn__label {
            display: none;
          }
          .receipt-header__spacer {
            width: 38px;
          }
          .hero {
            padding: 24px 18px 26px;
          }
          .hero-amount {
            font-size: 32px;
          }
          .stats {
            margin: 16px 16px 0;
          }
          .stat {
            padding: 12px 14px;
          }
          .stat-value {
            font-size: 14px;
          }
          .receipt-section {
            padding: 18px 16px 0;
          }
          .receipt-footer {
            padding: 16px 16px 20px;
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

export function ReceiptSkeleton({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="receipt-overlay">
        <div className="receipt-wrapper">
          <header className="receipt-header no-print">
            <button
              type="button"
              className="receipt-back-btn"
              onClick={onClose}
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="receipt-header__title">Payment Receipt</h1>
            <div className="receipt-header__spacer" />
          </header>

          <div className="receipt receipt--skeleton">
            <div className="hero hero--skeleton">
              <div className="sk-box sk-box--brand" />
              <div className="sk-box sk-box--label" />
              <div className="sk-box sk-box--amount" />
              <div className="sk-row">
                <div className="sk-box sk-box--pill" />
                <div className="sk-box sk-box--time" />
              </div>
            </div>

            <div className="stats stats--skeleton">
              <div className="stat">
                <div className="sk-box sk-box--stat-label" />
                <div className="sk-box sk-box--stat-val" />
              </div>
              <div className="stat">
                <div className="sk-box sk-box--stat-label" />
                <div className="sk-box sk-box--stat-val" />
              </div>
              <div className="stat">
                <div className="sk-box sk-box--stat-label" />
                <div className="sk-box sk-box--stat-val" />
              </div>
              <div className="stat">
                <div className="sk-box sk-box--stat-label" />
                <div className="sk-box sk-box--stat-val" />
              </div>
            </div>

            <div className="receipt-section">
              <div className="sk-box sk-box--sec-title" />
              <div className="sk-box sk-box--line" />
              <div className="sk-box sk-box--line" />
            </div>

            <div className="receipt-section">
              <div className="sk-box sk-box--sec-title" />
              <div className="details-grid">
                <div className="full">
                  <div className="sk-box sk-box--detail-label" />
                  <div className="sk-box sk-box--detail-val" />
                </div>
                <div>
                  <div className="sk-box sk-box--detail-label" />
                  <div className="sk-box sk-box--detail-val" />
                </div>
                <div>
                  <div className="sk-box sk-box--detail-label" />
                  <div className="sk-box sk-box--detail-val" />
                </div>
              </div>
            </div>

            <div className="receipt-footer">
              <div className="sk-box sk-box--foot-note" />
              <div className="sk-box sk-box--foot-mark" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .receipt-overlay {
          background: var(--shell-page-bg, #FAF9F5);
          min-height: 100vh;
          min-height: 100dvh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          padding: max(16px, env(safe-area-inset-top, 16px)) 16px max(40px, env(safe-area-inset-bottom, 24px));
        }

        .receipt-wrapper {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .receipt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 16px;
          min-height: 40px;
          position: relative;
          gap: 12px;
        }

        .receipt-back-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #ECE5DC;
          color: #211C18;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(33, 28, 24, 0.04);
          flex-shrink: 0;
          -webkit-appearance: none;
          appearance: none;
        }

        .receipt-header__title {
          font-size: 16px;
          font-weight: 600;
          color: #211C18;
          margin: 0;
          text-align: center;
          flex: 1;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .receipt-header__spacer {
          width: 40px;
        }

        .receipt {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid #ECE5DC;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 10px 30px -10px rgba(33, 28, 24, 0.08), 0 2px 6px -1px rgba(33, 28, 24, 0.03);
        }

        .hero--skeleton {
          padding: 30px 24px 32px;
          background: linear-gradient(155deg, #d3c4be 0%, #bca59d 100%);
        }

        .sk-box {
          background: rgba(255, 255, 255, 0.45);
          border-radius: 6px;
          animation: sk-shimmer 1.5s infinite ease-in-out;
        }

        @keyframes sk-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.95; }
          100% { opacity: 0.5; }
        }

        .sk-box--brand {
          width: 90px;
          height: 18px;
          margin-bottom: 24px;
        }

        .sk-box--label {
          width: 110px;
          height: 12px;
          margin-bottom: 10px;
        }

        .sk-box--amount {
          width: 220px;
          height: 38px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .sk-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sk-box--pill {
          width: 90px;
          height: 24px;
          border-radius: 100px;
        }

        .sk-box--time {
          width: 140px;
          height: 14px;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: #ECE5DC;
          margin: 20px 24px 0;
          border: 1px solid #ECE5DC;
          border-radius: 14px;
          overflow: hidden;
        }

        .stat {
          background: #FAF8F5;
          padding: 14px 16px;
        }

        .sk-box--stat-label {
          background: #E8E2D9;
          width: 60px;
          height: 11px;
          margin-bottom: 8px;
        }

        .sk-box--stat-val {
          background: #D8D0C5;
          width: 100px;
          height: 16px;
        }

        .receipt-section {
          padding: 22px 24px 0;
        }

        .sk-box--sec-title {
          background: #E8E2D9;
          width: 130px;
          height: 14px;
          margin-bottom: 16px;
        }

        .sk-box--line {
          background: #F0EAE1;
          width: 100%;
          height: 16px;
          margin-bottom: 12px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 20px;
        }

        .details-grid .full {
          grid-column: 1 / -1;
        }

        .sk-box--detail-label {
          background: #E8E2D9;
          width: 70px;
          height: 11px;
          margin-bottom: 6px;
        }

        .sk-box--detail-val {
          background: #F0EAE1;
          width: 120px;
          height: 14px;
        }

        .receipt-footer {
          margin-top: 24px;
          padding: 20px 24px 24px;
          border-top: 1px solid #ECE5DC;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sk-box--foot-note {
          background: #E8E2D9;
          width: 140px;
          height: 12px;
        }

        .sk-box--foot-mark {
          background: #E8E2D9;
          width: 60px;
          height: 12px;
        }

        @media (max-width: 480px) {
          .receipt-overlay {
            padding: max(12px, env(safe-area-inset-top, 12px)) 12px max(32px, env(safe-area-inset-bottom, 24px));
          }
          .receipt-header {
            gap: 8px;
            margin-bottom: 14px;
          }
          .receipt-header__title {
            font-size: 15px;
          }
          .receipt-back-btn {
            width: 38px;
            height: 38px;
          }
          .receipt-header__spacer {
            width: 38px;
          }
          .hero--skeleton {
            padding: 24px 18px 26px;
          }
          .stats {
            margin: 16px 16px 0;
          }
          .receipt-section {
            padding: 18px 16px 0;
          }
          .receipt-footer {
            padding: 16px 16px 20px;
          }
        }
      `}</style>
    </>
  )
}
