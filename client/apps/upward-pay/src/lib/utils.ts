export function formatCurrency(amountInKobo: number | undefined | null, currency = 'NGN'): string {
  const amount = (amountInKobo || 0) / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
