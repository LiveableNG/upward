/** Identify self-initiated Upward payments (cancellable) vs GT/PM invoices (not cancellable). */
export function isSelfInitiatedPayment(payment: {
  isManual?: boolean
  company_name?: string | null
  manager_name?: string | null
  description?: string | null
} | null | undefined): boolean {
  if (!payment) return false
  if (payment.isManual) return true
  const description = String(payment.description || '')
  if (description.includes('Manual') || description.includes('Self-initiated')) return true
  if (!payment.company_name && !payment.manager_name) return true
  if (payment.company_name === 'Manual Payment') return true
  return false
}
