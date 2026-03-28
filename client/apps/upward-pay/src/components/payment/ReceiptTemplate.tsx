'use client'

import { formatCurrency, formatDate, getCategoryIconName } from '@/lib/utils'
import { UpwardLogo } from '@/components/payment/PoweredByUpward'
import type { ReceiptData } from '@/lib/api'
import { Download, MapPin, Home, Lock, Users, Scale, Settings, Wrench, Package, ArrowLeft, Check } from 'lucide-react'

const CategoryIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const icons: Record<string, any> = {
    Home,
    Lock,
    Users,
    Scale,
    Settings,
    Wrench,
    Package,
  }
  const Icon = icons[name] || Package
  return <Icon size={size} />
}

export default function ReceiptTemplate({
  receipt,
  onClose,
}: {
  receipt: ReceiptData
  onClose?: () => void
}) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="receipt-overlay">
      <div className="receipt-modal">
        {/* Action bar (hidden in print) */}
        <div className="receipt-actions no-print">
          <button className="btn btn--secondary btn--sm" onClick={onClose}>
            <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back
          </button>
          <button className="btn btn--primary btn--sm" onClick={handlePrint}>
            <Download size={14} style={{ marginRight: 4 }} /> Download PDF
          </button>
        </div>

        {/* The actual receipt — this prints */}
        <div className="receipt" id="receipt-printable">
          {/* Header */}
          <div className="receipt__header">
            <div className="receipt__company-row">
              <img
                src={receipt.companyLogo}
                alt={receipt.companyName}
                className="receipt__company-logo"
              />
              <div>
                <h2 className="receipt__company-name">{receipt.companyName}</h2>
                <span className="receipt__label">Property Manager</span>
              </div>
            </div>
            <div className="receipt__badge">
              <span className="receipt__badge-check"><Check size={12} /></span>
              PAID
            </div>
          </div>

          <div className="receipt__divider" />

          {/* Receipt Info */}
          <div className="receipt__info-grid">
            <div className="receipt__info-item">
              <span className="receipt__info-label">Receipt No.</span>
              <span className="receipt__info-value">{receipt.receiptNumber}</span>
            </div>
            <div className="receipt__info-item">
              <span className="receipt__info-label">Date</span>
              <span className="receipt__info-value">{formatDate(receipt.paidAt)}</span>
            </div>
            <div className="receipt__info-item">
              <span className="receipt__info-label">Tenant</span>
              <span className="receipt__info-value">{receipt.tenantName}</span>
            </div>
            <div className="receipt__info-item">
              <span className="receipt__info-label">Channel</span>
              <span className="receipt__info-value receipt__channel">{receipt.channel}</span>
            </div>
          </div>

          {/* Property */}
          <div className="receipt__property">
            <span className="receipt__property-icon"><MapPin size={14} /></span>
            <div>
              <span className="receipt__property-name">{receipt.propertyName}</span>
              <span className="receipt__property-address">{receipt.propertyAddress}</span>
            </div>
          </div>

          <div className="receipt__divider" />

          {/* Line Items */}
          <div className="receipt__items">
            <div className="receipt__items-header">
              <span>Description</span>
              <span>Amount</span>
            </div>
            {receipt.lineItems.map((item, i) => (
              <div key={i} className="receipt__item">
                <div className="receipt__item-left">
                  <span className="receipt__item-icon">
                    <CategoryIcon name={getCategoryIconName(item.category)} />
                  </span>
                  <span>{item.label}</span>
                </div>
                <span className="receipt__item-amount">
                  {formatCurrency(item.amount, receipt.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="receipt__divider receipt__divider--bold" />

          {/* Total */}
          <div className="receipt__total">
            <span>Total Paid</span>
            <span className="receipt__total-amount">
              {formatCurrency(receipt.amount, receipt.currency)}
            </span>
          </div>

          {/* Reference */}
          <div className="receipt__reference">
            <span className="receipt__info-label">Paystack Ref:</span>
            <span className="receipt__ref-code">{receipt.paystackReference}</span>
          </div>

          {/* Footer */}
          <div className="receipt__footer">
            <div className="receipt__footer-line" />
            <div className="receipt__footer-brand">
              <UpwardLogo size={16} color="#d97757" />
              <span>Powered by Upward</span>
            </div>
            <p className="receipt__footer-note">
              This is an electronically generated receipt. No signature required.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
