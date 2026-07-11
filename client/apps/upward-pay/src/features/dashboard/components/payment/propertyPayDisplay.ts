import { formatCurrency, formatDate } from '@/lib/utils'

export const DUE_SOON_DAYS = 30

export type RentCycleTone = 'ended' | 'expired' | 'soon' | 'calm' | 'starts'

export type RentCycleDisplay = {
  label: string
  tone: RentCycleTone
  sortKey: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropertyLike = any

function daysUntil(dateStr: string | Date | undefined | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatPropertyAddress(prop: PropertyLike): string {
  const loc = prop.location
  const parts = [loc?.address || prop.address, loc?.area, loc?.state].filter(Boolean)
  return parts.join(', ') || 'Address not set'
}

export function formatPropertyTitle(prop: PropertyLike): string {
  const loc = prop.location
  return loc?.address || loc?.area || prop.address || 'Property'
}

export function formatPropertyTitleWithUnit(prop: PropertyLike): string {
  const unitName = prop.unitName || prop.pmUnit?.unitName
  const base = formatPropertyTitle(prop)
  if (unitName) return `${unitName} · ${base}`
  return base
}

export function shouldShowPropertyBalanceStrip(
  propertyBalance: {
    hasActiveRequest?: boolean
    amountPaid?: number
    remainingBalance?: number
  } | null | undefined,
  requestedAmount = 0,
): boolean {
  if (!propertyBalance) return false
  if (requestedAmount > 0) return true
  if (propertyBalance.hasActiveRequest) return true
  if ((propertyBalance.amountPaid ?? 0) > 0) return true
  return false
}

export function getOwedRentAmount(
  propertyBalance: { remainingBalance?: number } | null | undefined,
  property: { rentAmount?: number } | null | undefined,
): number {
  if ((propertyBalance?.remainingBalance ?? 0) > 0) {
    return propertyBalance!.remainingBalance!
  }
  return property?.rentAmount ?? 0
}

export function isRentAmountEditable(
  propertyBalance: { allowPartial?: boolean } | null | undefined,
): boolean {
  return propertyBalance?.allowPartial === true
}

export function formatManagerLabel(prop: PropertyLike): string {
  const company = prop.company?.name || prop.companyName
  const manager = prop.manager?.firstName
    ? [prop.manager.firstName, prop.manager.lastName].filter(Boolean).join(' ')
    : prop.managerName

  if (company && manager && company !== manager) return `${manager} · ${company}`
  return company || manager || 'Private Landlord'
}

export function getRentCycleDisplay(prop: PropertyLike): RentCycleDisplay {
  if (prop.isPastTenancy) {
    return { label: 'Lease ended', tone: 'ended', sortKey: 0 }
  }

  const daysToStart = prop.rentStartDate ? daysUntil(prop.rentStartDate) : null
  if (daysToStart !== null && daysToStart > 0) {
    return {
      label: `Starts ${formatDate(prop.rentStartDate)}`,
      tone: 'starts',
      sortKey: 4000 + daysToStart,
    }
  }

  const daysToEnd = prop.rentEndDate ? daysUntil(prop.rentEndDate) : null
  if (daysToEnd === null) {
    return { label: 'Rent dates not set', tone: 'calm', sortKey: 9000 }
  }

  if (daysToEnd < 0) {
    return { label: 'Expired', tone: 'expired', sortKey: 100 }
  }

  if (daysToEnd === 0) {
    return { label: 'Due today', tone: 'soon', sortKey: 200 }
  }

  if (daysToEnd <= DUE_SOON_DAYS) {
    return { label: `Due in ${daysToEnd} days`, tone: 'soon', sortKey: 300 + daysToEnd }
  }

  return { label: `Due in ${daysToEnd} days`, tone: 'calm', sortKey: 1000 + daysToEnd }
}

export function formatPropertyPaymentSubline(prop: PropertyLike): string | null {
  const remaining = prop.amountRemaining
  const paid = prop.amountPaid ?? 0

  if (typeof remaining === 'number' && remaining > 0 && paid > 0) {
    return `${formatCurrency(remaining, prop.currency || 'NGN')} remaining`
  }
  if (prop.rentAmount) {
    return `${formatCurrency(prop.rentAmount, prop.currency || 'NGN')}/yr`
  }
  return null
}

export function sortPropertiesForDisplay(properties: PropertyLike[]): PropertyLike[] {
  return [...properties].sort((a, b) => {
    const aCycle = getRentCycleDisplay(a)
    const bCycle = getRentCycleDisplay(b)
    return aCycle.sortKey - bCycle.sortKey
  })
}

export function getPropertyCardClassName(prop: PropertyLike): string {
  const tone = getRentCycleDisplay(prop).tone
  if (tone === 'expired') return 'pay-flow__property-card--expired'
  if (tone === 'ended') return 'pay-flow__property-card--ended'
  if (tone === 'soon') return 'pay-flow__property-card--due-soon'
  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatPendingInvoiceTitle(p: any): string {
  return p.property_address || p.company_name || p.description || 'Invoice'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPendingDueBadge(p: any): { label: string; overdue: boolean } | null {
  const dateStr = p.due_date || p.dueDate
  if (!dateStr) return null
  const overdue = new Date(dateStr) < new Date()
  if (overdue) return { label: 'Overdue', overdue: true }
  return {
    label: `Due ${new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`,
    overdue: false,
  }
}
