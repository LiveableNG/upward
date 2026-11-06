import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import * as crypto from 'crypto'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { IKycProvider, KYC_PROVIDER, KycType } from '../../../domains/kyc/kyc-provider.interface'
import { IKycRepository, KYC_REPOSITORY } from '../../../domains/kyc/kyc.repository'
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository'

export class VerifyKycDto {
  type!: KycType
  idNumber!: string
}

function cleanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function checkNameMatch(
  userFirst: string,
  userLast: string,
  provFirst: string,
  provLast: string,
): boolean {
  const uf = cleanName(userFirst)
  const ul = cleanName(userLast)
  const pf = cleanName(provFirst)
  const pl = cleanName(provLast)

  if (!uf || !ul || !pf || !pl) return false

  // Direct match or swapped first/last name
  if ((uf === pf && ul === pl) || (uf === pl && ul === pf)) {
    return true
  }

  // Handle compound/middle names (e.g., "John Michael" vs "John")
  const userFull = `${uf} ${ul}`
  const provFull = `${pf} ${pl}`
  if (
    (provFull.includes(uf) && provFull.includes(ul)) ||
    (userFull.includes(pf) && userFull.includes(pl))
  ) {
    return true
  }

  return false
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  }

  // DD-MMM-YYYY (e.g., 18-DEC-1991)
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-')
    const day = parseInt(parts[0]!, 10)
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    }
    const monthStr = parts[1]!.toLowerCase()
    const month = months[monthStr]
    const year = parseInt(parts[2]!, 10)
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      const d = new Date(year, month, day)
      return isNaN(d.getTime()) ? null : d
    }
  }

  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function datesMatch(d1Str: string | null | undefined, d2Str: string | null | undefined): boolean {
  const d1 = parseDate(d1Str)
  const d2 = parseDate(d2Str)
  if (!d1 || !d2) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function hashId(idNumber: string): string {
  return crypto.createHash('sha256').update(idNumber.trim()).digest('hex')
}

function maskId(idNumber: string): string {
  const clean = idNumber.trim()
  if (clean.length < 4) return '****'
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`
}

@Injectable()
export class VerifyKycUseCase {
  private readonly logger = new Logger(VerifyKycUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(KYC_PROVIDER) private readonly kycProvider: IKycProvider,
    @Inject(KYC_REPOSITORY) private readonly kycRepository: IKycRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(userUuid: string, dto: VerifyKycDto) {
    const idType = dto.type || 'BVN'
    const idNumber = (dto.idNumber || '').replace(/\D/g, '')

    if (!idNumber || idNumber.length !== 11) {
      throw new BadRequestException(`Invalid ${idType}. Must be exactly 11 numeric digits.`)
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user || !user.id) {
      throw new NotFoundException('User not found')
    }

    const idNumberHash = hashId(idNumber)
    const idNumberMasked = maskId(idNumber)

    // Check if user has already completed KYC verification
    const existingUserKyc = await this.kycRepository.findByUserId(user.id)
    const activeVerifiedRecord = existingUserKyc.find((k) => k.status === 'VERIFIED')
    if (user.isIdentityVerified && activeVerifiedRecord) {
      this.logger.log(
        `User ID: ${user.id} is already verified with ${activeVerifiedRecord.idType}. Skipping duplicate KYC.`,
      )
      return {
        success: true,
        message: 'Your identity has already been verified.',
        alreadyVerified: true,
        idType: activeVerifiedRecord.idType,
        maskedId: activeVerifiedRecord.idNumberMasked,
      }
    }

    // Anti-fraud: Verify this ID number is not already verified by another user
    const existingVerified = await this.kycRepository.findVerifiedByHash(idNumberHash)
    if (existingVerified && existingVerified.userId !== user.id) {
      this.logger.warn(
        `Fraud detection: ${idType} hash collision for user ID ${user.id} against user ID ${existingVerified.userId}`,
      )
      throw new BadRequestException(
        `This ${idType} is already linked to another verified account. Please contact support.`,
      )
    }

    this.logger.log(`Initiating ${idType} verification for user ID: ${user.id} (UUID: ${userUuid})`)

    const verificationResult = await this.kycProvider.verify(idType, idNumber, {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      phone: user.phone,
    })

    if (!verificationResult.success) {
      this.logger.warn(
        `KYC provider returned failure for user ID ${user.id}: ${verificationResult.message}`,
      )
      await this.kycRepository.create({
        uuid: crypto.randomUUID(),
        userId: user.id,
        idType,
        idNumberHash,
        idNumberMasked,
        provider: verificationResult.provider,
        status: 'FAILED',
        failureReason: verificationResult.message,
        metadata: verificationResult.rawResponse || {},
      })

      return {
        success: false,
        message: verificationResult.message || 'Verification failed with identity provider',
      }
    }

    // Biographical cross-check
    const returnedFirst = verificationResult.firstName || ''
    const returnedLast = verificationResult.lastName || ''
    const returnedDob = verificationResult.dateOfBirth || ''

    const nameMatched = checkNameMatch(user.firstName, user.lastName, returnedFirst, returnedLast)
    const dobProvidedOnAccount = !!user.dateOfBirth
    const dobMatched = !dobProvidedOnAccount || datesMatch(user.dateOfBirth, returnedDob)

    if (!nameMatched || !dobMatched) {
      this.logger.warn(
        `KYC details mismatch for user ID: ${user.id}. ` +
          `User: ${user.firstName} ${user.lastName} (${user.dateOfBirth || 'No DOB'}). ` +
          `Provider: ${returnedFirst} ${returnedLast} (${returnedDob})`,
      )

      let mismatchReason = ''
      if (!nameMatched && !dobMatched) {
        mismatchReason = `Both Name and Date of Birth do not match your ${idType} records.`
      } else if (!nameMatched) {
        mismatchReason = `The names on your Upward account (${user.firstName} ${user.lastName}) do not match the ones registered under this ${idType} (${returnedFirst} ${returnedLast}).`
      } else {
        mismatchReason = `The Date of Birth on your Upward account does not match the one registered under this ${idType}.`
      }

      await this.kycRepository.create({
        uuid: crypto.randomUUID(),
        userId: user.id,
        idType,
        idNumberHash,
        idNumberMasked,
        provider: verificationResult.provider,
        status: 'FAILED',
        failureReason: mismatchReason,
        metadata: {
          returnedFirst,
          returnedLast,
          returnedDob,
          raw: verificationResult.rawResponse,
        },
      })

      return {
        success: false,
        message: mismatchReason,
      }
    }

    // Extract gender from provider response if available
    const rawGender =
      verificationResult.rawResponse?.gender || verificationResult.rawResponse?.data?.gender || null
    const normalizedGender = rawGender
      ? rawGender.toUpperCase().startsWith('M')
        ? 'Male'
        : rawGender.toUpperCase().startsWith('F')
          ? 'Female'
          : null
      : null

    // Success: Mark user as verified
    await this.userRepository.update(user.id, {
      isIdentityVerified: true,
      // If user had no DOB set, populate with verified DOB
      ...(user.dateOfBirth ? {} : returnedDob ? { dateOfBirth: returnedDob } : {}),
      // If user had no gender set, populate with verified gender
      ...(user.gender ? {} : normalizedGender ? { gender: normalizedGender } : {}),
    })

    // Store verified audit record
    await this.kycRepository.create({
      uuid: crypto.randomUUID(),
      userId: user.id,
      idType,
      idNumberHash,
      idNumberMasked,
      provider: verificationResult.provider,
      status: 'VERIFIED',
      matchScore: 1.0,
      verifiedAt: new Date(),
      metadata: {
        providerReference: verificationResult.providerReference,
        provider: verificationResult.provider,
        rawResponse: verificationResult.rawResponse || {},
      },
    })

    // If verified with BVN, sync customer verification to Paystack for seamless DVA wallet creation
    if (idType === 'BVN' && this.paymentGateway.validateCustomerIdentification) {
      try {
        const paystackCustomerCode = await this.paymentGateway.createCustomer({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || undefined,
        })

        if (paystackCustomerCode) {
          await this.paymentGateway.validateCustomerIdentification({
            customerCode: paystackCustomerCode,
            type: 'bvn',
            value: idNumber,
            firstName: user.firstName,
            lastName: user.lastName,
          })
          this.logger.log(
            `Paystack customer identification synced for customer ${paystackCustomerCode}`,
          )
        }
      } catch (err: any) {
        // Non-blocking: failure to sync identification to Paystack should not fail user KYC completion
        this.logger.warn(
          `Failed to sync Paystack identification for user ID ${user.id}: ${err.message}`,
        )
      }
    }

    this.logger.log(`User ID: ${user.id} successfully verified with ${idType}.`)
    return {
      success: true,
      message: `${idType} identity verified successfully!`,
    }
  }
}
