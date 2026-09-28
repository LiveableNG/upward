import { UniversityReferral } from './university-referral.entity'

export interface UniversityReferralFilterParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  rewardStatus?: string
}

export interface UniversityReferralStats {
  totalReferrals: number
  eligibleReferrals: number
  ineligibleReferrals: number
  joinedReferrals: number
  totalRewardAmountEarned: number
  totalRewardAmountPaid: number
}

export interface IUniversityReferralRepository {
  save(referral: UniversityReferral): Promise<UniversityReferral>
  saveMany(referrals: UniversityReferral[]): Promise<UniversityReferral[]>
  findById(id: string): Promise<UniversityReferral | null>
  findByReferredContact(email?: string | null, phone?: string | null): Promise<UniversityReferral | null>
  checkInInfoList(email?: string | null, phone?: string | null): Promise<boolean>
  findByReferrer(phone: string, email?: string | null): Promise<UniversityReferral[]>
  findAll(params: UniversityReferralFilterParams): Promise<{ data: UniversityReferral[]; total: number }>
  getStats(): Promise<UniversityReferralStats>
  update(referral: UniversityReferral): Promise<UniversityReferral>
  delete(id: string): Promise<void>
}

export const UNIVERSITY_REFERRAL_REPOSITORY = Symbol('UNIVERSITY_REFERRAL_REPOSITORY')
