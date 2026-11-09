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

    if (!this.apiKey) {
      this.logger.error('Prembly API credential (PREMBLY_API_KEY) is missing')
      return {
        success: false,
        message: 'KYC provider credentials not configured',
        idType,
        provider: 'PREMBLY',
      }
    }

    // Determine target service name according to Prembly Option B: Verification Services REST API
    // https://docs.prembly.com/guides/products/verification/kyc#option-b-verification-services-rest-api
    const serviceName = idType.toLowerCase() // 'bvn' | 'nin' | 'vnin'
    const primaryUrl = `${this.baseUrl}/api/v1/verification/api/${serviceName}/`
    const fallbackUrl = `${this.baseUrl}/verification/${serviceName}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    }
    if (this.appId) {
      headers['app-id'] = this.appId
    }

    // Pass standard Option B schema with legacy fallbacks for maximum resilience
    const payload: Record<string, any> = {
      id_number: cleanedNumber,
      number: cleanedNumber,
      bvn: cleanedNumber,
      number_nin: cleanedNumber,
      nin: cleanedNumber,
    }

    if (expectedUser?.firstName) {
      payload['first_name'] = expectedUser.firstName
    }
    if (expectedUser?.lastName) {
      payload['last_name'] = expectedUser.lastName
    }
    if (expectedUser?.dateOfBirth) {
      payload['dob'] = expectedUser.dateOfBirth
    }

    try {
      this.logger.log(`Initiating ${idType} verification with Prembly Verification Services API`)
      let res = await fetch(primaryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      // If primary Option B route returns 404, fall back to root /verification/{service_name}
      if (res.status === 404) {
        this.logger.warn(
          `Primary Prembly endpoint 404'd (${primaryUrl}), attempting fallback route: ${fallbackUrl}`,
        )
        res = await fetch(fallbackUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json().catch(() => ({}))

      // Prembly standard response codes from KYC guide:
      // "00": Success (matched and retrieved from authoritative registry)
      // "01": Not Found (ID number does not exist in national registry)
      // "02": Service Unavailable (upstream registry down)
      const responseCode = data.response_code || data.code || ''
      const isSuccess =
        data.status === true ||
        data.status === 'VERIFIED' ||
        data.status === 'success' ||
        responseCode === '00'

      if (!res.ok || !isSuccess) {
        let failureMessage = data.message || data.detail || `Failed to verify ${idType}`
        if (responseCode === '01') {
          failureMessage = `The provided ${idType} (${cleanedNumber}) was not found in the official registry.`
        } else if (responseCode === '02') {
          failureMessage = `The official ${idType} registry is temporarily unavailable. Please try again in a few moments.`
        }

        this.logger.warn(
          `Prembly ${idType} verification unsuccessful [${res.status} | code: ${responseCode}]: ${failureMessage}`,
        )
        return {
          success: false,
          message: failureMessage,
          idType,
          provider: 'PREMBLY',
          rawResponse: data,
        }
      }

      // Demographic data extraction across Prembly response shapes
      const returned = data.data || data.nin_data || data.bvn_data || data
      const firstName = returned.first_name || returned.firstName || returned.firstname || ''
      const lastName = returned.last_name || returned.lastName || returned.surname || ''
      const dateOfBirth =
        returned.dob || returned.date_of_birth || returned.dateOfBirth || returned.birthdate || ''
      const phone =
        returned.phone_number ||
        returned.phoneNumber ||
        returned.phoneNumber1 ||
        returned.telephoneno ||
        returned.phone ||
        ''
      const gender = returned.gender || ''

      // Biometric passport portrait extraction (Base64 JPEG/PNG)
      const rawPhoto =
        returned.photo ||
        returned.image ||
        returned.base64Image ||
        returned.bvn_image ||
        data.photo ||
        data.image ||
        ''
      const photo = typeof rawPhoto === 'string' ? rawPhoto : ''

      return {
        success: true,
        message: `${idType} verified successfully via Prembly`,
        idType,
        firstName,
        lastName,
        dateOfBirth,
        phone,
        gender,
        photo,
        provider: 'PREMBLY',
        providerReference: data.reference || data.verification_id || returned.reference,
        rawResponse: data,
      }
    } catch (error: any) {
      this.logger.error(`Error during Prembly ${idType} verification:`, error)
      return {
        success: false,
        message: 'Network error communicating with Prembly identity verification provider',
        idType,
        provider: 'PREMBLY',
      }
    }
  }
}
