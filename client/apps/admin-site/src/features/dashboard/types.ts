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
}

export interface SignedUpRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  isWaitlist: boolean
  totalPaid: number
  hasPaid: boolean
}

export interface InvitedRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID'
  totalPaid: number
  pmName: string
  pmUuid: string | null
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
}
