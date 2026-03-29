/** Format kobo amount to Naira display string */
export function formatCurrency(amountInKobo: number, currency = 'NGN'): string {
  const amount = amountInKobo / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format date string to human readable */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Get category icon name for Lucide */
export function getCategoryIconName(category: string): string {
  const icons: Record<string, string> = {
    rent: 'Home',
    caution: 'Lock',
    agency: 'Users',
    legal: 'Scale',
    management: 'Settings',
    repair: 'Wrench',
    other: 'Package',
  }
  return icons[category] || 'Package'
}

/** Get status color */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#d97757',
    partially_paid: '#e6a87c',
    paid: '#22c55e',
    success: '#22c55e',
    failed: '#ef4444',
    expired: '#6b7280',
  }
  return colors[status] || '#6b7280'
}

/** Group transactions by date */
export function groupTransactionsByDate<T extends { paid_at?: string }>(
  transactions: T[]
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
