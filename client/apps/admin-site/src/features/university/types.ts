export interface EarlyAccessRecord {
  id: string
  type: 'STUDENT' | 'LANDLORD'
  name: string
  whatsapp: string
  email?: string | null
  city: string
  ageBracket?: string | null
  experienceLevel?: string | null
  interest?: string | null
  propertyCount?: string | null
  landlordStatus?: string | null
  managementStyle?: string | null
  createdAt: string
  updatedAt: string
}

export interface UniversityApplicationRecord {
  id: string
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  occupation?: string | null
  experienceLevel?: string | null
  goals?: string | null
  commitment: string
  why: string
  timing?: string | null
  isScholarship?: boolean
  scholarshipVideoUrl?: string | null
  sessionTime?: string | null
  abVariant?: string | null
  status: 'SUBMITTED' | 'REVIEWED' | 'ADMITTED' | 'REJECTED' | 'FEE_PAID' | 'REFUNDED'
  applicationFee: number
  feeStatus: 'PENDING' | 'PAID' | 'REFUNDED'
  paymentRef?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface TrafficSourceRecord {
  id: string
  identifier: string
  name: string
  channel: string
  targetUrl: string
  description?: string | null
  totalViews: number
  uniqueViews: number
  conversions: number
  conversionRate: number
  isActive: boolean
  lastVisitedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AbVariantMetrics {
  name: string
  views: number
  uniqueViews: number
  earlyAccessCount: number
  applicationsCount: number
  paidApplicationsCount: number
  applicationConversionRate: number
  paidConversionRate: number
  totalRevenue: number
}

export interface TrafficStats {
  totalSources: number
  totalViews: number
  uniqueViews: number
  totalConversions: number
  overallConversionRate: number
  channelBreakdown: Array<{ channel: string; views: number; uniqueViews: number; conversions: number }>
  abTestStats?: {
    variantA: AbVariantMetrics
    variantB: AbVariantMetrics
  }
}

export interface TrafficVisitRecord {
  id: string
  sourceId?: string | null
  identifier: string
  visitorId: string
  sessionId: string
  ipHash?: string | null
  userAgent?: string | null
  referer?: string | null
  path: string
  isUnique: boolean
  createdAt: string
}

export interface UniversityReferralRecord {
  id: string
  referrerEarlyAccessId?: string | null
  referrerName: string
  referrerEmail?: string | null
  referrerPhone: string
  referredName?: string | null
  referredEmail?: string | null
  referredPhone?: string | null
  status: 'PENDING' | 'JOINED' | 'PAID' | 'INELIGIBLE'
  rewardPercentage: number
  rewardAmount?: number | null
  rewardStatus: 'PENDING' | 'APPROVED' | 'PAID'
  programFeePaid?: number | null
  paymentRef?: string | null
  joinedAt?: string | null
  emailSent: boolean
  emailSentAt?: string | null
  ineligibleReason?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface UniversityReferralStats {
  totalReferrals: number
  eligibleReferrals: number
  ineligibleReferrals: number
  joinedReferrals: number
  totalRewardAmountEarned: number
  totalRewardAmountPaid: number
}

export interface EarlyAccessStats {
  totalSubmissions: number
  studentCount: number
  landlordCount: number
  cityBreakdown: Array<{ city: string; count: number }>
}

export interface ApplicationStats {
  totalApplications: number
  pendingReviewCount: number
  admittedCount: number
  feePaidCount: number
}

export interface UniversityHireRequestRecord {
  id: string
  companyName: string
  contactName: string
  contactRole?: string | null
  email: string
  phone: string
  industry: string
  city: string
  placementType: string
  rolesNeeded: string[]
  openingsCount: string
  compensationType?: string | null
  startDate?: string | null
  jobDescription?: string | null
  sourceIdentifier?: string | null
  abVariant?: string | null
  status: 'PENDING' | 'CONTACTED' | 'MATCHED' | 'CLOSED' | string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface UniversityHireRequestStats {
  totalRequests: number
  pendingRequests: number
  contactedRequests: number
  matchedRequests: number
}

export type UniversityTab =
  | 'APPLICATIONS'
  | 'EARLY_ACCESS'
  | 'TRAFFIC'
  | 'REFERRALS'
  | 'HIRE_REQUESTS'

export interface DeleteTarget {
  id: string
  name: string
  type: 'APPLICATION' | 'EARLY_ACCESS' | 'TRAFFIC_SOURCE' | 'REFERRAL' | 'HIRE_REQUEST'
}

export interface CreateSourceFormData {
  name: string
  identifier: string
  channel: string
  targetUrl: string
  forcedVariant: 'AUTO' | 'A' | 'B'
  description: string
}

export interface EditReferralFormData {
  status: string
  rewardStatus: string
  programFeePaid: string | number
  rewardAmount: string | number
  rewardPercentage: number
  paymentRef: string
  notes: string
}

export interface UpwardUniversityProps {
  token: string
  adminRole?: string
}
