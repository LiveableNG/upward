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

/** Get category icon emoji */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    rent: '🏠',
    caution: '🔒',
    agency: '🤝',
    legal: '📋',
    management: '⚙️',
    repair: '🔧',
    other: '📦',
  }
  return icons[category] || '📦'
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
