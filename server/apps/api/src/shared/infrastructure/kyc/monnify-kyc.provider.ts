import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IKycProvider,
  KycType,
  KycUserData,
  KycVerificationResult,
} from '../../../domains/kyc/kyc-provider.interface'

interface MonnifyAuthResponse {
  requestSuccessful: boolean
  responseMessage: string
  responseCode: string
  responseBody?: {
    accessToken: string
    expiresIn: number
  }
}

interface MonnifyBvnResponse {
  requestSuccessful: boolean
  responseMessage: string
  responseCode: string
  responseBody?: {
    bvn?: string
    firstName?: string
    middleName?: string
    lastName?: string
    dateOfBirth?: string
    mobileNumber?: string
    gender?: string
    image?: string
    nameMatchPercentage?: number
    [key: string]: any
  }
}

@Injectable()
export class MonnifyKycProvider implements IKycProvider {
  private readonly logger = new Logger(MonnifyKycProvider.name)
  private readonly apiKey: string
  private readonly secretKey: string
  private readonly baseUrl: string

  private cachedToken: string | null = null
  private tokenExpiresAt: Date | null = null

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MONNIFY_API_KEY') || ''
    this.secretKey = this.configService.get<string>('MONNIFY_SECRET_KEY') || ''
    this.baseUrl = (
      this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com'
    ).replace(/\/$/, '')
  }

  /**
   * Retrieves or refreshes the Monnify Bearer token
   */
  private async getValidToken(): Promise<string> {
    const now = new Date()
    if (
      this.cachedToken &&
      this.tokenExpiresAt &&
      this.tokenExpiresAt.getTime() - now.getTime() > 60_000
    ) {
      return this.cachedToken
    }

    if (!this.apiKey || !this.secretKey) {
      throw new Error('Monnify API credentials (MONNIFY_API_KEY or MONNIFY_SECRET_KEY) are missing')
    }

    const credentialsBase64 = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64')
    this.logger.log(`Authenticating with Monnify API (${this.baseUrl})...`)

    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentialsBase64}`,
        'Content-Type': 'application/json',
      },
    })

    const data = (await res.json()) as MonnifyAuthResponse
    if (!res.ok || !data.requestSuccessful || !data.responseBody?.accessToken) {
      this.logger.error(`Monnify authentication failed: ${JSON.stringify(data)}`)
      throw new Error(data.responseMessage || 'Failed to authenticate with Monnify API')
    }

    this.cachedToken = data.responseBody.accessToken
    // Expire 2 minutes before stated lifespan
    const ttlMs = Math.max(300, (data.responseBody.expiresIn || 3600) - 120) * 1000
    this.tokenExpiresAt = new Date(now.getTime() + ttlMs)
    return this.cachedToken
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
        provider: 'MONNIFY',
      }
    }

    // Fallback in local development if credentials not yet configured
    if (!this.apiKey || !this.secretKey) {
      const isDev = (this.configService.get<string>('NODE_ENV') || 'development') === 'development'
      if (isDev) {
        this.logger.warn(
          '[MonnifyKycProvider] No Monnify credentials configured; falling back to simulated verification in dev.',
        )
        return {
          success: true,
          message: `${idType} verified successfully (Monnify Sandbox Simulation)`,
          idType,
          firstName: expectedUser?.firstName || 'Test',
          lastName: expectedUser?.lastName || 'User',
          dateOfBirth: expectedUser?.dateOfBirth || '1995-01-01',
          phone: expectedUser?.phone || '08012345678',
          provider: 'MONNIFY',
          providerReference: `monnify-sim-${Date.now()}`,
          rawResponse: {
            requestSuccessful: true,
            responseBody: {
              bvn: cleanedNumber,
              firstName: expectedUser?.firstName || 'Test',
              lastName: expectedUser?.lastName || 'User',
              dateOfBirth: expectedUser?.dateOfBirth || '1995-01-01',
              gender: 'MALE',
              image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
            },
          },
        }
      }

      this.logger.error(
        'Monnify API credentials (MONNIFY_API_KEY or MONNIFY_SECRET_KEY) are missing',
      )
      return {
        success: false,
        message: 'KYC provider credentials not configured',
        idType,
        provider: 'MONNIFY',
      }
    }

    try {
      const token = await this.getValidToken()
      this.logger.log(`Initiating ${idType} verification with Monnify API`)

      // Monnify BVN details match endpoint
      const endpoint =
        idType === 'BVN'
          ? `${this.baseUrl}/api/v1/vas/bvn-details-match`
          : `${this.baseUrl}/api/v1/vas/nin-details`

      const fullName = expectedUser
        ? `${expectedUser.firstName || ''} ${expectedUser.lastName || ''}`.trim()
        : undefined

      const payload =
        idType === 'BVN'
          ? {
              bvn: cleanedNumber,
              name: fullName || undefined,
              dateOfBirth: expectedUser?.dateOfBirth || undefined,
              mobileNo: expectedUser?.phone || undefined,
            }
          : {
              nin: cleanedNumber,
            }

      let res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      // If details-match returns 404 or unsupported, fallback to basic BVN details endpoint
      if (!res.ok && res.status === 404 && idType === 'BVN') {
        this.logger.log(`Retrying with /api/v1/vas/bvn-details fallback...`)
        res = await fetch(`${this.baseUrl}/api/v1/vas/bvn-details`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bvn: cleanedNumber }),
        })
      }

      const data = (await res.json()) as MonnifyBvnResponse
      if (!res.ok || !data.requestSuccessful || !data.responseBody) {
        this.logger.warn(
          `Monnify ${idType} verification failed: ${res.status} - ${data.responseMessage || JSON.stringify(data)}`,
        )
        return {
          success: false,
          message: data.responseMessage || `Failed to verify ${idType} with identity provider`,
          idType,
          provider: 'MONNIFY',
          rawResponse: data,
        }
      }

      const body = data.responseBody
      const firstName = body.firstName || ''
      const lastName = body.lastName || ''
      const dateOfBirth = body.dateOfBirth || ''
      const phone = body.mobileNumber || ''

      return {
        success: true,
        message: `${idType} verified successfully via Monnify`,
        idType,
        firstName,
        lastName,
        dateOfBirth,
        phone,
        provider: 'MONNIFY',
        providerReference: body.bvn || `monnify-${Date.now()}`,
        rawResponse: body,
      }
    } catch (error: any) {
      this.logger.error(`Error during Monnify ${idType} verification:`, error)
      return {
        success: false,
        message: error.message || 'Network error communicating with identity verification provider',
        idType,
        provider: 'MONNIFY',
      }
    }
  }
}
