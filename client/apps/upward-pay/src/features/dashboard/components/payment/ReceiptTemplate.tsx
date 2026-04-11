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
  Activity,
} from 'lucide-react'

export interface ReceiptData {
  uuid: string
  title: string
  receiptNumber: string
  paidAt: string
  generatedAt: string
  tenantName: string
  companyName: string
  companyLogo: string
  paymentType: string
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons: Record<string, any> = { Home, Lock, Users, Scale, Settings, Wrench, Package }
  const Icon = icons[name] || Package
  return <Icon size={size} />
}

export default function ReceiptTemplate({
  receipt,
  onClose,
  onDownload,
}: {
  receipt: ReceiptData
  onClose?: () => void
  onDownload?: () => void
}) {
  function handleShare() {
    const amountStr = formatCurrency(receipt.amount)
    const text = `Hello! I've just paid my rent through Upward. Here is my receipt (#${receipt.receiptNumber}) for ${amountStr}. This payment is verified on the GoodTenants platform for your records.`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  const isCredit = receipt.type === 'credit'
  const isActualBreakdown =
    receipt.lineItems.length > 1 ||
    (receipt.lineItems.length === 1 && receipt.lineItems[0].label !== 'Rent Payment')

  return (
    <>
      <div className="receipt-overlay">
        <div className="receipt-container">
          <div
            className="receipt-actions no-print"
            style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}
          >
        <button
          className="btn btn--secondary btn--sm"
          style={{ padding: '8px 12px', flexShrink: 0 }}
          onClick={onClose}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary btn--sm" onClick={handleShare}>
            Share
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => onDownload?.()}>
            <Download size={13} style={{ marginRight: 4 }} />
            Download
          </button>
        </div>
      </div>

      <div
        id="receipt-printable"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border-solid)',
        }}
      >
        {/* Header */}
        <div
          className="receipt__header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            {receipt.companyLogo ? (
              <img
                src={receipt.companyLogo}
                alt={receipt.companyName}
                className="receipt__company-logo"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  flexShrink: 0,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-solid)',
                  flexShrink: 0,
                }}
              >
                <Activity size={20} color="var(--clay)" />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: '0 0 2px',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '160px',
                }}
                title={receipt.companyName}
              >
                {receipt.companyName}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                Property Manager
              </span>
            </div>
          </div>
          <div
            style={{
              background: isCredit ? 'var(--success-bg)' : 'rgba(34,197,94,0.08)',
              color: isCredit ? 'var(--success)' : '#16a34a',
              padding: '5px 10px',
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexShrink: 0,
              letterSpacing: '0.04em',
            }}
          >
            <Check size={11} />
            {isCredit ? 'DEPOSITED' : 'PAID'}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-solid)', margin: '0 0 20px' }} />

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Receipt No.', value: receipt.receiptNumber },
            { label: 'Date', value: formatDate(receipt.paidAt) },
            { label: 'Tenant', value: receipt.tenantName },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={value}
              >
                {value}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Channel
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                background: 'var(--clay-faint)',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                color: 'var(--clay)',
                fontWeight: 600,
              }}
            >
              {receipt.channel}
            </span>
          </div>
        </div>

        {/* Property card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'var(--bg)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-solid)',
            marginTop: '20px',
          }}
        >
          <span
            style={{
              background: 'var(--surface)',
              padding: 7,
              borderRadius: 6,
              border: '1px solid var(--border-solid)',
              color: 'var(--clay)',
              display: 'flex',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <MapPin size={13} />
          </span>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                display: 'block',
                marginBottom: 2,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {receipt.paymentType}
            </span>
            {isActualBreakdown && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--clay)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                  display: 'block',
                }}
              >
                Payment Breakdown Summary
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'block',
                lineHeight: 1.4,
              }}
            >
              {receipt.propertyAddress || 'Manual Transfer'}
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-solid)', margin: '20px 0' }} />

        {/* Line items */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-solid)',
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
                  padding: '10px 0',
                  borderBottom:
                    i < receipt.lineItems.length - 1 ? '1px solid var(--border-solid)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    <CategoryIcon name={getCategoryIconName(item.category)} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                  <TrendingUp size={15} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {isCredit ? 'Savings Deposit' : 'Miscellaneous Payment'}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(receipt.amount)}
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 2, background: 'var(--border-solid)', margin: '20px 0' }} />

        {/* Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          <span>{isCredit ? 'Total Saved' : 'Total Paid'}</span>
          <span style={{ color: isCredit ? 'var(--success)' : 'var(--clay)', fontSize: 16 }}>
            {formatCurrency(receipt.amount)}
          </span>
        </div>

        {/* Reference */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg)',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--border-solid)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            {isCredit ? 'Wallet Ref:' : 'Paystack Ref:'}
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {receipt.paystackReference}
          </span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 6,
            }}
          >
            <UpwardLogo size={13} color="var(--clay)" />
            <span>Powered by Upward</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This is an electronically generated receipt. No signature required.
          </p>
        </div>
      </div>
        </div>
      </div>

      <style jsx>{`
        .receipt-overlay {
          background: var(--bg);
          min-height: 100vh;
          padding: 16px;
        }

        .receipt-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }

        @media (min-width: 1024px) {
          .receipt-overlay {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            padding: 40px;
          }

          .receipt-container {
            background: var(--bg);
            padding: 32px;
            border-radius: 24px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
          }

          #receipt-printable {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </>
  )
}
