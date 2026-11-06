import { type UserProfile } from '@/features/auth/types'
import { type PendingPayment, type RentDueInfo } from '@/features/dashboard/types'

export function formatPropertyShort(address?: string): string {
  if (!address) return 'Your property'
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
  return address
}

export function daysUntil(dateStr: string | Date): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getRentDue(
  pendingPayments: PendingPayment[],
  user: UserProfile | null,
): RentDueInfo | null {
  const firstPending = pendingPayments[0]
  if (firstPending) {
    const dateStr = firstPending.due_date || firstPending.dueDate
    const remaining = firstPending.total_amount - (firstPending.amountPaid || 0)
    const amount = remaining > 0 ? remaining : firstPending.total_amount
    const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
    const days = dateStr ? Math.abs(daysUntil(dateStr)) : 0
    let label = isOverdue ? 'Overdue' : 'Rent Due'
    let isRejected = false
    let isReviewing = false

    if (firstPending.latestProof) {
      if (firstPending.latestProof.status === 'PENDING') {
        label = 'In Review'
        isReviewing = true
      } else if (firstPending.latestProof.status === 'REJECTED') {
        label = 'Proof Rejected'
        isRejected = true
      }
    }

    return {
      amount,
      currency: firstPending.currency || 'NGN',
      address: formatPropertyShort(firstPending.property_address ?? undefined),
      days,
      isOverdue,
      isReviewing,
      isRejected,
      label,
      href: `/dashboard/pay-rent${firstPending.uuid ? `?paymentUuid=${firstPending.uuid}` : ''}`,
    }
  }

  const activeProps = (user?.properties || []).filter((p) => !p.isPastTenancy && p.rentEndDate)
  const upcoming = activeProps
    .map((prop) => {
      if (!prop.rentEndDate) return null
      const days = daysUntil(prop.rentEndDate)
      if (days < 0) return null
      const address = prop.location
        ? [prop.location.area, prop.location.state].filter(Boolean).join(', ')
        : prop.address
      return {
        amount: prop.rentAmount || 0,
        currency: 'NGN',
        address: formatPropertyShort(address),
        days,
        isOverdue: false,
        isReviewing: false,
        isRejected: false,
        label: 'Rent Due',
        href: `/dashboard/pay-rent?propertyUuid=${prop.uuid}`,
        sortKey: days,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a!.sortKey ?? 0) - (b!.sortKey ?? 0))[0]

  return upcoming ?? null
}

export function sortPendingPayments(
  pending: PendingPayment[],
  user: UserProfile | null,
): PendingPayment[] {
  return [...pending]
    .filter((p) => {
      if (!p.userPropertyUuid) return true
      const prop = user?.properties?.find((item) => item.uuid === p.userPropertyUuid)
      return !prop?.isPastTenancy
    })
    .sort((a, b) => {
      const now = new Date()
      const aDate = a.due_date || a.dueDate
      const bDate = b.due_date || b.dueDate
      const aOverdue = aDate && new Date(aDate) < now ? 1 : 0
      const bOverdue = bDate && new Date(bDate) < now ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue
      return new Date(aDate || 0).getTime() - new Date(bDate || 0).getTime()
    })
}

export function computeAnyOverdue(pendingPayments: PendingPayment[]): boolean {
  return pendingPayments.some((p) => {
    const dateStr = p.due_date || p.dueDate
    return dateStr && new Date(dateStr) < new Date()
  })
}
