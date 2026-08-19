export interface WaitlistRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  converted: boolean
  totalPaid: number
  pmName?: string
  pmUuid?: string | string[]
  pms?: Array<{ uuid: string; name: string; propertyAddress?: string }>
}

export interface SignedUpRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  joinedAt?: string | null
  isWaitlist: boolean
  totalPaid: number
  hasPaid: boolean
  benefitsPaid?: number
  hasPaidBenefits?: boolean
  pmName?: string
  pmUuid?: string | string[]
  rentExpiryDate?: string
  originType?: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  origin?: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  hasPassword?: boolean
  pms?: Array<{ uuid: string; name: string; propertyAddress?: string }>
}

export interface InvitedRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  invitedAt?: string | null
  joinedAt?: string | null
  status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID'
  totalPaid: number
  rentExpiryDate?: string
  pmName?: string
  pmUuid?: string | string[] | null
  originType?: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  origin?: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE'
  hasPassword?: boolean
  pms?: Array<{ uuid: string; name: string; propertyAddress?: string }>
  benefitsPaid?: number
  hasPaidBenefits?: boolean
  failureReason?: string
}

export interface PmRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone: string
  isVerified: boolean
  propertiesCount: number
  unitsCount: number
  totalGenerated: number
  createdAt: string
  pmType?: string
  mergedUuids?: string[]
}

export interface FeeOverride {
  id: number
  targetType: string
  targetId: string
  fee: number
  createdAt: string
  targetName?: string
}

export interface MetricsSummary {
  waitlist: {
    total: number
    converted: number
    totalPaid: number
  }
  signedUp: {
    total: number
    paying: number
    totalPaid: number
  }
  invited: {
    pending: number
    onboarded: number
    guestPaid: number
    onboardedPaid: number
    guestTotalPaid: number
    onboardedTotalPaid: number
    total: number
  }
  sources: {
    pmCount: number
    platformCount: number
  }
  revenue: {
    totalUpwardFees: number
    totalBenefitsFees: number
    totalRentProcessed: number
  }
  activeUsers?: {
    activeCount: number
    totalUsers: number
    inactiveCount: number
    activeRate: number
    totalUsersWithPassword: number
  }
}

export interface ActiveUsersMetric {
  activeCount: number
  totalUsers: number
  inactiveCount: number
  activeRate: number
}

export interface LoginSession {
  id: string
  userId: number
  userUuid: string
  userName: string
  userEmail: string
  userRole: string
  userAgent: string | null
  ipAddress: string | null
  deviceId: string | null
  isRevoked: boolean
  createdAt: string
  expiresAt: string
  country: string
  city: string
}

/**
 * Flat helper derived from MetricsSummary for convenience in display components.
 * Call flattenMetrics(metrics) to produce this shape.
 */
export interface FlatMetrics {
  waitlistCount: number
  waitlistConverted: number     // waitlist entrants who converted to registered accounts
  signedUpCount: number         // self-registered + waitlist converts (excludes invited)
  invitedOnboardedCount: number // invited tenants who completed sign-up (INVITED_SIGNED_UP + SIGNED_UP_PAID)
  totalAccountsCreated: number  // signedUpCount + invitedOnboardedCount — all accounts across every channel
  pmCount: number
  invitedCount: number
  totalRentProcessed: number
  feeRevenue: number
  benefitsRevenue: number
  activeCount: number
  inactiveCount: number
  activeRate: number
  totalUsersWithPassword: number
  emailLogsSummary?: {
    totalSent: number
    totalOpened: number
    totalNotOpened: number
    openRate: number
    bySubject: Array<{
      subject: string
      sent: number
      opened: number
      notOpened: number
      openRate: number
    }>
  }
  activitySessionsCount?: number
}

export function flattenMetrics(m: MetricsSummary): FlatMetrics {
  // invited.onboarded = INVITED_SIGNED_UP, invited.onboardedPaid = SIGNED_UP_PAID
  const invitedOnboardedCount = m.invited.onboarded + m.invited.onboardedPaid
  return {
    waitlistCount: m.waitlist.total,
    waitlistConverted: m.waitlist.converted,
    signedUpCount: m.signedUp.total,
    invitedOnboardedCount,
    totalAccountsCreated: m.signedUp.total + invitedOnboardedCount,
    pmCount: m.sources.pmCount,
    invitedCount: m.invited.total,
    totalRentProcessed: m.revenue.totalRentProcessed,
    feeRevenue: m.revenue.totalUpwardFees,
    benefitsRevenue: m.revenue.totalBenefitsFees,
    activeCount: m.activeUsers?.activeCount ?? 0,
    inactiveCount: m.activeUsers?.inactiveCount ?? 0,
    activeRate: m.activeUsers?.activeRate ?? 0,
    totalUsersWithPassword: m.activeUsers?.totalUsersWithPassword ?? 0,
    emailLogsSummary: (m as any).emailLogsSummary,
    activitySessionsCount: (m as any).activitySessionsCount,
  }
}
