import { Injectable, Inject, Logger, BadRequestException, ForbiddenException, NotFoundException, Optional } from '@nestjs/common'
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { IKycProvider, KYC_PROVIDER } from '../../../domains/kyc/kyc-provider.interface'
import { IKycRepository, KYC_REPOSITORY } from '../../../domains/kyc/kyc.repository'
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository'
import {
  IAssetManagementProvider,
  ASSET_MANAGEMENT_PROVIDER,
  MeansOfIdentificationType,
  OnboardingDocumentAsset,
} from '../../../domains/rent-savings/asset-management.provider'
import { ARM_JOB_QUEUE, IArmJobQueue } from '../../../domains/rent-savings/arm-job.interface'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { RecordSavingsConsentUseCase } from './record-savings-consent.use-case'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export class OnboardSavingsInvestorDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'BVN must be exactly 11 numeric digits' })
  bvn?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'NIN must be exactly 11 numeric digits' })
  nin?: string

  @IsNotEmpty()
  @IsIn(['NIN', 'INTERNATIONAL_PASSPORT', 'DRIVERS_LICENSE'])
  means_of_id_type!: MeansOfIdentificationType

  @IsOptional()
  @IsString()
  means_of_id_number?: string

  @IsOptional()
  @IsString()
  means_of_id_issue_date?: string

  @IsOptional()
  @IsString()
  means_of_id_expiry_date?: string

  @IsNotEmpty()
  @IsString()
  means_of_id_doc_key!: string

  @IsOptional()
  @IsString()
  means_of_id_mime_type?: string

  @IsOptional()
  @IsString()
  means_of_id_file_name?: string

  @IsNotEmpty()
  @IsString()
  residential_address_number!: string

  @IsNotEmpty()
  @IsString()
  residential_street!: string

  @IsNotEmpty()
  @IsString()
  residential_town!: string

  @IsNotEmpty()
  @IsString()
  residential_state!: string

  @IsOptional()
  @IsString()
  utility_bill_issue_date?: string

  @IsNotEmpty()
  @IsString()
  utility_bill_doc_key!: string

  @IsOptional()
  @IsString()
  utility_bill_mime_type?: string

  @IsOptional()
  @IsString()
  utility_bill_file_name?: string

  @IsBoolean()
  consent_accepted!: boolean

  @IsOptional()
  @IsString()
  terms_version?: string

  @IsOptional()
  @IsString()
  consent_doc_version?: string

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

  @IsOptional()
  @IsString()
  settlement_bank_code?: string

  @IsOptional()
  @IsString()
  settlement_account_number?: string

  @IsOptional()
  @IsString()
  settlement_account_name?: string

  @IsOptional()
  @IsString()
  settlement_bank_name?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  target_amount?: number

  @IsOptional()
  @IsString()
  rent_due_date?: string

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  cadence?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'

  @IsOptional()
  @IsIn(['SAVE_AND_EARN', 'RENT_PROTEC'])
  product_option?: 'SAVE_AND_EARN' | 'RENT_PROTEC'

  @IsOptional()
  @IsIn(['EQUAL', 'INITIAL_DEPOSIT', 'STEP_UP', 'ACCELERATED'])
  plan_pattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initial_deposit_kobo?: number
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
  rawResponse?: Record<string, any>,
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

  // In non-production environments, Prembly sandbox returns fixed test personas
  // ("RONALD EKOM" for BVN and "CHIDERA JOHNSON" for NIN, or `is_sandbox: true`).
  const allowSandboxNames =
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_KYC_TEST_NAMES === 'true'
  if (
    allowSandboxNames &&
    ((provFull.includes('ronald') && provFull.includes('ekom')) ||
      (provFull.includes('chidera') && provFull.includes('johnson')) ||
      rawResponse?.is_sandbox === true ||
      rawResponse?.verification_status === 'sandbox')
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
    @Optional() private readonly platformRates?: PlatformRatesService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
    @Optional() private readonly recordSavingsConsentUseCase?: RecordSavingsConsentUseCase,
    @Optional() private readonly s3Service?: S3Service,
  ) {}

  private assertOwnedKycDocKey(userUuid: string, docKey: string, label: string): string {
    const trimmed = (docKey || '').trim()
    if (!trimmed) {
      throw new BadRequestException(`${label} document upload is required.`)
    }
    const validS3Prefix = `users/${userUuid}/arm-kyc/`
    const validLocalPrefix = `local:arm-kyc/${userUuid}/`
    if (!trimmed.startsWith(validS3Prefix) && !trimmed.startsWith(validLocalPrefix)) {
      throw new BadRequestException(`Invalid ${label} document reference. Please re-upload your document.`)
    }
    return trimmed
  }

  private async readDocKeyToBase64(docKey: string): Promise<string | undefined> {
    if (!docKey) return undefined
    try {
      if (docKey.startsWith('local:')) {
        const relPath = docKey.slice('local:'.length).replace(/^\/+/, '')
        const absPath = path.resolve(process.cwd(), '.uploads', relPath)
        const buf = await fs.readFile(absPath)
        return buf.toString('base64')
      }
      if (this.s3Service) {
        const buf = await this.s3Service.getFileBuffer(docKey)
        return buf.toString('base64')
      }
    } catch (err: any) {
      this.logger.warn(`Could not hydrate KYC document (${docKey}): ${err?.message}`)
    }
    return undefined
  }

  async getOnboardingPrefill(userId: number) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const latestKyc = this.prisma?.upward_kyc_verification
      ? await this.prisma.upward_kyc_verification.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
      : null

    let decryptedBvn: string | null = null
    let decryptedNin: string | null = null
    let decryptedMaidenName: string | null = null

    if (latestKyc?.idType === 'BVN' && latestKyc?.idNumberEncrypted) {
      try {
        decryptedBvn = this.encryption.decrypt(latestKyc.idNumberEncrypted)
      } catch {
        decryptedBvn = null
      }
    }

    if (latestKyc?.ninEncrypted) {
      try {
        decryptedNin = this.encryption.decrypt(latestKyc.ninEncrypted)
      } catch {
        decryptedNin = null
      }
    } else if (latestKyc?.idType === 'NIN' && latestKyc?.idNumberEncrypted) {
      try {
        decryptedNin = this.encryption.decrypt(latestKyc.idNumberEncrypted)
      } catch {
        decryptedNin = null
      }
    }

    if (latestKyc?.mothersMaidenNameEnc) {
      try {
        decryptedMaidenName = this.encryption.decrypt(latestKyc.mothersMaidenNameEnc)
      } catch {
        decryptedMaidenName = null
      }
    }

    const latestConsent = this.prisma?.upward_savings_consent
      ? await this.prisma.upward_savings_consent
          .findFirst({
            where: { userId },
            orderBy: { acceptedAt: 'desc' },
          })
          .catch(() => null)
      : null

    // Check PM tenant record for Next of Kin fallback if not in KYC yet
    let pmTenant: any = null
    if (this.prisma?.upward_pm_tenant && (user.emailHash || user.phoneHash)) {
      const orConditions: any[] = []
      if (user.emailHash) orConditions.push({ emailHash: user.emailHash })
      if (user.phoneHash) orConditions.push({ phoneHash: user.phoneHash })
      if (orConditions.length > 0) {
        pmTenant = await this.prisma.upward_pm_tenant.findFirst({
          where: { OR: orConditions },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    const tryDecrypt = (val?: string | null): string | null => {
      if (!val) return null
      try {
        return this.encryption.decrypt(val)
      } catch {
        return val
      }
    }

    const bankDetails = this.prisma?.upward_user_bank_details
      ? await this.prisma.upward_user_bank_details.findUnique({
          where: { userId },
        })
      : null

    const activeProp = (user.properties || []).find((p: any) => !p.isPastTenancy) || user.properties?.[0]
    const propAddress = activeProp?.location
      ? [activeProp.location.address, activeProp.location.area, activeProp.location.state]
          .filter(Boolean)
          .join(', ')
      : null

    const latestVault = this.prisma?.upward_rent_vault
      ? await this.prisma.upward_rent_vault.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const landlordAccount = activeProp?.pmManualAccount || activeProp?.manualAccount || activeProp?.subaccount
    const landlordName =
      landlordAccount?.accountName ||
      (activeProp as any)?.subaccount?.businessName ||
      activeProp?.company?.name ||
      (activeProp?.manager
        ? `${activeProp.manager.firstName || ''} ${activeProp.manager.lastName || ''}`.trim()
        : null) ||
      null

    const effectiveTargetRent = latestVault
      ? Number(latestVault.targetAmountKobo) / 100
      : activeProp?.rentAmount || null

    const effectiveDueDate = latestVault?.contractualDueDate
      ? new Date(latestVault.contractualDueDate).toISOString().split('T')[0]
      : activeProp?.rentEndDate
        ? new Date(activeProp.rentEndDate).toISOString().split('T')[0]
        : null

    const hasVerifiedBvn = !!(
      latestKyc?.status === 'VERIFIED' &&
      (decryptedBvn || latestKyc?.idType === 'BVN')
    )
    const hasVerifiedNin = !!(latestKyc?.ninHash || decryptedNin)
    const hasCompletedArmKyc = Boolean(
      hasVerifiedBvn &&
        hasVerifiedNin &&
        latestKyc?.meansOfIdDocKey &&
        latestKyc?.utilityBillDocKey &&
        latestKyc?.residentialStreet,
    )

    return {
      status: 'success',
      data: {
        is_verified: Boolean(user.isIdentityVerified),
        has_verified_bvn: hasVerifiedBvn,
        has_verified_nin: hasVerifiedNin,
        has_completed_arm_kyc: hasCompletedArmKyc,
        has_signed_consent: Boolean(latestConsent),
        consent_accepted_at: latestConsent?.acceptedAt?.toISOString() || null,
        masked_bvn:
          latestKyc?.idType === 'BVN'
            ? latestKyc.idNumberMasked
            : decryptedBvn
              ? maskId(decryptedBvn)
              : null,
        bvn: decryptedBvn || null,
        masked_nin:
          latestKyc?.ninMasked ||
          (latestKyc?.idType === 'NIN' ? latestKyc.idNumberMasked : null) ||
          (decryptedNin ? maskId(decryptedNin) : null),
        nin: decryptedNin || null,
        means_of_id_type: (latestKyc?.meansOfIdType as MeansOfIdentificationType) || 'NIN',
        means_of_id_number_masked: latestKyc?.meansOfIdNumberMasked || null,
        means_of_id_issue_date: latestKyc?.meansOfIdIssueDate || null,
        means_of_id_expiry_date: latestKyc?.meansOfIdExpiryDate || null,
        means_of_id_doc_key: latestKyc?.meansOfIdDocKey || null,
        means_of_id_file_name: latestKyc?.meansOfIdFileName || null,
        means_of_id_mime_type: latestKyc?.meansOfIdMimeType || null,
        residential_address_number: latestKyc?.residentialAddressNumber || null,
        residential_street:
          latestKyc?.residentialStreet || activeProp?.location?.address || null,
        residential_town: latestKyc?.residentialTown || activeProp?.location?.area || null,
        residential_state: latestKyc?.residentialState || activeProp?.location?.state || null,
        utility_bill_issue_date: latestKyc?.utilityBillIssueDate || null,
        utility_bill_doc_key: latestKyc?.utilityBillDocKey || null,
        utility_bill_file_name: latestKyc?.utilityBillFileName || null,
        utility_bill_mime_type: latestKyc?.utilityBillMimeType || null,
        mothers_maiden_name: decryptedMaidenName || null,
        occupation: latestKyc?.occupation || null,
        source_of_funds: latestKyc?.sourceOfFunds || null,
        income_range: latestKyc?.incomeRange || null,
        next_of_kin_name:
          latestKyc?.nextOfKinName || tryDecrypt(pmTenant?.nextOfKinName) || null,
        next_of_kin_relationship: latestKyc?.nextOfKinRelationship || null,
        next_of_kin_phone:
          latestKyc?.nextOfKinPhone || tryDecrypt(pmTenant?.nextOfKinPhone) || null,
        next_of_kin_email:
          latestKyc?.nextOfKinEmail || tryDecrypt(pmTenant?.nextOfKinEmail) || user.email || null,
        next_of_kin_address: latestKyc?.nextOfKinAddress || propAddress || null,
        kyc_address:
          [
            latestKyc?.residentialAddressNumber,
            latestKyc?.residentialStreet,
            latestKyc?.residentialTown,
            latestKyc?.residentialState,
          ]
            .filter(Boolean)
            .join(', ') ||
          latestKyc?.nextOfKinAddress ||
          null,
        target_rent: effectiveTargetRent,
        rent_due_date: effectiveDueDate,
        settlement_bank: bankDetails
          ? {
              bank_code: bankDetails.bankCode,
              bank_name: bankDetails.bankName,
              account_number: bankDetails.accountNumber,
              account_name: bankDetails.accountName,
            }
          : null,
        property: activeProp
          ? {
              uuid: activeProp.uuid,
              rent_amount: activeProp.rentAmount || null,
              rent_end_date: activeProp.rentEndDate
                ? new Date(activeProp.rentEndDate).toISOString().split('T')[0]
                : null,
              address: propAddress,
              landlord_name: landlordName,
              landlord_bank_code: landlordAccount?.bankCode || null,
              landlord_bank_name: (landlordAccount as any)?.bankName || null,
              landlord_account_number: landlordAccount?.accountNumber || null,
            }
          : latestVault
            ? {
                uuid: latestVault.uuid,
                rent_amount: Number(latestVault.targetAmountKobo) / 100,
                rent_end_date: latestVault.contractualDueDate
                  ? new Date(latestVault.contractualDueDate).toISOString().split('T')[0]
                  : null,
                address: latestKyc?.nextOfKinAddress || null,
                landlord_name: null,
                landlord_bank_code: null,
                landlord_bank_name: null,
                landlord_account_number: null,
              }
            : null,
      },
    }
  }

  async execute(
    userId: number,
    dto: OnboardSavingsInvestorDto,
    requestMeta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (this.platformRates) {
      const rates = await this.platformRates.getRates()
      if (rates?.savingsEnabled === false) {
        throw new ForbiddenException('Savings is coming soon.')
      }
    }

    if (dto.consent_accepted !== true) {
      throw new BadRequestException(
        'You must review and accept the Rent Savings Terms & Conditions and ARM Money Market Fund Consent Mandate.',
      )
    }

    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // 1. Resolve & validate compulsory 11-digit BVN
    let rawBvn = dto.bvn ? dto.bvn.replace(/\D/g, '') : ''
    if (rawBvn.length !== 11 && this.prisma?.upward_kyc_verification) {
      const priorBvnKyc = await this.prisma.upward_kyc_verification.findFirst({
        where: { userId, idType: 'BVN', idNumberEncrypted: { not: null } },
        orderBy: { createdAt: 'desc' },
      })
      if (priorBvnKyc?.idNumberEncrypted) {
        try {
          rawBvn = this.encryption.decrypt(priorBvnKyc.idNumberEncrypted).replace(/\D/g, '')
        } catch {
          rawBvn = ''
        }
      }
    }

    const cleanBvn = rawBvn
    if (cleanBvn.length !== 11) {
      throw new BadRequestException('BVN must be exactly 11 numeric digits')
    }

    // 2. Resolve & validate compulsory 11-digit NIN (required by ARM regardless of BVN)
    let rawNin = dto.nin ? dto.nin.replace(/\D/g, '') : ''
    if (rawNin.length !== 11 && this.prisma?.upward_kyc_verification) {
      const priorNinKyc = await this.prisma.upward_kyc_verification.findFirst({
        where: {
          userId,
          OR: [{ ninEncrypted: { not: null } }, { idType: 'NIN', idNumberEncrypted: { not: null } }],
        },
        orderBy: { createdAt: 'desc' },
      })
      const encNin = priorNinKyc?.ninEncrypted || priorNinKyc?.idNumberEncrypted
      if (encNin) {
        try {
          rawNin = this.encryption.decrypt(encNin).replace(/\D/g, '')
        } catch {
          rawNin = ''
        }
      }
    }

    const cleanNin = rawNin
    if (cleanNin.length !== 11) {
      throw new BadRequestException(
        'NIN must be exactly 11 numeric digits (compulsory alongside BVN for ARM onboarding).',
      )
    }

    // 3. Validate Means of Identification & Uploaded KYC Documents (IDOR-safe ownership check)
    const meansOfIdType: MeansOfIdentificationType = dto.means_of_id_type || 'NIN'
    const meansOfIdNumber =
      meansOfIdType === 'NIN' ? cleanNin : (dto.means_of_id_number || '').trim()
    if (!meansOfIdNumber) {
      throw new BadRequestException(
        `Please enter your ${meansOfIdType === 'INTERNATIONAL_PASSPORT' ? 'International Passport' : "Driver's License"} number.`,
      )
    }

    const idDocKey = this.assertOwnedKycDocKey(
      user.uuid,
      dto.means_of_id_doc_key,
      'Valid Means of Identification',
    )
    const utilityBillDocKey = this.assertOwnedKycDocKey(
      user.uuid,
      dto.utility_bill_doc_key,
      'Proof of Address (Utility Bill)',
    )

    // 4. Validate Residential Address
    const residentialAddressNumber = dto.residential_address_number?.trim()
    const residentialStreet = dto.residential_street?.trim()
    const residentialTown = dto.residential_town?.trim()
    const residentialState = dto.residential_state?.trim()
    if (!residentialAddressNumber || !residentialStreet || !residentialTown || !residentialState) {
      throw new BadRequestException(
        'Full residential address (house number, street, city/town, and state) is required to verify your proof of address.',
      )
    }
    const formattedResidentialAddress = [
      residentialAddressNumber,
      residentialStreet,
      residentialTown,
      residentialState,
    ]
      .filter(Boolean)
      .join(', ')

    const bvnHash = this.encryption.hash(cleanBvn)
    const bvnMasked = maskId(cleanBvn)
    const ninHash = this.encryption.hash(cleanNin)
    const ninMasked = maskId(cleanNin)

    // Anti-fraud: Check if BVN or NIN is already verified under another account
    const existingVerifiedBvn = await this.kycRepository.findVerifiedByHash(bvnHash)
    if (existingVerifiedBvn && existingVerifiedBvn.userId !== user.id) {
      if (
        (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ||
        process.env.ALLOW_TEST_KYC_DUPLICATES === 'true'
      ) {
        this.logger.warn(
          `[Dev Sandbox] Allowing duplicate BVN for dev user ID ${user.id} (previously used by user ID ${existingVerifiedBvn.userId})`,
        )
      } else {
        this.logger.warn(
          `Fraud collision: BVN hash collision for user ID ${user.id} against user ID ${existingVerifiedBvn.userId}`,
        )
        throw new BadRequestException(
          'This BVN is already linked to another verified account. Please contact support.',
        )
      }
    }

    if (this.prisma?.upward_kyc_verification) {
      const existingNinOwner = await this.prisma.upward_kyc_verification
        .findFirst({
          where: {
            OR: [{ ninHash }, { idType: 'NIN', idNumberHash: ninHash }],
            status: 'VERIFIED',
            userId: { not: user.id },
          },
          select: { userId: true },
        })
        .catch(() => null)
      if (existingNinOwner) {
        if (
          (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ||
          process.env.ALLOW_TEST_KYC_DUPLICATES === 'true'
        ) {
          this.logger.warn(
            `[Dev Sandbox] Allowing duplicate NIN for dev user ID ${user.id} (previously used by user ID ${existingNinOwner.userId})`,
          )
        } else {
          throw new BadRequestException(
            'This NIN is already linked to another verified account. Please contact support.',
          )
        }
      }
    }

    // 5. Verify BVN & NIN via configured KYC provider (Prembly)
    this.logger.log(`Executing BVN verification via KYC provider for user ID ${user.id}...`)
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

    const returnedFirst = verificationResult.firstName || ''
    const returnedLast = verificationResult.lastName || ''
    const returnedDob = verificationResult.dateOfBirth || ''

    const nameMatched = checkNameMatch(
      user.firstName,
      user.lastName,
      returnedFirst,
      returnedLast,
      verificationResult.rawResponse,
    )
    if (!nameMatched) {
      throw new BadRequestException(
        `The names on your Upward account (${user.firstName} ${user.lastName}) do not match the legal name registered under this BVN (${returnedFirst} ${returnedLast}).`,
      )
    }

    this.logger.log(`Executing NIN verification via KYC provider for user ID ${user.id}...`)
    const ninVerificationResult = await this.kycProvider.verify('NIN', cleanNin, {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth || returnedDob,
      phone: user.phone,
    })

    if (!ninVerificationResult.success) {
      throw new BadRequestException(
        ninVerificationResult.message || 'NIN verification failed with identity provider (Prembly).',
      )
    }

    const ninFirst = ninVerificationResult.firstName || ''
    const ninLast = ninVerificationResult.lastName || ''
    if (ninFirst && ninLast) {
      const ninNameMatched = checkNameMatch(
        user.firstName,
        user.lastName,
        ninFirst,
        ninLast,
        ninVerificationResult.rawResponse,
      )
      if (!ninNameMatched) {
        throw new BadRequestException(
          `The names on your Upward account (${user.firstName} ${user.lastName}) do not match the legal name registered under this NIN (${ninFirst} ${ninLast}).`,
        )
      }
    }

    // Extract biometric portrait photo from BVN or NIN provider response (Prembly / Monnify)
    let photoBase64: string | undefined = undefined
    const rawRes = verificationResult.rawResponse || {}
    const rawNinRes = ninVerificationResult.rawResponse || {}
    if (verificationResult.photo && typeof verificationResult.photo === 'string') {
      photoBase64 = verificationResult.photo.replace(/^data:image\/\w+;base64,/, '')
    } else if (ninVerificationResult.photo && typeof ninVerificationResult.photo === 'string') {
      photoBase64 = ninVerificationResult.photo.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.image && typeof rawRes.image === 'string') {
      photoBase64 = rawRes.image.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.data?.image && typeof rawRes.data?.image === 'string') {
      photoBase64 = rawRes.data.image.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawRes.photo && typeof rawRes.photo === 'string') {
      photoBase64 = rawRes.photo.replace(/^data:image\/\w+;base64,/, '')
    } else if (rawNinRes.data?.photo && typeof rawNinRes.data?.photo === 'string') {
      photoBase64 = rawNinRes.data.photo.replace(/^data:image\/\w+;base64,/, '')
    }

    // Reversible AES-256 encryption for secure transmission
    const idNumberEncrypted = this.encryption.encrypt(cleanBvn)
    const ninEncrypted = this.encryption.encrypt(cleanNin)
    const meansOfIdNumberEnc = this.encryption.encrypt(meansOfIdNumber)
    const meansOfIdNumberMasked = maskId(meansOfIdNumber)
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
      savingsWalletEnabled: true,
      ...(user.dateOfBirth ? {} : returnedDob ? { dateOfBirth: returnedDob } : {}),
      ...(user.gender ? {} : normalizedGender ? { gender: normalizedGender } : {}),
    })

    // Upsert linked payout settlement bank details if provided
    if (dto.settlement_bank_code && dto.settlement_account_number) {
      await this.prisma.upward_user_bank_details.upsert({
        where: { userId },
        create: {
          uuid: crypto.randomUUID(),
          userId,
          bankCode: dto.settlement_bank_code,
          bankName: dto.settlement_bank_name || 'Commercial Bank',
          accountNumber: dto.settlement_account_number,
          accountName: dto.settlement_account_name || `${user.firstName} ${user.lastName}`,
        },
        update: {
          bankCode: dto.settlement_bank_code,
          bankName: dto.settlement_bank_name || 'Commercial Bank',
          accountNumber: dto.settlement_account_number,
          accountName: dto.settlement_account_name || `${user.firstName} ${user.lastName}`,
        },
      })
    }

    // Record verified investor KYC audit record (BVN + NIN + Means of ID + Residential Address + Utility Bill)
    const createdKyc = await this.prisma.upward_kyc_verification.create({
      data: {
        uuid: crypto.randomUUID(),
        userId,
        idType: 'BVN',
        idNumberHash: bvnHash,
        idNumberMasked: bvnMasked,
        idNumberEncrypted,
        ninHash,
        ninMasked,
        ninEncrypted,
        ninVerifiedAt: new Date(),
        meansOfIdType,
        meansOfIdNumberEnc,
        meansOfIdNumberMasked,
        meansOfIdIssueDate: dto.means_of_id_issue_date || null,
        meansOfIdExpiryDate: dto.means_of_id_expiry_date || null,
        meansOfIdDocKey: idDocKey,
        meansOfIdMimeType: dto.means_of_id_mime_type || 'image/jpeg',
        meansOfIdFileName: dto.means_of_id_file_name || 'id_card.jpg',
        residentialAddressNumber,
        residentialStreet,
        residentialTown,
        residentialState,
        utilityBillIssueDate: dto.utility_bill_issue_date || null,
        utilityBillDocKey,
        utilityBillMimeType: dto.utility_bill_mime_type || 'image/jpeg',
        utilityBillFileName: dto.utility_bill_file_name || 'utility_bill.jpg',
        addressVerificationStatus: 'SUBMITTED',
        provider: verificationResult.provider,
        status: 'VERIFIED',
        matchScore: 1.0,
        verifiedAt: new Date(),
        metadata: {
          bvn: rawRes,
          nin: rawNinRes,
        },
        mothersMaidenNameEnc,
        occupation: dto.occupation.trim(),
        sourceOfFunds: dto.source_of_funds,
        incomeRange: dto.income_range || '1M-5M',
        riskAppetite: 'Conservative',
        nextOfKinName: dto.next_of_kin_name.trim(),
        nextOfKinRelationship: dto.next_of_kin_relationship,
        nextOfKinPhone: dto.next_of_kin_phone.trim(),
        nextOfKinEmail: dto.next_of_kin_email?.trim() || user.email,
        nextOfKinAddress: dto.next_of_kin_address?.trim() || formattedResidentialAddress,
        armSyncStatus: 'PENDING',
        armCompletedSections: 0,
      },
    })

    // Provision / Sync Dedicated Virtual Account (Wema Bank) for rent funding
    let dvaBankName = 'Wema Bank'
    let dvaAccountNumber: string | null = null
    let paystackCustomerCode: string | null = null

    try {
      paystackCustomerCode = await this.paymentGateway.createCustomer({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
      })

      if (paystackCustomerCode && this.paymentGateway.validateCustomerIdentification) {
        try {
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
        } catch (idErr: any) {
          this.logger.warn(`Paystack customer identification non-blocking note: ${idErr.message}`)
        }
      }

      // Request Wema Bank Dedicated Virtual Account from Paystack
      if (paystackCustomerCode && this.paymentGateway.createDedicatedAccount) {
        try {
          const dvaRes = await this.paymentGateway.createDedicatedAccount({
            customerCode: paystackCustomerCode,
            preferredBank: 'wema-bank',
          })
          if (dvaRes?.data?.account_number) {
            dvaAccountNumber = dvaRes.data.account_number
            dvaBankName = dvaRes.data.bank?.name || 'Wema Bank'
            this.logger.log(`Paystack provisioned DVA: ${dvaAccountNumber} (${dvaBankName})`)
          }
        } catch (dvaErr: any) {
          this.logger.warn(`Paystack DVA creation note: ${dvaErr.message}`)
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to sync Paystack identification for user ID ${user.id}: ${err.message}`,
      )
    }

    // In non-production only, ensure a sandbox Wema Bank NUBAN is assigned if Paystack DVA didn't return one
    const isNonProd = !isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)
    if (!dvaAccountNumber && isNonProd) {
      const randomAcc = '02' + Math.floor(10000000 + Math.random() * 90000000).toString()
      dvaAccountNumber = randomAcc
      dvaBankName = 'Wema Bank'
    }

    const dvaAccountName = `Upward / ${user.firstName} ${user.lastName}`

    // Find active property in Settings (Single Source of Truth)
    const activeProperty = this.prisma?.upward_user_property
      ? await this.prisma.upward_user_property.findFirst({
          where: {
            userId,
            isPastTenancy: false,
          },
          orderBy: { createdAt: 'desc' },
        })
      : null

    // Assign / update DVA on user's active rent vault
    const activeVault = this.prisma?.upward_rent_vault
      ? await this.prisma.upward_rent_vault.findFirst({
          where: {
            userId,
            lockStatus: { notIn: ['SETTLED', 'BROKEN_OUT'] },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const resolvedRent = dto.target_amount || activeProperty?.rentAmount
    const resolvedDueDateRaw = dto.rent_due_date || activeProperty?.rentEndDate
    if (!resolvedRent || !resolvedDueDateRaw) {
      throw new BadRequestException(
        'Rent amount and rent due date are required to start saving.',
      )
    }
    const resolvedDueDate = new Date(resolvedDueDateRaw)

    const resolvedUnlockDate = new Date(resolvedDueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    let targetVaultId: number | null = activeVault?.id ?? null

    if (activeVault) {
      const updateData: any = {
        dvaCustomerCode: paystackCustomerCode,
      }
      if (dvaAccountNumber) {
        updateData.dvaBankName = dvaBankName
        updateData.dvaAccountNumber = dvaAccountNumber
        updateData.dvaAccountName = dvaAccountName
        updateData.dvaAssignmentStatus = 'ACTIVE'
      } else if (!activeVault.dvaAccountNumber) {
        updateData.dvaBankName = dvaBankName
        updateData.dvaAccountName = dvaAccountName
        updateData.dvaAssignmentStatus = 'PENDING'
      }
      if (dto.target_amount) {
        updateData.targetAmountKobo = BigInt(Math.round(dto.target_amount * 100))
      } else if (activeProperty?.rentAmount) {
        updateData.targetAmountKobo = BigInt(Math.round(activeProperty.rentAmount * 100))
      }

      if (dto.rent_due_date) {
        updateData.contractualDueDate = new Date(dto.rent_due_date)
        updateData.unlockDate = new Date(
          new Date(dto.rent_due_date).getTime() - 30 * 24 * 60 * 60 * 1000,
        )
      } else if (activeProperty?.rentEndDate) {
        updateData.contractualDueDate = new Date(activeProperty.rentEndDate)
        updateData.unlockDate = new Date(
          new Date(activeProperty.rentEndDate).getTime() - 30 * 24 * 60 * 60 * 1000,
        )
      }

      if (dto.cadence) {
        updateData.cadence = dto.cadence
      }
      const platformRates = this.platformRates ? await this.platformRates.getRates() : null
      const chosenOption = dto.product_option || 'SAVE_AND_EARN'
      updateData.productOption = chosenOption
      updateData.planPattern = dto.plan_pattern || 'INITIAL_DEPOSIT'
      if (dto.initial_deposit_kobo !== undefined) {
        updateData.initialDepositKobo = BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
      }
      updateData.appliedAnnualRatePct =
        chosenOption === 'RENT_PROTEC'
          ? (platformRates?.rentProtecRatePct ?? 10.0)
          : (platformRates?.savingsAnnualRatePct ?? 16.0)
      updateData.insurancePremiumPct =
        chosenOption === 'RENT_PROTEC' ? (platformRates?.insurancePremiumPct ?? 2.0) : 0

      await this.prisma.upward_rent_vault.update({
        where: { id: activeVault.id },
        data: updateData,
      })
      this.logger.log(
        `Assigned Wema DVA ${dvaAccountNumber} and synced rental details to active vault ID ${activeVault.id}`,
      )
    } else {
      // Auto-provision rent vault for the verified investor
      const targetAmountKobo = BigInt(Math.round(resolvedRent * 100))
      const platformRates = this.platformRates ? await this.platformRates.getRates() : null
      const chosenOption = dto.product_option || 'SAVE_AND_EARN'

      const newVault = await this.prisma.upward_rent_vault.create({
        data: {
          userId,
          targetAmountKobo,
          currentPrincipalKobo: 0n,
          accruedYieldKobo: 0n,
          cadence: dto.cadence || 'MONTHLY',
          productOption: chosenOption,
          planPattern: dto.plan_pattern || 'INITIAL_DEPOSIT',
          initialDepositKobo: dto.initial_deposit_kobo
            ? BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
            : 0n,
          appliedAnnualRatePct:
            chosenOption === 'RENT_PROTEC'
              ? (platformRates?.rentProtecRatePct ?? 10.0)
              : (platformRates?.savingsAnnualRatePct ?? 16.0),
          insurancePremiumPct:
            chosenOption === 'RENT_PROTEC' ? (platformRates?.insurancePremiumPct ?? 2.0) : 0,
          contractualDueDate: resolvedDueDate,
          unlockDate: resolvedUnlockDate,
          lockStatus: 'LOCKED',
          preferredFundingMethod: 'DVA',
          dvaBankName: dvaAccountNumber ? dvaBankName : null,
          dvaAccountNumber,
          dvaAccountName: dvaAccountNumber ? dvaAccountName : null,
          dvaCustomerCode: paystackCustomerCode,
          dvaAssignmentStatus: dvaAccountNumber ? 'ACTIVE' : 'PENDING',
          autoBypassPmApproval: true,
          investmentProvider: 'ARM',
        },
      })
      targetVaultId = newVault.id

      await this.prisma.upward_rent_savings_score.upsert({
        where: { vaultId: newVault.id },
        create: {
          vaultId: newVault.id,
          userId,
          cadencePoints: 0,
          velocityPoints: 0,
          loanDisciplinePoints: 20,
          totalScore: 20,
          historyLog: [
            {
              reason: 'Vault created and initialized via KYC onboarding',
              delta: 20,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        update: {},
      })
      this.logger.log(
        `Auto-provisioned rent vault ID ${newVault.id} with DVA ${dvaAccountNumber} for verified investor user ID ${userId}`,
      )
    }

    // Persist versioned Rent Savings T&C + ARM B2B2C Consent Mandate & generate signed PDF
    let recordedConsent: { consent_uuid?: string; accepted_at?: string } | null = null
    if (this.recordSavingsConsentUseCase) {
      try {
        const consentRes = await this.recordSavingsConsentUseCase.execute(
          userId,
          {
            consent_accepted: true,
            accepted_terms: true,
            accepted_arm_mandate: true,
            accepted_lock_policy: true,
            terms_version: dto.terms_version,
            consent_doc_version: dto.consent_doc_version,
          },
          {
            ipAddress: requestMeta?.ipAddress || null,
            userAgent: requestMeta?.userAgent || null,
            vaultId: targetVaultId,
            maskedBvn: bvnMasked,
            maskedNin: ninMasked,
            residentialAddress: formattedResidentialAddress,
          },
        )
        recordedConsent = consentRes.data
      } catch (consentErr: any) {
        this.logger.warn(`Failed to record savings consent audit row: ${consentErr?.message}`)
      }
    }

    // Dispatch all 6 sections (Bitmask 63) to ARM Connect asynchronously via durable BullMQ job when available
    if (this.assetManagementProvider.onboardInvestor) {
      const idCardDocAsset: OnboardingDocumentAsset = {
        s3Key: idDocKey,
        mimeType: dto.means_of_id_mime_type || 'image/jpeg',
        fileName: dto.means_of_id_file_name || 'id_card.jpg',
      }
      const utilityBillDocAsset: OnboardingDocumentAsset = {
        s3Key: utilityBillDocKey,
        mimeType: dto.utility_bill_mime_type || 'image/jpeg',
        fileName: dto.utility_bill_file_name || 'utility_bill.jpg',
      }

      const onboardingRequest = {
        customerEmail: user.email,
        personalDetails: {
          surname: user.lastName,
          firstName: user.firstName,
          dateOfBirth: user.dateOfBirth || returnedDob || '1995-01-01',
          gender: (user.gender === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
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
          addressNumber: residentialAddressNumber,
          streetName: residentialStreet,
          town: residentialTown,
          residentialCountry: 'Nigeria',
          residentialStateCode: residentialState,
        },
        kycDetails: {
          bvn: cleanBvn,
          nin: cleanNin,
          meansOfIdentification: meansOfIdType,
          idNumber: meansOfIdNumber,
          idIssueDate: dto.means_of_id_issue_date,
          idExpiryDate: dto.means_of_id_expiry_date,
          utilityBillIssueDate: dto.utility_bill_issue_date,
        },
        bankDetails:
          dto.settlement_bank_code && dto.settlement_account_number
            ? {
                bankName: dto.settlement_bank_name || 'Commercial Bank',
                accountName: dto.settlement_account_name || `${user.firstName} ${user.lastName}`,
                accountNumber: dto.settlement_account_number,
                bankCode: dto.settlement_bank_code,
              }
            : undefined,
        nextOfKin: {
          name: dto.next_of_kin_name,
          gender: 'Male' as const,
          relationshipType: dto.next_of_kin_relationship,
          phone: dto.next_of_kin_phone,
          email: dto.next_of_kin_email || user.email,
          address: dto.next_of_kin_address || formattedResidentialAddress,
        },
        documents: {
          ...(photoBase64
            ? {
                passport: photoBase64,
                bvn_passport: photoBase64,
              }
            : {}),
          id_card: idCardDocAsset,
          utility_bill: utilityBillDocAsset,
        },
      }

      if (this.armJobQueue && this.prisma?.upward_arm_job) {
        try {
          const ref = `ONB-${user.id}-${createdKyc?.id || Date.now()}`
          const armJob = await this.prisma.upward_arm_job.create({
            data: {
              idempotencyKey: `ARM_ONBOARD__${user.id}__${createdKyc?.id || Date.now()}`,
              jobType: 'ONBOARD',
              status: 'QUEUED',
              vaultId: targetVaultId,
              userId: user.id,
              reference: ref,
              armTransactionId: crypto.randomUUID(),
              maxAttempts: 5,
              payload: {
                provider: 'ARM',
                onboardingRequest,
              } as any,
            },
          })
          await this.armJobQueue.enqueueJob({
            id: armJob.id,
            uuid: armJob.uuid,
            idempotencyKey: armJob.idempotencyKey,
            jobType: 'ONBOARD',
          })
          this.logger.log(
            `Queued background ARM investor onboarding job ${armJob.uuid} for user ${user.id}`,
          )
        } catch (queueErr: any) {
          this.logger.warn(`Could not enqueue ARM onboarding job: ${queueErr?.message}`)
        }
      } else {
        try {
          this.logger.log(
            `Forwarding 6-section investor onboarding to ARM Connect for ${user.email}...`,
          )
          const [idCardBase64, utilityBillBase64] = await Promise.all([
            this.readDocKeyToBase64(idDocKey),
            this.readDocKeyToBase64(utilityBillDocKey),
          ])
          const syncRequest = {
            ...onboardingRequest,
            documents: {
              ...onboardingRequest.documents,
              id_card: { ...idCardDocAsset, base64: idCardBase64 },
              utility_bill: { ...utilityBillDocAsset, base64: utilityBillBase64 },
            },
          }
          const armRes = await this.assetManagementProvider.onboardInvestor(syncRequest)

          if (armRes && armRes.success) {
            await this.prisma.upward_kyc_verification.updateMany({
              where: { userId: user.id },
              data: {
                armCustomerMembershipId: armRes.customerMembershipId || armRes.customerId || null,
                armCrmAccountNumber: armRes.crmAccountNumber || null,
                armSyncStatus: armRes.status || 'Submitted',
                armCompletedSections: armRes.completedSections ?? 63,
              },
            })
            if (targetVaultId && this.prisma?.upward_rent_vault) {
              await this.prisma.upward_rent_vault.update({
                where: { id: targetVaultId },
                data: {
                  investmentProvider: 'ARM',
                  providerMembershipId: armRes.customerMembershipId || null,
                  providerAccountNumber: armRes.crmAccountNumber || null,
                  providerCrmStatus: armRes.status || 'Submitted',
                },
              })
            }
            this.logger.log(
              `ARM investor onboarding successfully registered: membershipId: ${armRes.customerMembershipId || armRes.customerId}`,
            )
          }
        } catch (armErr: any) {
          this.logger.warn(`ARM onboarding dispatch non-blocking error: ${armErr.message}`)
        }
      }
    }

    return {
      status: 'success',
      message: dvaAccountNumber
        ? 'Investor KYC verified and dedicated Wema Bank funding account generated.'
        : 'Investor KYC verified. Your dedicated funding account is being provisioned.',
      data: {
        is_verified: true,
        has_completed_arm_kyc: true,
        masked_bvn: bvnMasked,
        masked_nin: ninMasked,
        provider: verificationResult.provider,
        consent_uuid: recordedConsent?.consent_uuid || null,
        consent_accepted_at: recordedConsent?.accepted_at || null,
        dedicated_account: dvaAccountNumber
          ? {
              bank_name: dvaBankName,
              account_number: dvaAccountNumber,
              account_name: dvaAccountName,
              assignment_status: 'ACTIVE',
            }
          : null,
      },
    }
  }
}
