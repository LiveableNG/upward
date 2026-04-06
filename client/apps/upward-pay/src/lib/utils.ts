export function formatCurrency(amount: number | undefined | null, currency = 'NGN'): string {
  const val = amount || 0
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function groupTransactionsByDate<T extends { paid_at?: string }>(
  transactions: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {}

  transactions.forEach((tx) => {
    if (!tx.paid_at) return
    const date = new Date(tx.paid_at).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(tx)
  })

  return groups
}

/**
 * Generates a unique ID with an optional prefix
 */
export function generateId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11)

  return prefix ? `${prefix}_${uuid}` : uuid
}
