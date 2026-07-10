'use client'

import { CheckCircle2 } from 'lucide-react'
import { LandlordAvatar } from '@/features/dashboard/components/payment/LandlordAvatar'
import { formatDate } from '@/lib/utils'

interface CheckoutRecipientCardProps {
  accountName: string
  accountMeta?: string | null
  dueDate?: string | null
  isVerified?: boolean
}

function recipientInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`
  }
  return trimmed.slice(0, 2)
}

export function CheckoutRecipientCard({
  accountName,
  accountMeta,
  dueDate,
  isVerified,
}: CheckoutRecipientCardProps) {
  const dueLabel =
    dueDate && !Number.isNaN(new Date(dueDate).getTime())
      ? `Due ${formatDate(dueDate)}`
      : null

  return (
    <div className="pay-flow__recipient pay-flow__recipient--checkout">
      <LandlordAvatar letter={recipientInitial(accountName)} size={40} />
      <div className="pay-flow__recipient-body">
        <div className="pay-flow__recipient-name-row">
          <span className="pay-flow__recipient-name">{accountName}</span>
          {isVerified ? (
            <CheckCircle2 size={14} className="pay-flow__recipient-verified" aria-label="Verified account" />
          ) : null}
        </div>
        {accountMeta ? (
          <div className="pay-flow__recipient-meta">{accountMeta}</div>
        ) : null}
        {dueLabel ? (
          <div className="pay-flow__recipient-due">{dueLabel}</div>
        ) : null}
      </div>
    </div>
  )
}
