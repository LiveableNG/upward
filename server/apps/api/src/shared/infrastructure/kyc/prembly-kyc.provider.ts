import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IKycProvider,
  KycType,
  KycUserData,
  KycVerificationResult,
} from '../../../domains/kyc/kyc-provider.interface'

@Injectable()
export class PremblyKycProvider implements IKycProvider {
  private readonly logger = new Logger(PremblyKycProvider.name)
  private readonly apiKey: string
  private readonly appId: string
  private readonly baseUrl: string

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PREMBLY_API_KEY') || ''
    this.appId = this.configService.get<string>('PREMBLY_APP_ID') || ''
    this.baseUrl = (
      this.configService.get<string>('PREMBLY_BASE_URL') || 'https://api.prembly.com'
    ).replace(/\/$/, '')
  }

  async verify(
    idType: KycType,
    idNumber: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expectedUser?: KycUserData,
  ): Promise<KycVerificationResult> {
    const cleanedNumber = idNumber.replace(/\D/g, '')
    if (cleanedNumber.length !== 11) {
      return {
        success: false,
        message: `${idType} must be exactly 11 digits.`,
        idType,
        provider: 'PREMBLY',
      }
    }

    if (!this.apiKey || !this.appId) {
      this.logger.error('Prembly API credentials (PREMBLY_API_KEY or PREMBLY_APP_ID) are missing')
      return {
        success: false,
        message: 'KYC provider credentials not configured',
        idType,
        provider: 'PREMBLY',
      }
    }

    const endpoint =
      idType === 'BVN'
        ? `${this.baseUrl}/identitypass/verification/bvn`
        : `${this.baseUrl}/identitypass/verification/nin`

    try {
      this.logger.log(`Initiating ${idType} verification with Prembly API`)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'app-id': this.appId,
        },
        body: JSON.stringify({ number: cleanedNumber }),
      })

      const data = await res.json()
      if (!res.ok || !data.status) {
        this.logger.warn(
          `Prembly ${idType} verification failed: ${res.status} - ${data.message || JSON.stringify(data)}`,
        )
        return {
          success: false,
          message: data.message || `Failed to verify ${idType} with identity provider`,
          idType,
          provider: 'PREMBLY',
          rawResponse: data,
        }
      }

      const returned = data.data || {}
      const firstName = returned.firstName || returned.firstname || returned.first_name || ''
      const lastName = returned.lastName || returned.surname || returned.last_name || ''
      const dateOfBirth = returned.dateOfBirth || returned.birthdate || returned.dob || ''
      const phone = returned.phoneNumber || returned.telephoneno || returned.phone || ''

      return {
        success: true,
        message: `${idType} verified successfully via Prembly`,
        idType,
        firstName,
        lastName,
        dateOfBirth,
        phone,
        provider: 'PREMBLY',
        providerReference: data.reference || data.verification_id,
        rawResponse: data,
      }
    } catch (error: any) {
      this.logger.error(`Error during Prembly ${idType} verification:`, error)
      return {
        success: false,
        message: 'Network error communicating with identity verification provider',
        idType,
        provider: 'PREMBLY',
      }
    }
  }
}
