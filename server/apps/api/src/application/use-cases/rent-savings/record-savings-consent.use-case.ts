import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import {
  SAVINGS_LEGAL_DEFAULTS,
  SavingsConsentPdfService,
} from '../../../shared/infrastructure/common/rent-savings/savings-consent-pdf.service'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export class RecordSavingsConsentDto {
  @IsBoolean()
  consent_accepted!: boolean

  @IsOptional()
  @IsBoolean()
  accepted_terms?: boolean

  @IsOptional()
  @IsBoolean()
  accepted_arm_mandate?: boolean

  @IsOptional()
  @IsBoolean()
  accepted_lock_policy?: boolean

  @IsOptional()
  @IsString()
  terms_version?: string

  @IsOptional()
  @IsString()
  consent_doc_version?: string

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

export interface ConsentRequestMeta {
  ipAddress?: string | null
  userAgent?: string | null
  vaultId?: number | null
  maskedBvn?: string | null
  maskedNin?: string | null
  residentialAddress?: string | null
}

@Injectable()
export class RecordSavingsConsentUseCase {
  private readonly logger = new Logger(RecordSavingsConsentUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly consentPdfService: SavingsConsentPdfService,
    @Optional() private readonly s3Service?: S3Service,
    @Optional() private readonly platformRates?: PlatformRatesService,
  ) {}

  async execute(userId: number, dto: RecordSavingsConsentDto, meta?: ConsentRequestMeta) {
    if (
      dto.consent_accepted !== true ||
      dto.accepted_terms === false ||
      dto.accepted_arm_mandate === false ||
      dto.accepted_lock_policy === false
    ) {
      throw new BadRequestException(
        'You must confirm and accept the Rent Savings Terms & Conditions and ARM Money Market Fund Consent Mandate to proceed.',
      )
    }

    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const latestKyc = this.prisma?.upward_kyc_verification
      ? await this.prisma.upward_kyc_verification.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const activeVault =
      meta?.vaultId !== undefined
        ? meta.vaultId
          ? { id: meta.vaultId }
          : null
        : this.prisma?.upward_rent_vault
          ? await this.prisma.upward_rent_vault.findFirst({
              where: {
                userId,
                lockStatus: { notIn: ['SETTLED', 'BROKEN_OUT'] },
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            })
          : null

    const termsVersion = dto.terms_version?.trim() || SAVINGS_LEGAL_DEFAULTS.TERMS_VERSION
    const consentDocVersion =
      dto.consent_doc_version?.trim() || SAVINGS_LEGAL_DEFAULTS.CONSENT_DOC_VERSION
    const consentUuid = crypto.randomUUID()
    const acceptedAt = new Date()

    const customerFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant'
    const residentialAddress =
      meta?.residentialAddress ||
      [
        latestKyc?.residentialAddressNumber,
        latestKyc?.residentialStreet,
        latestKyc?.residentialTown,
        latestKyc?.residentialState,
      ]
        .filter(Boolean)
        .join(', ') ||
      latestKyc?.nextOfKinAddress ||
      null

    const maskedBvn = meta?.maskedBvn || latestKyc?.idNumberMasked || null
    const maskedNin = meta?.maskedNin || latestKyc?.ninMasked || null

    let consentDocKey: string | null = null
    try {
      const pdfBuffer = await this.consentPdfService.generateConsentPdf({
        consentUuid,
        customerFullName,
        customerEmail: user.email,
        customerPhone: user.phone,
        maskedBvn,
        maskedNin,
        residentialAddress,
        termsVersion,
        consentDocVersion,
        fundCode: SAVINGS_LEGAL_DEFAULTS.FUND_CODE,
        fundName: SAVINGS_LEGAL_DEFAULTS.FUND_NAME,
        acceptedAt,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
      })

      const s3Key = `users/${user.uuid}/arm-consent/${consentUuid}.pdf`
      const hasAwsCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      const isProd = isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)

      if (this.s3Service && hasAwsCreds) {
        try {
          await this.s3Service.uploadBuffer(pdfBuffer, s3Key, 'application/pdf')
          consentDocKey = s3Key
        } catch (s3Err: any) {
          if (isProd) {
            this.logger.error(`Failed to upload Consent Mandate PDF to S3: ${s3Err?.message}`)
          } else {
            consentDocKey = await this.writeLocalPdfFallback(user.uuid, `${consentUuid}.pdf`, pdfBuffer)
          }
        }
      } else if (!isProd) {
        consentDocKey = await this.writeLocalPdfFallback(user.uuid, `${consentUuid}.pdf`, pdfBuffer)
      }
    } catch (pdfErr: any) {
      this.logger.warn(`Non-blocking error generating Consent Mandate PDF: ${pdfErr?.message}`)
    }

    const consentSnapshot = {
      customerFullName,
      customerEmail: user.email,
      customerPhone: user.phone || null,
      maskedBvn,
      maskedNin,
      residentialAddress,
      fundCode: SAVINGS_LEGAL_DEFAULTS.FUND_CODE,
      fundName: SAVINGS_LEGAL_DEFAULTS.FUND_NAME,
      clauses: SAVINGS_LEGAL_DEFAULTS.MANDATE_CLAUSES,
    }

    const record = this.prisma?.upward_savings_consent
      ? await this.prisma.upward_savings_consent.create({
          data: {
            uuid: consentUuid,
            userId,
            vaultId: activeVault?.id ?? null,
            termsVersion,
            consentDocVersion,
            fundCode: SAVINGS_LEGAL_DEFAULTS.FUND_CODE,
            fundName: SAVINGS_LEGAL_DEFAULTS.FUND_NAME,
            acceptedTerms: true,
            acceptedArmMandate: true,
            acceptedLockPolicy: true,
            acceptedAt,
            ipAddress: meta?.ipAddress || null,
            userAgent: meta?.userAgent || null,
            consentDocKey,
            consentSnapshot: consentSnapshot as any,
          },
        })
      : {
          uuid: consentUuid,
          termsVersion,
          consentDocVersion,
          acceptedAt,
          consentDocKey,
        }

    await this.userRepo.update(userId, { savingsWalletEnabled: true })

    // Optionally update active vault cadence / plan settings if sent alongside consent
    if (
      activeVault?.id &&
      this.prisma?.upward_rent_vault &&
      dto.cadence &&
      ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(dto.cadence)
    ) {
      const updateData: any = { cadence: dto.cadence, preferredFundingMethod: 'DVA' }
      if (dto.product_option) {
        const rates = this.platformRates ? await this.platformRates.getRates() : null
        updateData.productOption = dto.product_option
        updateData.appliedAnnualRatePct =
          dto.product_option === 'RENT_PROTEC'
            ? (rates?.rentProtecRatePct ?? 10.0)
            : (rates?.savingsAnnualRatePct ?? 16.0)
        updateData.insurancePremiumPct =
          dto.product_option === 'RENT_PROTEC' ? (rates?.insurancePremiumPct ?? 2.0) : 0
      }
      if (dto.plan_pattern) {
        updateData.planPattern = dto.plan_pattern
      }
      if (dto.initial_deposit_kobo !== undefined) {
        updateData.initialDepositKobo = BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
      }
      await this.prisma.upward_rent_vault.update({
        where: { id: activeVault.id },
        data: updateData,
      })
    }

    return {
      status: 'success',
      message: 'Rent savings consent recorded successfully',
      data: {
        consent_uuid: record.uuid,
        terms_version: record.termsVersion,
        consent_doc_version: record.consentDocVersion,
        fund_code: SAVINGS_LEGAL_DEFAULTS.FUND_CODE,
        fund_name: SAVINGS_LEGAL_DEFAULTS.FUND_NAME,
        accepted_at: record.acceptedAt.toISOString(),
        has_document: Boolean(record.consentDocKey || consentSnapshot),
      },
    }
  }

  private async writeLocalPdfFallback(
    userUuid: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const relPath = path.posix.join('arm-consent', userUuid, fileName)
    const absPath = path.resolve(process.cwd(), '.uploads', relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, buffer)
    return `local:${relPath}`
  }
}
