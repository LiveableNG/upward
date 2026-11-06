import { type ActivityListItem } from '@/features/dashboard/types'
import { inferTransactionCategory } from '@/features/dashboard/utils/transactions'
import type { GtHistoryRow } from '@/features/my-home/hooks/useAllGtTransactions'

function parseGtAmount(value: string) {
  return parseFloat(value.replace(/,/g, '')) || 0
}

function gtPaidAt(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toISOString()
}

export function gtRowToActivityItem(tx: GtHistoryRow): ActivityListItem {
  const base = {
    uuid: `gt-${tx.propertyUuid}-${tx.reference || tx.date}-${tx.category}-${tx.amount}`,
    amount: parseGtAmount(tx.amount),
    currency: 'NGN',
    status: tx.status,
    channel: tx.payment_method || tx.payment_gateway || 'My Home',
    paid_at: gtPaidAt(tx.date),
    paystack_reference: tx.reference || '',
    company_name: tx.category,
    type: tx.type,
    property_address: tx.additional_information || tx.unitName || tx.propertyLabel,
    source: 'gt' as const,
  }
  return {
    ...base,
    category: inferTransactionCategory({
      company_name: base.company_name,
      property_address: base.property_address,
    }),
  }
}
