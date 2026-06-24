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
    <button type="button" className="pay-flow__card" onClick={() => onSelect(l)} style={{ marginBottom: 10 }}>
      <LandlordAvatar letter={l.avatar} color={l.source === 'pm' ? '#3b82f6' : undefined} />
      <div className="pay-flow__card-body">
        <div className="pay-flow__card-title">
          {l.name}
          {tag && <span className="pay-flow__badge">{tag}</span>}
        </div>
        <div className="pay-flow__card-meta pay-flow__card-meta--muted">
          {l.bankName} · {l.accountNumber}
        </div>
        {l.lastPaid && (
          <div className="pay-flow__card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Clock size={14} />
            Last paid {formatDate(l.lastPaid)} · {formatCurrency(l.lastAmount)}
          </div>
        )}
      </div>
      <ChevronRight size={16} className="pay-flow__card-trailing" />
    </button>
  )
}
