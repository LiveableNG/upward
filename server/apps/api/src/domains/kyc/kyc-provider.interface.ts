export type KycType = 'BVN' | 'NIN' | 'VNIN'

export interface KycUserData {
  firstName: string
  lastName: string
  dateOfBirth?: string | null
  phone?: string | null
}

export interface KycVerificationResult {
  success: boolean
  message: string
  idType: KycType
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  phone?: string
  provider: string
  providerReference?: string
  rawResponse?: Record<string, any>
}

export interface IKycProvider {
  verify(
    idType: KycType,
    idNumber: string,
    expectedUser?: KycUserData,
  ): Promise<KycVerificationResult>
}

export const KYC_PROVIDER = Symbol('KYC_PROVIDER')
