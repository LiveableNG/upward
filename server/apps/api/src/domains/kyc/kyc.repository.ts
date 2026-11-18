import { KycType } from './kyc-provider.interface'

export interface KycVerificationRecord {
  id?: number
  uuid: string
  userId: number
  idType: KycType
  idNumberHash: string
  idNumberMasked: string
  provider: string
  status: 'VERIFIED' | 'FAILED' | 'PENDING'
  matchScore?: number | null
  failureReason?: string | null
  metadata?: Record<string, any> | null
  verifiedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export interface IKycRepository {
  create(
    data: Omit<KycVerificationRecord, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: any,
  ): Promise<KycVerificationRecord>
  findByHash(idNumberHash: string, tx?: any): Promise<KycVerificationRecord | null>
  findVerifiedByHash(idNumberHash: string, tx?: any): Promise<KycVerificationRecord | null>
  findByUserId(userId: number, tx?: any): Promise<KycVerificationRecord[]>
  findLatestVerifiedByUserId(userId: number, tx?: any): Promise<KycVerificationRecord | null>
}

export const KYC_REPOSITORY = Symbol('KYC_REPOSITORY')
