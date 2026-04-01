import React, { useState } from 'react'
import { formatCurrency, getCategoryIconName } from '@/lib/utils'
import { Home, Lock, Users, Scale, Settings, Wrench, Package, Check, ChevronDown, ChevronUp, Receipt } from 'lucide-react'

const CategoryIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
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

interface LineItem {
  uuid?: string
  label: string
  category?: string
  amount: number
}

export default function InvoiceCard({
  invoiceNumber,
  notes,
  lineItems,
  totalAmount,
  currency = 'NGN',
  status,
  isPriority,
}: {
  invoiceNumber: string
  notes?: string
  lineItems: LineItem[]
  totalAmount: number
  currency?: string
  status?: string
  isPriority?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div style={{ 
      background: 'var(--surface)',
      border: isPriority ? '1px solid var(--clay)' : '1px solid var(--border-solid)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: isPriority ? '0 10px 25px -10px var(--clay-glow)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {/* Collapsed row — same height/padding as savings wallet */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'var(--clay-faint)', color: 'var(--clay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Receipt size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Invoice Breakdown
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Ref: {invoiceNumber} · {formatCurrency(totalAmount, currency)}
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          color: 'var(--text-muted)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
            {isExpanded ? 'Hide' : 'Details'}
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border-solid)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ padding: '12px 16px 16px' }}>
            {notes && (
              <p style={{
                margin: '0 0 12px', padding: '10px 12px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontSize: '12px',
                color: 'var(--text-secondary)', lineHeight: 1.5,
              }}>
                {notes}
              </p>
            )}

            <div>
              {lineItems.map((item, idx) => (
                <div key={item.uuid || idx} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '9px 0',
                  borderBottom: idx < lineItems.length - 1 ? '1px dashed var(--border-solid)' : 'none',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span style={{ opacity: 0.5, flexShrink: 0 }}>
                      <CategoryIcon name={getCategoryIconName(item.category || 'rent')} size={15} />
                    </span>
                    <span style={{
                      fontSize: '12px', color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-solid)',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--clay)' }}>
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {status === 'paid' && (
        <div className="invoice-card__paid-badge" style={{ margin: '0 16px 16px' }}>
          <Check size={14} style={{ marginRight: 4 }} /> Paid
        </div>
      )}
    </div>
  )
}