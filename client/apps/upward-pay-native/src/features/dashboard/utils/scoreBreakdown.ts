import { type ScorePaymentCycle, type ScoreProfileData } from '@/features/dashboard/types'

export function sortCyclesNewestFirst(cycles: ScorePaymentCycle[]): ScorePaymentCycle[] {
  return [...cycles].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
}

export function computeScoreVerification(data: ScoreProfileData): boolean {
  const cycles = data.cycles ?? []
  const properties = data.properties ?? []
  const profile = data.profile

  const paidPaymentsCount = cycles.filter(
    (c) => c.status && (c.status.includes('PAID') || c.status.includes('PARTIAL')),
  ).length

  const hasVerifiedPmProperty = properties.some(
    (p) =>
      p.isVerified &&
      (p.isPmVerified || p.isPlatformLinked || p.pm?.isVerified || !!p.company?.platformId),
  )

  const verificationOn = profile?.verificationOn ?? true
  const isVerified =
    ((verificationOn === false || !!profile?.isIdentityVerified) &&
      paidPaymentsCount > 0 &&
      hasVerifiedPmProperty) ||
    properties.some((p) => p.isVerified)

  return isVerified
}

export function statusColor(status: string): string {
  if (status === 'PAID_ON_TIME' || status === 'PAID_BEFORE_DUE') return '#C2501F'
  if (status === 'PAID_LATE' || status === 'PARTIAL_LATE' || status === 'MISSED') return '#dc2626'
  if (status === 'PENDING') return '#d97706'
  return '#928e89'
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

export type CycleImpact = 'positive' | 'neutral' | 'negative' | 'none'

export function cycleImpact(cycle: ScorePaymentCycle): CycleImpact {
  if (cycle.excluded) return 'none'
  if (cycle.status === 'PAID_ON_TIME') return 'positive'
  if (cycle.status === 'PARTIAL_ON_TIME') return 'neutral'
  if (
    cycle.status === 'PAID_LATE' ||
    cycle.status === 'PARTIAL_LATE' ||
    cycle.status === 'MISSED'
  ) {
    return 'negative'
  }
  const pt = cycle.ptValue ?? 0
  if (pt >= 0.85) return 'positive'
  if (pt > 0) return 'neutral'
  return 'negative'
}

export function impactLabel(impact: CycleImpact): string {
  switch (impact) {
    case 'positive':
      return 'Positive'
    case 'neutral':
      return 'Neutral'
    case 'negative':
      return 'Negative'
    default:
      return 'No impact'
  }
}
