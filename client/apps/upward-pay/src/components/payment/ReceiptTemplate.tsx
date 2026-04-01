'use client'

import { formatCurrency, formatDate, getCategoryIconName } from '@/lib/utils'
import { UpwardLogo } from '@/components/payment/PoweredByUpward'
import type { ReceiptData } from '@/lib/api'
import { Download, MapPin, Home, Lock, Users, Scale, Settings, Wrench, Package, ArrowLeft, Check, TrendingUp } from 'lucide-react'

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
    const printContent = document.getElementById('receipt-printable')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.receiptNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; padding: 40px; margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt { max-width: 600px; border: 1px solid #eaeaea; border-radius: 12px; padding: 40px; margin: 0 auto; }
            .receipt__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .receipt__company-row { display: flex; align-items: center; gap: 16px; }
            .receipt__company-logo { width: 56px; height: 56px; border-radius: 8px; object-fit: contain; border: 1px solid #eaeaea; }
            .receipt__company-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #111; }
            .receipt__label { font-size: 13px; color: #666; font-weight: 500; }
            .receipt__badge { background: #dcfce7; color: #16a34a; padding: 6px 12px; border-radius: 100px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
            .receipt__badge svg { color: #16a34a; }
            .receipt__divider { height: 1px; background: #eaeaea; margin: 24px 0; }
            .receipt__divider--bold { height: 2px; background: #d4d4d4; }
            .receipt__info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .receipt__info-item { display: flex; flex-direction: column; gap: 4px; }
            .receipt__info-label { font-size: 12px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
            .receipt__info-value { font-size: 15px; font-weight: 600; color: #111; }
            .receipt__channel { display: inline-block; background: #f3f4f6; padding: 4px 10px; border-radius: 6px; font-size: 13px; }
            .receipt__property { display: flex; align-items: center; gap: 12px; background: #fafafa; padding: 16px; border-radius: 8px; border: 1px solid #f0f0f0; margin-top: 24px; }
            .receipt__property-icon { background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #eaeaea; color: #d97757; }
            .receipt__property-name { font-size: 15px; font-weight: 600; display: block; margin-bottom: 2px; }
            .receipt__property-address { font-size: 13px; color: #666; }
            .receipt__items { margin-top: 24px; }
            .receipt__items-header { display: flex; justify-content: space-between; font-size: 12px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border-bottom: 1px solid #eaeaea; padding-bottom: 8px; }
            .receipt__item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
            .receipt__item-left { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500; }
            .receipt__item-icon { color: #888; display: flex; }
            .receipt__item-amount { font-size: 15px; font-weight: 600; }
            .receipt__total { display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; color: #111; }
            .receipt__reference { margin-top: 24px; display: inline-block; background: #fafafa; padding: 10px 16px; border-radius: 6px; border: 1px solid #f0f0f0; }
            .receipt__ref-code { font-family: monospace; font-size: 14px; font-weight: 600; margin-left: 8px; color: #111; }
            .receipt__footer { margin-top: 40px; text-align: center; color: #888; }
            .receipt__footer-brand { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; color: #111; margin-bottom: 8px; }
            .receipt__footer-note { font-size: 12px; }
            @media print {
               body { padding: 0; }
               .receipt { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${printContent.innerHTML}
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
            <div className="receipt__badge" style={{ 
              background: receipt.type === 'credit' ? 'var(--success-bg)' : '#dcfce7',
              color: receipt.type === 'credit' ? 'var(--success)' : '#16a34a'
            }}>
              <span className="receipt__badge-check"><Check size={12} /></span>
              {receipt.type === 'credit' ? 'DEPOSITED' : 'PAID'}
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
            {receipt.lineItems.length > 0 ? receipt.lineItems.map((item, i) => (
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
            )) : (
              <div className="receipt__item">
                <div className="receipt__item-left">
                  <span className="receipt__item-icon">
                    <TrendingUp size={16} />
                  </span>
                  <span>{receipt.type === 'credit' ? 'Savings Deposit' : 'Miscellaneous Payment'}</span>
                </div>
                <span className="receipt__item-amount">
                  {formatCurrency(receipt.amount, receipt.currency)}
                </span>
              </div>
            )}
          </div>

          <div className="receipt__divider receipt__divider--bold" />

          {/* Total */}
          <div className="receipt__total">
            <span>{receipt.type === 'credit' ? 'Total Saved' : 'Total Paid'}</span>
            <span className="receipt__total-amount" style={{ color: receipt.type === 'credit' ? 'var(--success)' : 'inherit' }}>
              {formatCurrency(receipt.amount, receipt.currency)}
            </span>
          </div>

          {/* Reference */}
          <div className="receipt__reference">
            <span className="receipt__info-label">{receipt.type === 'credit' ? 'Wallet Ref:' : 'Paystack Ref:'}</span>
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
