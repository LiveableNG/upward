import React from 'react'
import { ChevronRight, Clock } from 'lucide-react'
import { type Landlord } from './types'
import { LandlordAvatar } from './LandlordAvatar'
import { formatCurrency } from '@/lib/utils'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LandlordCard({
  landlord: l,
  onSelect,
  tag,
}: {
  landlord: Landlord
  onSelect: (l: Landlord) => void
  tag?: string
}) {
  return (
    <div
      onClick={() => onSelect(l)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border-solid)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        marginBottom: 10,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      <LandlordAvatar letter={l.avatar} color={l.source === 'pm' ? '#3b82f6' : undefined} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{l.name}</span>
          {tag && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '2px 6px',
                background: 'var(--clay-faint)',
                color: 'var(--clay)',
                borderRadius: 4,
                letterSpacing: '0.05em',
              }}
            >
              {tag}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {l.bankName} · {l.accountNumber}
        </div>
        {l.lastPaid && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              color: 'var(--text-muted)',
              fontSize: 11,
            }}
          >
            <Clock size={14} />
            Last paid {formatDate(l.lastPaid)} · {formatCurrency(l.lastAmount)}
          </div>
        )}
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        <ChevronRight size={16} />
      </div>
    </div>
  )
}
