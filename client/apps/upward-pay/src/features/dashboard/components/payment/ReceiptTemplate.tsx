'use client'

import { formatCurrency } from '@/lib/utils'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import {
  Download,
  MapPin,
  Home,
  Lock,
  Users,
  Scale,
  Settings,
  Wrench,
  Package,
  ArrowLeft,
  Check,
  TrendingUp,
} from 'lucide-react'

// Dummy typedef for now
export interface ReceiptData {
  uuid: string
  title: string
  receiptNumber: string
  paidAt: string
  generatedAt: string
  tenantName: string
  companyName: string
  companyLogo: string
  propertyName: string
  propertyAddress: string
  amount: number
  currency: string
  channel: string
  paystackReference: string
  type?: 'credit' | 'debit'
  lineItems: Array<{ label: string; amount: number; category: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function getCategoryIconName(category: string) {
  return category
}

const CategoryIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons: Record<string, any> = { Home, Lock, Users, Scale, Settings, Wrench, Package }
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

  function handleShare() {
    const amountStr = formatCurrency(receipt.amount)
    const text = `Hello! I've just paid my rent through Upward. Here is my receipt (#${receipt.receiptNumber}) for ${amountStr}. This payment is verified on the GoodTenants platform for your records.`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div
      className="receipt-overlay"
      style={{ background: 'var(--bg)', minHeight: '100vh', padding: 20 }}
    >
      {/* Action bar (hidden in print) */}
      <div
        className="receipt-actions no-print"
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 20 }}
      >
        <button
          className="btn btn--secondary btn--sm"
          style={{ padding: '8px 12px' }}
          onClick={onClose}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary btn--sm" onClick={handleShare}>
            Share
          </button>
          <button className="btn btn--primary btn--sm" onClick={handlePrint}>
            <Download size={14} style={{ marginRight: 4 }} />
            Download
          </button>
        </div>
      </div>

      <div
        style={{ background: '#fff', color: '#111', padding: 24, borderRadius: 16 }}
        id="receipt-printable"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {receipt.companyLogo && (
              <img
                src={receipt.companyLogo}
                alt={receipt.companyName}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
            )}
            {!receipt.companyLogo && (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {receipt.companyName[0]}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#111' }}>
                {receipt.companyName}
              </h2>
              <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>Property Manager</span>
            </div>
          </div>
          <div
            style={{
              background: receipt.type === 'credit' ? 'var(--success-bg)' : '#dcfce7',
              color: receipt.type === 'credit' ? 'var(--success)' : '#16a34a',
              padding: '6px 12px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={12} />
            {receipt.type === 'credit' ? 'DEPOSITED' : 'PAID'}
          </div>
        </div>

        <div style={{ height: 1, background: '#eaeaea', margin: '24px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                color: '#666',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Receipt No.
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
              {receipt.receiptNumber}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                color: '#666',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Date
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
              {formatDate(receipt.paidAt)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                color: '#666',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Tenant
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
              {receipt.tenantName}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                color: '#666',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Channel
            </span>
            <span
              style={{
                display: 'inline-block',
                background: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              {receipt.channel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fafafa',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            marginTop: 24,
          }}
        >
          <span
            style={{
              background: '#fff',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #eaeaea',
              color: '#d97757',
            }}
          >
            <MapPin size={14} />
          </span>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 2 }}>
              {receipt.propertyName}
            </span>
            <span style={{ fontSize: 12, color: '#666' }}>{receipt.propertyAddress}</span>
          </div>
        </div>

        <div style={{ height: 1, background: '#eaeaea', margin: '24px 0' }} />

        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#666',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
              borderBottom: '1px solid #eaeaea',
              paddingBottom: 8,
            }}
          >
            <span>Description</span>
            <span>Amount</span>
          </div>
          {receipt.lineItems.length > 0 ? (
            receipt.lineItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: '#888', display: 'flex' }}>
                    <CategoryIcon name={getCategoryIconName(item.category)} />
                  </span>
                  <span>{item.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <span style={{ color: '#888', display: 'flex' }}>
                  <TrendingUp size={16} />
                </span>
                <span>
                  {receipt.type === 'credit' ? 'Savings Deposit' : 'Miscellaneous Payment'}
                </span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {formatCurrency(receipt.amount)}
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 2, background: '#d4d4d4', margin: '24px 0' }} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: '#111',
          }}
        >
          <span>{receipt.type === 'credit' ? 'Total Saved' : 'Total Paid'}</span>
          <span style={{ color: receipt.type === 'credit' ? 'var(--success)' : 'inherit' }}>
            {formatCurrency(receipt.amount)}
          </span>
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'inline-block',
            background: '#fafafa',
            padding: '10px 16px',
            borderRadius: 6,
            border: '1px solid #f0f0f0',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#666',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {receipt.type === 'credit' ? 'Wallet Ref:' : 'Paystack Ref:'}
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 600,
              marginLeft: 8,
              color: '#111',
            }}
          >
            {receipt.paystackReference}
          </span>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center', color: '#888' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#111',
              marginBottom: 8,
            }}
          >
            <UpwardLogo size={14} color="#d97757" />
            <span>Powered by Upward</span>
          </div>
          <p style={{ fontSize: 11 }}>
            This is an electronically generated receipt. No signature required.
          </p>
        </div>
      </div>
    </div>
  )
}
