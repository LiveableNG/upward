import { type CompletedPayment, type TransactionCategory } from '@/features/dashboard/types'

export function inferTransactionCategory(tx: {
  company_name?: string
  property_address?: string
  apiType?: string
}): TransactionCategory {
  const blob = `${tx.company_name ?? ''} ${tx.property_address ?? ''}`.toLowerCase()
  if (blob.includes('benefit')) return 'benefits'
  if (blob.includes('deposit') || blob.includes('caution') || blob.includes('security')) {
    return 'deposit'
  }
  if (
    blob.includes('utility') ||
    blob.includes('service charge') ||
    blob.includes('power') ||
    blob.includes('water') ||
    blob.includes('estate')
  ) {
    return 'utilities'
  }
  if (tx.apiType === 'RENT' || blob.includes('rent')) return 'rent'
  return 'rent'
}

export function groupTransactionsByMonth(
  transactions: CompletedPayment[],
): Record<string, CompletedPayment[]> {
  const groups: Record<string, CompletedPayment[]> = {}

  for (const tx of transactions) {
    if (!tx.paid_at) continue
    const d = new Date(tx.paid_at)
    if (Number.isNaN(d.getTime())) continue
    const month = d.toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })
    if (!groups[month]) groups[month] = []
    groups[month].push(tx)
  }

  for (const items of Object.values(groups)) {
    items.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
  }

  return groups
}

export function sortMonthKeys(grouped: Record<string, CompletedPayment[]>): string[] {
  return Object.keys(grouped).sort((a, b) => {
    const firstA = grouped[a]?.[0]
    const firstB = grouped[b]?.[0]
    const ta = firstA?.paid_at ? new Date(firstA.paid_at).getTime() : 0
    const tb = firstB?.paid_at ? new Date(firstB.paid_at).getTime() : 0
    return tb - ta
  })
}

export function filterTransactions(
  list: CompletedPayment[],
  opts: { search: string; category: TransactionCategory },
): CompletedPayment[] {
  const q = opts.search.trim().toLowerCase()
  return list.filter((tx) => {
    if (opts.category !== 'all' && tx.category !== opts.category) return false
    if (!q) return true
    return (
      tx.company_name.toLowerCase().includes(q) ||
      (tx.channel ?? '').toLowerCase().includes(q) ||
      (tx.paystack_reference ?? '').toLowerCase().includes(q) ||
      (tx.property_address ?? '').toLowerCase().includes(q) ||
      String(tx.amount).includes(q)
    )
  })
}

export const TX_FILTER_PILLS: { id: TransactionCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rent', label: 'Rent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'benefits', label: 'Benefits' },
]
