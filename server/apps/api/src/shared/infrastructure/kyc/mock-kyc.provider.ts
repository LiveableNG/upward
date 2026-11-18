import { Injectable, Logger } from '@nestjs/common'
import {
  IKycProvider,
  KycType,
  KycUserData,
  KycVerificationResult,
} from '../../../domains/kyc/kyc-provider.interface'

@Injectable()
export class MockKycProvider implements IKycProvider {
  private readonly logger = new Logger(MockKycProvider.name)

  async verify(
    idType: KycType,
    idNumber: string,
    expectedUser?: KycUserData,
  ): Promise<KycVerificationResult> {
    this.logger.log(`[MockKycProvider] Simulating ${idType} verification for ID: ${idNumber}`)

    // 1. Validate ID format
    const cleanedId = idNumber.replace(/\D/g, '')
    if (cleanedId.length !== 11) {
      return {
        success: false,
        message: `${idType} must be exactly 11 digits.`,
        idType,
        provider: 'MOCK',
      }
    }

    // 2. Deterministic test vectors:
    // "00000000000" -> Provider network/service failure
    if (cleanedId === '00000000000') {
      this.logger.warn(`[MockKycProvider] Triggered simulated provider outage for ID: ${cleanedId}`)
      return {
        success: false,
        message: 'Identity verification provider is currently unreachable. Please try again later.',
        idType,
        provider: 'MOCK',
      }
    }

    // "22222222222" -> Name Mismatch simulation
    if (cleanedId === '22222222222') {
      this.logger.log(`[MockKycProvider] Triggered simulated name mismatch for ID: ${cleanedId}`)
      return {
        success: true,
        message: 'Mock verification record retrieved',
        idType,
        firstName: 'UnmatchedFirst',
        lastName: 'UnmatchedLast',
        dateOfBirth: expectedUser?.dateOfBirth || '1995-05-15',
        phone: expectedUser?.phone || '08012345678',
        provider: 'MOCK',
        providerReference: `mock-ref-${Date.now()}`,
      }
    }

    // "33333333333" -> DOB Mismatch simulation
    if (cleanedId === '33333333333') {
      this.logger.log(`[MockKycProvider] Triggered simulated DOB mismatch for ID: ${cleanedId}`)
      return {
        success: true,
        message: 'Mock verification record retrieved',
        idType,
        firstName: expectedUser?.firstName || 'John',
        lastName: expectedUser?.lastName || 'Doe',
        dateOfBirth: '1970-01-01',
        phone: expectedUser?.phone || '08012345678',
        provider: 'MOCK',
        providerReference: `mock-ref-${Date.now()}`,
      }
    }

    // Default test vector (11111111111 or any valid 11-digit) -> Successful match
    this.logger.log(`[MockKycProvider] Successful mock verification for ID: ${cleanedId}`)
    return {
      success: true,
      message: `${idType} verified successfully (Mock Provider)`,
      idType,
      firstName: expectedUser?.firstName || 'John',
      lastName: expectedUser?.lastName || 'Doe',
      dateOfBirth: expectedUser?.dateOfBirth || '1995-01-01',
      phone: expectedUser?.phone || '08012345678',
      provider: 'MOCK',
      providerReference: `mock-ref-${Date.now()}`,
      rawResponse: {
        status: 'success',
        verified: true,
        channel: 'MOCK_SANDBOX',
      },
    }
  }
}
