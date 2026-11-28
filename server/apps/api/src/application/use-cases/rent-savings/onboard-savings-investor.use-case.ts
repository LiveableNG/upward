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
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { clampReminderDay } from '../../../domains/rent-savings/reminder-day'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { RecordSavingsConsentUseCase } from './record-savings-consent.use-case'
import { ApplyReservedSavingsCashbackUseCase } from './apply-reserved-savings-cashback.use-case'
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
  @IsIn(['LOCKED', 'FLEXIBLE'])
  lock_mode?: 'LOCKED' | 'FLEXIBLE'

  @IsOptional()
  @IsIn(['EQUAL', 'INITIAL_DEPOSIT', 'STEP_UP', 'ACCELERATED'])
  plan_pattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initial_deposit_kobo?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  planned_monthly_deposit_kobo?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  payday_day_of_month?: number
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

export function checkBankAccountNameMatchesBvn(params: {
  accountName: string
  bvnFirst: string
  bvnLast: string
  userFirst: string
  userLast: string
  isProduction: boolean
  bvnRawResponse?: any
}): boolean {
  const { accountName, bvnFirst, bvnLast, userFirst, userLast, isProduction, bvnRawResponse } =
    params

  const stripDecorators = (raw: string) =>
    raw
      .replace(/\(verified\)/gi, ' ')
      .replace(/[^a-zA-Z\s]/g, ' ')
      .toLowerCase()
      .trim()

  const toTokens = (raw: string) =>
    stripDecorators(raw)
      .split(/\s+/)
      .filter((t) => t.length >= 2)

  const accTokens = toTokens(accountName || '')
  const accCompact = accTokens.join(' ')
  if (!accTokens.length) return false

  const hasToken = (needle: string) => {
    const clean = cleanName(needle)
    if (!clean || clean.length < 2) return false
    return (
      accTokens.includes(clean) ||
      accTokens.some((t) => t.length >= 3 && clean.length >= 3 && (t.startsWith(clean) || clean.startsWith(t))) ||
      accCompact.includes(clean)
    )
  }

  // Primary check: Bank account name must contain BOTH the BVN legal first and last name
  const bvnF = cleanName(bvnFirst)
  const bvnL = cleanName(bvnLast)
  if (bvnF && bvnL && hasToken(bvnF) && hasToken(bvnL)) {
    return true
  }

  // Secondary check: if BVN already matched Upward account name, also accept exact user first + last
  const usrF = cleanName(userFirst)
  const usrL = cleanName(userLast)
  if (usrF && usrL && hasToken(usrF) && hasToken(usrL)) {
    return true
  }

  // Dev / staging workaround ONLY — NEVER active in production
  if (!isProduction && process.env.STRICT_BANK_NAME_MATCH !== 'true') {
    const isKnownSandbox =
      (accCompact.includes('ronald') && accCompact.includes('ekom')) ||
      (accCompact.includes('chidera') && accCompact.includes('johnson')) ||
      accountName.toUpperCase().includes('(VERIFIED)') ||
      bvnRawResponse?.is_sandbox === true ||
      bvnRawResponse?.verification_status === 'sandbox'
    if (isKnownSandbox || process.env.NODE_ENV !== 'production') {
      return true
    }
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
    @Optional()
    private readonly applyReservedSavingsCashbackUseCase?: ApplyReservedSavingsCashbackUseCase,
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
      ? (() => {
          const base = (activeProp.location.address || '').trim()
          const parts: string[] = base ? [base] : []
          const seen = base.toLowerCase()
          for (const extra of [activeProp.location.area, activeProp.location.state]) {
            const cleaned = (extra || '').trim()
            if (cleaned && !seen.includes(cleaned.toLowerCase())) {
              parts.push(cleaned)
            }
          }
          return parts.join(', ') || null
        })()
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

    let effectiveDueDateObj: Date | null = latestVault?.contractualDueDate
      ? new Date(latestVault.contractualDueDate)
      : activeProp?.rentEndDate
        ? new Date(activeProp.rentEndDate)
        : null

    // If the latest rent cycle for this due date has already been paid in full (either via a
    // full vault settlement or a PAID rent payment request), roll the next due date forward by 1 year.
    if (effectiveDueDateObj && this.prisma) {
      let cycleAlreadyPaid = false

      if (latestVault?.lockStatus === 'SETTLED') {
        const openPartialPr = this.prisma.upward_payment_request
          ? await this.prisma.upward_payment_request
              .findFirst({
                where: {
                  userId,
                  status: { in: ['PENDING', 'PARTIAL'] },
                },
              })
              .catch(() => null)
          : null
        if (!openPartialPr) {
          cycleAlreadyPaid = true
        }
      }

      if (!cycleAlreadyPaid && this.prisma.upward_payment_request) {
        const latestPaidPr = await this.prisma.upward_payment_request
          .findFirst({
            where: { userId, status: 'PAID' },
            orderBy: { paidAt: 'desc' },
          })
          .catch(() => null)
        const paidCycleEnd = latestPaidPr?.rentEndDate || latestPaidPr?.dueDate
        if (paidCycleEnd && new Date(paidCycleEnd).getTime() >= effectiveDueDateObj.getTime() - 7 * 86_400_000) {
          cycleAlreadyPaid = true
        }
      }

      if (cycleAlreadyPaid) {
        const nextDue = new Date(effectiveDueDateObj)
        nextDue.setUTCFullYear(nextDue.getUTCFullYear() + 1)
        const nowMs = Date.now()
        while (nextDue.getTime() <= nowMs) {
          nextDue.setUTCFullYear(nextDue.getUTCFullYear() + 1)
        }
        effectiveDueDateObj = nextDue

        // Ensure repeat savers who aren't on GoodTenants still have a persistent rental record
        // with their rolled-forward next due date so Home, Pay Rent, and Savings stay in sync.
        if (!activeProp && effectiveTargetRent && effectiveTargetRent > 0 && this.prisma.upward_user_property) {
          try {
            const latestSettlement = this.prisma.upward_rent_settlement
              ? await this.prisma.upward_rent_settlement.findFirst({
                  where: { userId },
                  orderBy: { createdAt: 'desc' },
                })
              : null

            let locationId: number | null = null
            const addr =
              latestSettlement?.propertyAddress ||
              [
                latestKyc?.residentialAddressNumber,
                latestKyc?.residentialStreet,
                latestKyc?.residentialTown,
              ]
                .filter(Boolean)
                .join(', ')
            if (addr && this.prisma.upward_location) {
              const loc = await this.prisma.upward_location.create({
                data: {
                  country: 'Nigeria',
                  state: latestKyc?.residentialState || 'Lagos',
                  area: latestKyc?.residentialTown || 'Lagos',
                  address: addr,
                },
              })
              locationId = loc.id
            }

            let manualAccountId: number | null = null
            if (
              latestSettlement?.landlordAccountNumber &&
              this.prisma.upward_manual_account
            ) {
              const existingAcc = await this.prisma.upward_manual_account.findFirst({
                where: {
                  accountNumber: latestSettlement.landlordAccountNumber,
                  bankCode: latestSettlement.landlordBankCode,
                },
              })
              if (existingAcc) {
                manualAccountId = existingAcc.id
              } else {
                const createdAcc = await this.prisma.upward_manual_account.create({
                  data: {
                    accountNumber: latestSettlement.landlordAccountNumber,
                    accountName: latestSettlement.landlordName,
                    bankName: latestSettlement.landlordBankCode,
                    bankCode: latestSettlement.landlordBankCode,
                  },
                })
                manualAccountId = createdAcc.id
              }
            }

            const prevDue = latestVault?.contractualDueDate
              ? new Date(latestVault.contractualDueDate)
              : new Date()
            await this.prisma.upward_user_property.create({
              data: {
                userId,
                locationId,
                manualAccountId,
                rentAmount: effectiveTargetRent,
                currency: 'NGN',
                rentStartDate: prevDue,
                rentEndDate: effectiveDueDateObj,
                amountPaid: 0,
                amountRemaining: effectiveTargetRent,
                isPastTenancy: false,
                rentType: 'Annually',
              },
            })
          } catch {
            // Non-blocking repeat-saver continuity backfill
          }
        }
      }
    }

    const effectiveDueDate = effectiveDueDateObj
      ? effectiveDueDateObj.toISOString().split('T')[0]
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
    const isRepeatSaver = Boolean(hasCompletedArmKyc && latestVault)

    // Compute any unapplied cashback waiting to kickstart the user's next Rent Savings plan
    // (unapplied settlement cashback from a previous SETTLED vault + any RESERVED activation grant)
    let availableCashbackKobo = 0n
    let availableCashbackSource: 'SETTLEMENT_CASHBACK' | 'ACTIVATION_BONUS' | null = null
    if (this.prisma) {
      if (this.prisma.upward_rent_settlement && this.prisma.upward_rent_vault_transaction) {
        const latestCashbackSettlement = await this.prisma.upward_rent_settlement
          .findFirst({
            where: { userId, cashbackCreditedKobo: { gt: 0n } },
            orderBy: { createdAt: 'desc' },
          })
          .catch(() => null)
        if (latestCashbackSettlement) {
          const rolloverRef = `CASHBACK_ROLLOVER_${latestCashbackSettlement.settlementReference}`
          const alreadyRolled = await this.prisma.upward_rent_vault_transaction
            .findUnique({ where: { reference: rolloverRef } })
            .catch(() => null)
          if (!alreadyRolled) {
            availableCashbackKobo += latestCashbackSettlement.cashbackCreditedKobo
            availableCashbackSource = 'SETTLEMENT_CASHBACK'
          }
        }
      }
      if (this.prisma.upward_savings_cashback_grant) {
        const reservedGrant = await this.prisma.upward_savings_cashback_grant
          .findFirst({
            where: { userId, status: 'RESERVED' },
            orderBy: { createdAt: 'desc' },
          })
          .catch(() => null)
        if (reservedGrant && reservedGrant.amountKobo > 0n) {
          availableCashbackKobo += reservedGrant.amountKobo
          if (!availableCashbackSource) {
            availableCashbackSource = 'ACTIVATION_BONUS'
          }
        }
      }
    }

    // Read user DVA holding wallet balance & funding-type breakdown
    let dvaHoldingBalanceNgn = 0
    let availableSurplusNgn = 0
    let unallocatedDvaNgn = 0
    let armFallbackHeldNgn = 0
    if (this.prisma?.upward_wallet && this.prisma?.upward_wallet_transaction) {
      const userWallet = await this.prisma.upward_wallet
        .findUnique({
          where: { userId },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        })
        .catch(() => null)
      if (userWallet) {
        dvaHoldingBalanceNgn = Number(userWallet.balance || 0)
        for (const wt of userWallet.transactions) {
          const meta = (wt.metadata as Record<string, unknown> | null) || {}
          if (meta.routingStatus === 'ROUTED' || Number(wt.amount) <= 0) continue
          if (wt.type === 'SETTLEMENT_SURPLUS') availableSurplusNgn += Number(wt.amount)
          else if (wt.type === 'UNALLOCATED_DVA_INFLOW') unallocatedDvaNgn += Number(wt.amount)
          else if (wt.type === 'ARM_SUBSCRIPTION_FALLBACK') armFallbackHeldNgn += Number(wt.amount)
        }
      }
    }

    const strictBankNameMatch =
      isProductionRuntime(process.env.PAYSTACK_SECRET_KEY) ||
      process.env.STRICT_BANK_NAME_MATCH === 'true'

    return {
      status: 'success',
      data: {
        is_verified: Boolean(user.isIdentityVerified),
        has_verified_bvn: hasVerifiedBvn,
        has_verified_nin: hasVerifiedNin,
        has_completed_arm_kyc: hasCompletedArmKyc,
        is_repeat_saver: isRepeatSaver,
        has_previous_vault: Boolean(latestVault),
        available_cashback_kobo: Number(availableCashbackKobo),
        available_cashback_ngn: Number(availableCashbackKobo) / 100,
        available_cashback_source: availableCashbackSource,
        dva_holding_balance_ngn: dvaHoldingBalanceNgn,
        available_surplus_ngn: availableSurplusNgn,
        unallocated_dva_ngn: unallocatedDvaNgn,
        arm_fallback_held_ngn: armFallbackHeldNgn,
        previous_product_option: latestVault?.productOption || null,
        previous_lock_mode: latestVault?.lockMode || null,
        previous_plan_pattern: latestVault?.planPattern || null,
        previous_payday_day: latestVault?.paydayDayOfMonth || null,
        previous_dva: latestVault?.dvaAccountNumber
          ? {
              bank_name: latestVault.dvaBankName || 'Wema Bank',
              account_number: latestVault.dvaAccountNumber,
              account_name:
                latestVault.dvaAccountName ||
                `Upward / ${`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant'}`,
            }
          : null,
        has_signed_consent: Boolean(latestConsent),
        consent_accepted_at: latestConsent?.acceptedAt?.toISOString() || null,
        account_holder_first_name: user.firstName || null,
        account_holder_last_name: user.lastName || null,
        account_holder_full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        strict_bank_name_match: strictBankNameMatch,
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
        settlement_bank_code: bankDetails?.bankCode || null,
        settlement_bank_name: bankDetails?.bankName || null,
        settlement_account_number: bankDetails?.accountNumber || null,
        settlement_account_name: bankDetails?.accountName || null,
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
      if (rates?.savingsEnabled === false || rates?.savingsMode === 'COMING_SOON') {
        throw new ForbiddenException(
          'Rent Savings is not open yet. Indicate your interest in the app to reserve your early-access cashback.',
        )
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

    if (meansOfIdType !== 'NIN') {
      const expiryRaw = (dto.means_of_id_expiry_date || '').trim()
      if (!expiryRaw) {
        throw new BadRequestException(
          `Expiry date is required for your ${meansOfIdType === 'INTERNATIONAL_PASSPORT' ? 'International Passport' : "Driver's License"} to confirm it is valid.`,
        )
      }
      const parsedExpiry = new Date(expiryRaw)
      const todayIso = new Date().toISOString().slice(0, 10)
      if (Number.isNaN(parsedExpiry.getTime()) || expiryRaw.slice(0, 10) < todayIso) {
        throw new BadRequestException(
          'The provided identification document is expired. Please submit a valid, unexpired ID.',
        )
      }
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

    // 5b. Resolve & verify BVN-linked payout bank account BEFORE marking KYC verified or calling ARM
    const isProd = isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)
    const enforceStrictBankMatch = isProd || process.env.STRICT_BANK_NAME_MATCH === 'true'

    let candidateBankCode = dto.settlement_bank_code?.trim() || ''
    let candidateBankName = dto.settlement_bank_name?.trim() || ''
    let candidateAccountNumber = dto.settlement_account_number
      ? dto.settlement_account_number.replace(/\D/g, '')
      : ''
    let candidateClientAccountName = dto.settlement_account_name?.trim() || ''

    if ((!candidateBankCode || candidateAccountNumber.length !== 10) && this.prisma?.upward_user_bank_details?.findUnique) {
      const savedBank = await this.prisma.upward_user_bank_details.findUnique({
        where: { userId },
      })
      if (savedBank?.bankCode && savedBank?.accountNumber) {
        candidateBankCode = candidateBankCode || savedBank.bankCode.trim()
        candidateBankName = candidateBankName || savedBank.bankName || 'Commercial Bank'
        candidateAccountNumber =
          candidateAccountNumber.length === 10
            ? candidateAccountNumber
            : savedBank.accountNumber.replace(/\D/g, '')
        candidateClientAccountName = candidateClientAccountName || savedBank.accountName || ''
      }
    }

    if (!candidateBankCode || candidateAccountNumber.length !== 10) {
      throw new BadRequestException(
        'A valid 10-digit Nigerian bank account linked to your BVN is required to complete KYC.',
      )
    }

    let serverVerifiedAccountName = ''
    if (this.paymentGateway?.verifyAccountNumber) {
      try {
        const resolved = await this.paymentGateway.verifyAccountNumber(
          candidateAccountNumber,
          candidateBankCode,
        )
        serverVerifiedAccountName = (resolved?.accountName || '').trim()
      } catch (bankErr: any) {
        if (enforceStrictBankMatch) {
          this.logger.warn(
            `Bank account resolution failed in strict/prod mode for user ID ${user.id}: ${bankErr?.message}`,
          )
          throw new BadRequestException(
            'We could not verify this bank account number with your bank. Please double-check your bank and 10-digit account number.',
          )
        }
        this.logger.warn(
          `[Dev/Staging Workaround] Bank resolution failed for user ID ${user.id} (${bankErr?.message}); falling back to submitted/user account name.`,
        )
      }
    }

    if (!serverVerifiedAccountName) {
      if (enforceStrictBankMatch) {
        throw new BadRequestException(
          'We could not resolve a valid account name for this bank account. Please check your bank and 10-digit account number.',
        )
      }
      serverVerifiedAccountName =
        candidateClientAccountName || `${user.firstName} ${user.lastName}`.trim()
    }

    const bankNameMatched = checkBankAccountNameMatchesBvn({
      accountName: serverVerifiedAccountName,
      bvnFirst: returnedFirst,
      bvnLast: returnedLast,
      userFirst: user.firstName,
      userLast: user.lastName,
      isProduction: isProd,
      bvnRawResponse: verificationResult.rawResponse,
    })

    if (!bankNameMatched) {
      const bvnFullDisplay =
        `${returnedFirst} ${returnedLast}`.trim() || `${user.firstName} ${user.lastName}`.trim()
      this.logger.warn(
        `KYC failed: bank account name ("${serverVerifiedAccountName}") does not match BVN legal name ("${bvnFullDisplay}") for user ID ${user.id}`,
      )
      throw new BadRequestException(
        `Your bank account name (${serverVerifiedAccountName}) does not match your BVN legal name (${bvnFullDisplay}). Please use a personal bank account registered in your BVN name or KYC will fail.`,
      )
    }

    if (!isProd) {
      const strictCheckInNonProd = checkBankAccountNameMatchesBvn({
        accountName: serverVerifiedAccountName,
        bvnFirst: returnedFirst,
        bvnLast: returnedLast,
        userFirst: user.firstName,
        userLast: user.lastName,
        isProduction: true,
        bvnRawResponse: verificationResult.rawResponse,
      })
      if (!strictCheckInNonProd) {
        this.logger.warn(
          `[Dev/Staging Workaround] Allowing non-matching sandbox bank account name ("${serverVerifiedAccountName}") for user ID ${user.id} (BVN: "${returnedFirst} ${returnedLast}"). In production this fails KYC.`,
        )
      }
    }

    // Extract biometric portrait photo from BVN or NIN provider response (Prembly / Monnify)
    // Only keep strictly valid base64 content (Prembly sandbox often returns literal text like "base64 image content").
    const extractValidBase64Photo = (val: unknown): string | undefined => {
      if (typeof val !== 'string') return undefined
      const stripped = val.replace(/^data:image\/[^;]+;base64,/, '').trim()
      if (!stripped || /[^A-Za-z0-9+/=\r\n]/.test(stripped)) return undefined
      const compact = stripped.replace(/[\r\n]+/g, '')
      if (compact.length < 32 || compact.length % 4 !== 0) return undefined
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return undefined
      return compact
    }

    const rawRes = verificationResult.rawResponse || {}
    const rawNinRes = ninVerificationResult.rawResponse || {}
    const photoCandidates: unknown[] = [
      verificationResult.photo,
      ninVerificationResult.photo,
      rawRes.image,
      rawRes.data?.image,
      rawRes.photo,
      rawNinRes.data?.photo,
      rawNinRes.photo,
    ]
    const photoBase64 = photoCandidates.map(extractValidBase64Photo).find(Boolean)

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

    // Upsert verified payout settlement bank details (always persisting server-resolved accountName)
    const resolvedBankDetails: {
      bankCode: string
      bankName: string
      accountNumber: string
      accountName: string
    } = {
      bankCode: candidateBankCode,
      bankName: candidateBankName || 'Commercial Bank',
      accountNumber: candidateAccountNumber,
      accountName: serverVerifiedAccountName,
    }

    if (this.prisma?.upward_user_bank_details?.upsert) {
      await this.prisma.upward_user_bank_details.upsert({
        where: { userId },
        create: {
          uuid: crypto.randomUUID(),
          userId,
          bankCode: resolvedBankDetails.bankCode,
          bankName: resolvedBankDetails.bankName,
          accountNumber: resolvedBankDetails.accountNumber,
          accountName: resolvedBankDetails.accountName,
        },
        update: {
          bankCode: resolvedBankDetails.bankCode,
          bankName: resolvedBankDetails.bankName,
          accountNumber: resolvedBankDetails.accountNumber,
          accountName: resolvedBankDetails.accountName,
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
      const resolvedLockMode: 'LOCKED' | 'FLEXIBLE' =
        chosenOption === 'RENT_PROTEC'
          ? 'LOCKED'
          : dto.lock_mode === 'FLEXIBLE'
            ? 'FLEXIBLE'
            : 'LOCKED'
      const resolvedAnnualRatePct =
        chosenOption === 'RENT_PROTEC'
          ? (platformRates?.rentProtecRatePct ?? 10.0)
          : resolvedLockMode === 'FLEXIBLE'
            ? (platformRates?.flexibleSavingsAnnualRatePct ?? 12.0)
            : (platformRates?.savingsAnnualRatePct ?? 16.0)
      const effectiveTargetKobo: bigint =
        updateData.targetAmountKobo ?? activeVault.targetAmountKobo
      const effectiveDueDate: Date =
        updateData.contractualDueDate ?? activeVault.contractualDueDate
      const rawDaysRem = RentSavingsCalculatorEngine.calculateDaysRemaining(effectiveDueDate)
      const minRpInitKobo =
        chosenOption === 'RENT_PROTEC'
          ? RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
              effectiveTargetKobo,
              rawDaysRem,
            )
          : 0n
      const providedInitKobo =
        dto.initial_deposit_kobo !== undefined
          ? BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
          : activeVault.initialDepositKobo
      const resolvedInitKobo =
        chosenOption === 'RENT_PROTEC' && providedInitKobo < minRpInitKobo
          ? minRpInitKobo
          : providedInitKobo

      let plannedMonthlyKobo =
        dto.planned_monthly_deposit_kobo && dto.planned_monthly_deposit_kobo > 0
          ? BigInt(Math.round(dto.planned_monthly_deposit_kobo))
          : 0n
      if (plannedMonthlyKobo === 0n) {
        try {
          const sim = RentSavingsCalculatorEngine.simulate({
            targetAmountKobo: effectiveTargetKobo,
            contractualDueDate: effectiveDueDate,
            initialDepositKobo: resolvedInitKobo,
            cadence: 'MONTHLY',
            productOption: chosenOption,
            lockMode: resolvedLockMode,
            planPattern: dto.plan_pattern || 'INITIAL_DEPOSIT',
            annualNetYieldRate: resolvedAnnualRatePct / 100,
            maxSavingsMonths: platformRates?.maxSavingsMonths ?? 11,
            rentProtecMinMonths: platformRates?.rentProtecMinMonths ?? 6,
            insurancePremiumPct:
              chosenOption === 'RENT_PROTEC' ? (platformRates?.insurancePremiumPct ?? 2.0) : 0,
          })
          plannedMonthlyKobo = sim.periodicDepositKobo
        } catch {
          plannedMonthlyKobo = activeVault.plannedMonthlyDepositKobo ?? 0n
        }
      }

      updateData.productOption = chosenOption
      updateData.lockMode = resolvedLockMode
      updateData.planPattern = chosenOption === 'RENT_PROTEC' ? 'INITIAL_DEPOSIT' : (dto.plan_pattern || 'INITIAL_DEPOSIT')
      updateData.initialDepositKobo = resolvedInitKobo
      updateData.plannedMonthlyDepositKobo = plannedMonthlyKobo
      updateData.paydayDayOfMonth = clampReminderDay(
        dto.payday_day_of_month ?? activeVault.paydayDayOfMonth,
      )
      updateData.appliedAnnualRatePct = resolvedAnnualRatePct
      updateData.insurancePremiumPct =
        chosenOption === 'RENT_PROTEC' ? (platformRates?.insurancePremiumPct ?? 2.0) : 0

      await this.prisma.upward_rent_vault.update({
        where: { id: activeVault.id },
        data: updateData,
      })
      this.logger.log(
        `Assigned DVA ${dvaAccountNumber} and synced rental details to active vault ID ${activeVault.id}`,
      )
    } else {
      // Auto-provision rent vault for the verified investor
      const targetAmountKobo = BigInt(Math.round(resolvedRent * 100))
      const platformRates = this.platformRates ? await this.platformRates.getRates() : null
      const chosenOption = dto.product_option || 'SAVE_AND_EARN'
      const resolvedLockMode: 'LOCKED' | 'FLEXIBLE' =
        chosenOption === 'RENT_PROTEC'
          ? 'LOCKED'
          : dto.lock_mode === 'FLEXIBLE'
            ? 'FLEXIBLE'
            : 'LOCKED'
      const resolvedAnnualRatePct =
        chosenOption === 'RENT_PROTEC'
          ? (platformRates?.rentProtecRatePct ?? 10.0)
          : resolvedLockMode === 'FLEXIBLE'
            ? (platformRates?.flexibleSavingsAnnualRatePct ?? 12.0)
            : (platformRates?.savingsAnnualRatePct ?? 16.0)
      const rawDaysRem = RentSavingsCalculatorEngine.calculateDaysRemaining(resolvedDueDate)
      const minRpInitKobo =
        chosenOption === 'RENT_PROTEC'
          ? RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
              targetAmountKobo,
              rawDaysRem,
            )
          : 0n
      const providedInitKobo = dto.initial_deposit_kobo
        ? BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
        : 0n
      const resolvedInitKobo =
        chosenOption === 'RENT_PROTEC' && providedInitKobo < minRpInitKobo
          ? minRpInitKobo
          : providedInitKobo

      let plannedMonthlyKobo =
        dto.planned_monthly_deposit_kobo && dto.planned_monthly_deposit_kobo > 0
          ? BigInt(Math.round(dto.planned_monthly_deposit_kobo))
          : 0n
      if (plannedMonthlyKobo === 0n) {
        try {
          const sim = RentSavingsCalculatorEngine.simulate({
            targetAmountKobo,
            contractualDueDate: resolvedDueDate,
            initialDepositKobo: resolvedInitKobo,
            cadence: 'MONTHLY',
            productOption: chosenOption,
            lockMode: resolvedLockMode,
            planPattern: chosenOption === 'RENT_PROTEC' ? 'INITIAL_DEPOSIT' : (dto.plan_pattern || 'INITIAL_DEPOSIT'),
            paydayDayOfMonth: clampReminderDay(dto.payday_day_of_month),
            annualNetYieldRate: resolvedAnnualRatePct / 100,
            maxSavingsMonths: platformRates?.maxSavingsMonths ?? 11,
            rentProtecMinMonths: platformRates?.rentProtecMinMonths ?? 6,
            insurancePremiumPct:
              chosenOption === 'RENT_PROTEC' ? (platformRates?.insurancePremiumPct ?? 2.0) : 0,
          })
          plannedMonthlyKobo = sim.periodicDepositKobo
        } catch {
          plannedMonthlyKobo = 0n
        }
      }

      const newVault = await this.prisma.upward_rent_vault.create({
        data: {
          userId,
          targetAmountKobo,
          currentPrincipalKobo: 0n,
          accruedYieldKobo: 0n,
          cadence: dto.cadence || 'MONTHLY',
          productOption: chosenOption,
          lockMode: resolvedLockMode,
          planPattern: chosenOption === 'RENT_PROTEC' ? 'INITIAL_DEPOSIT' : (dto.plan_pattern || 'INITIAL_DEPOSIT'),
          initialDepositKobo: resolvedInitKobo,
          plannedMonthlyDepositKobo: plannedMonthlyKobo,
          paydayDayOfMonth: clampReminderDay(dto.payday_day_of_month),
          appliedAnnualRatePct: resolvedAnnualRatePct,
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

      if (this.applyReservedSavingsCashbackUseCase) {
        await this.applyReservedSavingsCashbackUseCase
          .execute(userId, newVault.id)
          .catch(() => {})
      }
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
        bankDetails: resolvedBankDetails
          ? {
              bankName: resolvedBankDetails.bankName,
              accountName: resolvedBankDetails.accountName,
              accountNumber: resolvedBankDetails.accountNumber,
              bankCode: resolvedBankDetails.bankCode,
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
