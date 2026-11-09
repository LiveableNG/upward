import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'
import * as crypto from 'crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { IKycProvider, KYC_PROVIDER } from '../../../domains/kyc/kyc-provider.interface'
import { IKycRepository, KYC_REPOSITORY } from '../../../domains/kyc/kyc.repository'
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository'
import {
  IAssetManagementProvider,
  ASSET_MANAGEMENT_PROVIDER,
} from '../../../domains/rent-savings/asset-management.provider'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export class OnboardSavingsInvestorDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'BVN must be exactly 11 numeric digits' })
  bvn!: string

  @IsNotEmpty()
  @IsString()
  mothers_maiden_name!: string

  @IsNotEmpty()
  @IsString()
  occupation!: string

  @IsNotEmpty()
  @IsIn(['Salary', 'Business', 'Savings', 'Investment'])
  source_of_funds!: 'Salary' | 'Business' | 'Savings' | 'Investment'

  @IsOptional()
  @IsIn(['Below 500K', '500K-1M', '1M-5M', '5M-10M', 'Above 10M'])
  income_range?: string

  @IsNotEmpty()
  @IsString()
  next_of_kin_name!: string

  @IsNotEmpty()
  @IsIn(['Spouse', 'Parent', 'Sibling', 'Child', 'Other'])
  next_of_kin_relationship!: string

  @IsNotEmpty()
  @IsString()
  next_of_kin_phone!: string

  @IsOptional()
  @IsEmail()
  next_of_kin_email?: string

  @IsOptional()
  @IsString()
  next_of_kin_address?: string

  @IsNotEmpty()
  @IsString()
  settlement_bank_code!: string

  @IsNotEmpty()
  @IsString()
  settlement_account_number!: string

  @IsNotEmpty()
  @IsString()
  settlement_account_name!: string

  @IsOptional()
  @IsString()
  settlement_bank_name?: string
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
  if ((uf === pf && ul === pl) || (uf === pl && ul === pf)) return true

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

function maskId(idNumber: string): string {
  const clean = idNumber.trim()
  if (clean.length < 4) return '****'
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`
}

@Injectable()
export class OnboardSavingsInvestorUseCase {
  private readonly logger = new Logger(OnboardSavingsInvestorUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(KYC_PROVIDER) private readonly kycProvider: IKycProvider,
    @Inject(KYC_REPOSITORY) private readonly kycRepository: IKycRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    @Inject(ASSET_MANAGEMENT_PROVIDER)
    private readonly assetManagementProvider: IAssetManagementProvider,
  ) {}

  async execute(userId: number, dto: OnboardSavingsInvestorDto) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const cleanBvn = dto.bvn.replace(/\D/g, '')
    if (cleanBvn.length !== 11) {
      throw new BadRequestException('BVN must be exactly 11 numeric digits')
    }

    const bvnHash = this.encryption.hash(cleanBvn)
    const bvnMasked = maskId(cleanBvn)

    // Anti-fraud: Check if BVN is already verified under another account
    const existingVerified = await this.kycRepository.findVerifiedByHash(bvnHash)
    if (existingVerified && existingVerified.userId !== user.id) {
      this.logger.warn(
        `Fraud collision: BVN hash collision for user ID ${user.id} against user ID ${existingVerified.userId}`,
      )
      throw new BadRequestException(
        'This BVN is already linked to another verified account. Please contact support.',
      )
    }

    this.logger.log(`Executing identity verification via KYC provider for user ID ${user.id}...`)
    const verificationResult = await this.kycProvider.verify('BVN', cleanBvn, {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      phone: user.phone,
    })

    if (!verificationResult.success) {
      throw new BadRequestException(
        verificationResult.message || 'BVN verification failed with identity provider',
      )
    }

    // Name cross-matching
    const returnedFirst = verificationResult.firstName || ''
    const returnedLast = verificationResult.lastName || ''
    const returnedDob = verificationResult.dateOfBirth || ''

    const nameMatched = checkNameMatch(user.firstName, user.lastName, returnedFirst, returnedLast)
    if (!nameMatched) {
      throw new BadRequestException(
        `The names on your Upward account (${user.firstName} ${user.lastName}) do not match the legal name registered under this BVN (${returnedFirst} ${returnedLast}).`,
      )
    }

    // Extract biometric portrait photo from provider response (Monnify / Prembly)
    let photoBase64: string | undefined = undefined
    const rawRes = verificationResult.rawResponse || {}
    if (verificationResult.photo && typeof verificationResult.photo === 'string') {
      photoBase64 = verificationResult.photo.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.image && typeof rawRes.image === 'string') {
      photoBase64 = rawRes.image.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.data?.image && typeof rawRes.data?.image === 'string') {
      photoBase64 = rawRes.data.image.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.photo && typeof rawRes.photo === 'string') {
      photoBase64 = rawRes.photo.replace(/^data:image\/\w+;base64,/, '')
    }

    // Reversible AES-256 encryption for secure transmission
    const idNumberEncrypted = this.encryption.encrypt(cleanBvn)
    const mothersMaidenNameEnc = this.encryption.encrypt(dto.mothers_maiden_name.trim())

    // Update user record: Mark verified and sync biometrics
    const rawGender = verificationResult.gender || rawRes.gender || rawRes.data?.gender || null
    const normalizedGender = rawGender
      ? rawGender.toUpperCase().startsWith('M')
        ? 'Male'
        : rawGender.toUpperCase().startsWith('F')
          ? 'Female'
          : null
      : null

    await this.userRepository.update(userId, {
      isIdentityVerified: true,
      ...(user.dateOfBirth ? {} : returnedDob ? { dateOfBirth: returnedDob } : {}),
      ...(user.gender ? {} : normalizedGender ? { gender: normalizedGender } : {}),
    })

    // Upsert linked payout settlement bank details
    await this.prisma.upward_user_bank_details.upsert({
      where: { userId },
      create: {
        uuid: crypto.randomUUID(),
        userId,
        bankCode: dto.settlement_bank_code,
        bankName: dto.settlement_bank_name || 'Commercial Bank',
        accountNumber: dto.settlement_account_number,
        accountName: dto.settlement_account_name,
      },
      update: {
        bankCode: dto.settlement_bank_code,
        bankName: dto.settlement_bank_name || 'Commercial Bank',
        accountNumber: dto.settlement_account_number,
        accountName: dto.settlement_account_name,
      },
    })

    // Record verified investor KYC audit record
    await this.prisma.upward_kyc_verification.create({
      data: {
        uuid: crypto.randomUUID(),
        userId,
        idType: 'BVN',
        idNumberHash: bvnHash,
        idNumberMasked: bvnMasked,
        idNumberEncrypted,
        provider: verificationResult.provider,
        status: 'VERIFIED',
        matchScore: 1.0,
        verifiedAt: new Date(),
        metadata: rawRes,
        mothersMaidenNameEnc,
        occupation: dto.occupation.trim(),
        sourceOfFunds: dto.source_of_funds,
        incomeRange: dto.income_range || '1M-5M',
        riskAppetite: 'Conservative',
        nextOfKinName: dto.next_of_kin_name.trim(),
        nextOfKinRelationship: dto.next_of_kin_relationship,
        nextOfKinPhone: dto.next_of_kin_phone.trim(),
        nextOfKinEmail: dto.next_of_kin_email?.trim() || user.email,
        nextOfKinAddress: dto.next_of_kin_address?.trim() || 'Lagos, Nigeria',
        armSyncStatus: 'PENDING',
        armCompletedSections: 0,
      },
    })

    // Sync Customer to Paystack for DVA account generation
    if (this.paymentGateway.validateCustomerIdentification) {
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
            value: cleanBvn,
            firstName: user.firstName,
            lastName: user.lastName,
          })
          this.logger.log(
            `Paystack customer identification synced for customer ${paystackCustomerCode}`,
          )
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to sync Paystack identification for user ID ${user.id}: ${err.message}`,
        )
      }
    }

    // Dispatch all 6 sections (Bitmask 63) to ARM Connect
    if (this.assetManagementProvider.onboardInvestor) {
      try {
        this.logger.log(
          `Forwarding 6-section investor onboarding to ARM Connect for ${user.email}...`,
        )
        const armRes = await this.assetManagementProvider.onboardInvestor({
          customerEmail: user.email,
          personalDetails: {
            surname: user.lastName,
            firstName: user.firstName,
            dateOfBirth: user.dateOfBirth || returnedDob || '1995-01-01',
            gender: user.gender === 'Female' ? 'Female' : 'Male',
            nationality: 'Nigerian',
            occupation: dto.occupation,
            sourceOfFunds: dto.source_of_funds,
            annualExpectedIncomeRange: dto.income_range || '1M-5M',
            riskAppetite: 'Conservative',
            riskProfile: 'Balanced',
            mothersMaidenName: dto.mothers_maiden_name,
            mobilePhone: user.phone || dto.next_of_kin_phone,
          },
          address: {
            addressNumber: '1',
            streetName: dto.next_of_kin_address || 'Lagos',
            town: 'Lagos',
            residentialCountry: 'Nigeria',
            residentialStateCode: 'LA',
          },
          kycDetails: {
            bvn: cleanBvn,
            idType: 'NationalId',
            idNumber: cleanBvn,
          },
          bankDetails: {
            bankName: dto.settlement_bank_name || 'Commercial Bank',
            accountName: dto.settlement_account_name,
            accountNumber: dto.settlement_account_number,
            bankCode: dto.settlement_bank_code,
          },
          nextOfKin: {
            name: dto.next_of_kin_name,
            gender: 'Male',
            relationshipType: dto.next_of_kin_relationship,
            phone: dto.next_of_kin_phone,
            email: dto.next_of_kin_email || user.email,
            address: dto.next_of_kin_address || 'Lagos',
          },
          documents: photoBase64
            ? {
                passport: photoBase64,
                bvn_passport: photoBase64,
              }
            : undefined,
        })

        if (armRes && armRes.success) {
          await this.prisma.upward_kyc_verification.updateMany({
            where: { userId: user.id },
            data: {
              armCustomerMembershipId: armRes.customerMembershipId || null,
              armCrmAccountNumber: armRes.crmAccountNumber || null,
              armSyncStatus: armRes.status || 'Submitted',
              armCompletedSections: 63,
            },
          })
          this.logger.log(
            `ARM investor onboarding successfully registered: membershipId: ${armRes.customerMembershipId}`,
          )
        }
      } catch (armErr: any) {
        this.logger.warn(`ARM onboarding dispatch non-blocking error: ${armErr.message}`)
      }
    }

    return {
      status: 'success',
      message: 'Investor KYC verified and registered successfully.',
      data: {
        is_verified: true,
        masked_bvn: bvnMasked,
        provider: verificationResult.provider,
      },
    }
  }
}
