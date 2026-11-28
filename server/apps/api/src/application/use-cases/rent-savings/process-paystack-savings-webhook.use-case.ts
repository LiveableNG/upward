import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
  TransactionVerification,
} from '../../../domains/payments/payment.repository'
import { ARM_JOB_QUEUE, IArmJobQueue } from '../../../domains/rent-savings/arm-job.interface'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { RentVaultUpdatedEvent } from '../../events/definition/rent-vault-updated.event'

export interface PaystackWebhookPayload {
  event: string
  data: {
    reference: string
    amount: number // in kobo
    currency: string
    channel?: string
    status?: string
    customer?: {
      customer_code?: string
      email?: string
    }
    dedicated_account?: {
      account_number?: string
      bank?: { name?: string }
    }
    authorization?: {
      receiver_bank_account_number?: string
    }
    metadata?: {
      vault_id?: string
      receiver_account_number?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

export interface CreditVaultDepositParams {
  vaultId: number
  reference: string
  amountKobo: bigint
  channel: string
  narration: string
  source: 'PAYSTACK_WEBHOOK' | 'DEV_SIMULATION'
  depositKind?: 'MONTHLY' | 'EXTRA_TOPUP' | 'INITIAL_DEPOSIT' | null
  metadata?: Record<string, unknown>
}

@Injectable()
export class ProcessPaystackSavingsWebhookUseCase {
  private readonly logger = new Logger(ProcessPaystackSavingsWebhookUseCase.name)
  private readonly secretKey: string

  constructor(
    private readonly configService: ConfigService,
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
    @Optional()
    @Inject(EVENT_BUS)
    private readonly eventBus?: EventBus,
  ) {
    this.secretKey = (this.configService.get<string>('PAYSTACK_SECRET_KEY') || '').trim()
  }

  /**
   * Cryptographic HMAC-SHA512 signature verification using constant-time comparison.
   * Always strictly enforced on the public Paystack webhook in ALL environments.
   */
  public verifySignature(
    rawBody: string | Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    if (!this.secretKey || !signatureHeader || !rawBody) {
      return false
    }

    const expectedHex = crypto
      .createHmac('sha512', this.secretKey)
      .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8'))
      .digest('hex')

    const expectedBuf = Buffer.from(expectedHex, 'utf8')
    const providedBuf = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8')

    if (expectedBuf.length !== providedBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf)
  }

  async execute(
    payload: PaystackWebhookPayload,
    signatureHeader?: string,
    rawBody?: string | Buffer,
  ) {
    if (!this.secretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured; rejecting savings webhook')
      throw new UnauthorizedException('Webhook secret is not configured')
    }

    if (!this.verifySignature(rawBody, signatureHeader)) {
      this.logger.error('Missing or invalid Paystack savings webhook signature')
      throw new UnauthorizedException('Invalid webhook signature')
    }

    if (
      payload?.event !== 'charge.success' &&
      payload?.event !== 'dedicatedaccount.payment.success'
    ) {
      this.logger.log(`Ignoring unsupported Paystack event: ${payload?.event}`)
      return { status: 'ignored', message: `Unhandled event: ${payload?.event}` }
    }

    return this.verifyAndProcessPaystackDeposit(payload.data)
  }

  /**
   * Authoritatively verifies a Paystack deposit via Paystack's Verify Transaction API
   * (`GET /transaction/verify/:reference`), binds it strictly to the rightful rent vault,
   * atomically credits the vault + persists the ARM outbox job in Postgres, and enqueues
   * the ARM investment in BullMQ so the HTTP response returns fast (<200ms).
   */
  async verifyAndProcessPaystackDeposit(data: PaystackWebhookPayload['data']) {
    const reference = String(data?.reference || '').trim()
    if (!reference) {
      throw new BadRequestException('Missing Paystack transaction reference')
    }

    // Fast pre-check before outbound Paystack API call
    const existingVaultTx = await this.rentVaultRepo.findTransactionByReference(reference)
    if (existingVaultTx) {
      this.logger.warn(`Duplicate Paystack deposit reference ignored: ${reference}`)
      return { status: 'already_processed', reference }
    }

    // Cross-system replay protection: reject if reference was already used for a non-savings payment
    if (this.prisma?.upward_transaction) {
      const existingGeneralTx = await this.prisma.upward_transaction.findUnique({
        where: { reference },
        select: { id: true },
      })
      if (existingGeneralTx) {
        this.logger.warn(
          `Cross-payment replay blocked: reference ${reference} already belongs to upward_transaction #${existingGeneralTx.id}`,
        )
        return {
          status: 'ignored',
          message: 'Reference already processed in general payments ledger',
          reference,
        }
      }
    }

    // MANDATORY server-side verification with Paystack API — never trust webhook payload alone!
    const verification: TransactionVerification =
      await this.paymentGateway.verifyTransaction(reference)

    if (!verification || !verification.status) {
      this.logger.error(
        `Paystack server-side verification failed for reference ${reference} (gatewayStatus=${verification?.gatewayStatus || 'unknown'})`,
      )
      throw new UnauthorizedException('Transaction could not be verified with Paystack')
    }

    const verifiedCurrency = (verification.currency || 'NGN').toUpperCase()
    if (verifiedCurrency !== 'NGN') {
      this.logger.error(
        `Unsupported currency '${verifiedCurrency}' returned by Paystack for reference ${reference}`,
      )
      throw new BadRequestException(`Unsupported deposit currency: ${verifiedCurrency}`)
    }

    const verifiedAmountKobo =
      verification.amountKobo !== undefined
        ? verification.amountKobo
        : BigInt(Math.round((verification.amount || 0) * 100))

    if (verifiedAmountKobo <= 0n) {
      return { status: 'ignored', message: 'Verified amount is zero or negative', reference }
    }

    if (data?.amount !== undefined && data?.amount !== null) {
      const payloadAmountKobo = BigInt(Math.round(Number(data.amount)))
      if (payloadAmountKobo !== verifiedAmountKobo) {
        this.logger.error(
          `SECURITY ALERT: Amount mismatch for reference ${reference}. Webhook payload=${payloadAmountKobo} kobo vs Paystack verified=${verifiedAmountKobo} kobo`,
        )
        throw new UnauthorizedException('Webhook amount does not match verified Paystack amount')
      }
    }

    let parsedPayloadMeta: Record<string, unknown> | undefined =
      typeof data?.metadata === 'object' && data.metadata !== null ? data.metadata : undefined
    if (typeof data?.metadata === 'string') {
      try {
        parsedPayloadMeta = JSON.parse(data.metadata)
      } catch {
        parsedPayloadMeta = undefined
      }
    }

    // Resolve target vault strictly using Paystack-verified correlation data first
    const verifiedReceiverAccount = verification.receiverAccountNumber?.trim()
    const verifiedMetaVaultId =
      typeof verification.metadata?.vault_id === 'string'
        ? verification.metadata.vault_id.trim()
        : undefined
    const payloadDvaAccount =
      (typeof data?.dedicated_account === 'string'
        ? data.dedicated_account
        : data?.dedicated_account?.account_number) ||
      data?.authorization?.receiver_bank_account_number ||
      (typeof parsedPayloadMeta?.receiver_account_number === 'string'
        ? parsedPayloadMeta.receiver_account_number
        : undefined)

    let vault = null

    if (verifiedReceiverAccount) {
      vault = await this.rentVaultRepo.findByDvaAccountNumber(verifiedReceiverAccount)
    }

    if (!vault && verifiedMetaVaultId) {
      vault = await this.rentVaultRepo.findByUuid(verifiedMetaVaultId)
    }

    if (
      !vault &&
      payloadDvaAccount &&
      (!verification.channel ||
        verification.channel === 'dedicated_nuban' ||
        verification.channel === 'dedicated_account')
    ) {
      vault = await this.rentVaultRepo.findByDvaAccountNumber(String(payloadDvaAccount).trim())
    }

    if (!vault) {
      this.logger.warn(
        `Could not correlate verified Paystack deposit ${reference} to an active rent vault`,
      )
      return { status: 'vault_not_found', reference }
    }

    // Customer ownership binding check: prevent replaying someone else's valid Paystack ref into another vault
    const verifiedCustomerCode = verification.customerCode?.trim()
    if (
      verifiedCustomerCode &&
      vault.dvaCustomerCode &&
      verifiedCustomerCode !== vault.dvaCustomerCode
    ) {
      this.logger.error(
        `SECURITY ALERT: Paystack customer_code mismatch for ref ${reference}. Expected ${vault.dvaCustomerCode}, got ${verifiedCustomerCode}`,
      )
      throw new UnauthorizedException('Paystack customer does not match target rent vault')
    }

    const verifiedCustomerEmail = verification.customerEmail?.trim().toLowerCase()
    if (verifiedCustomerEmail && !verifiedReceiverAccount && this.prisma?.upward_user) {
      const vaultOwner = await this.prisma.upward_user.findUnique({
        where: { id: vault.userId },
        select: { email: true },
      })
      if (vaultOwner?.email) {
        let ownerEmail = vaultOwner.email
        try {
          ownerEmail = this.encryption.decrypt(vaultOwner.email)
        } catch {
          // Plaintext fallback in unit test mocks
        }
        if (ownerEmail.trim().toLowerCase() !== verifiedCustomerEmail) {
          this.logger.error(
            `SECURITY ALERT: Paystack customer email mismatch for ref ${reference} against vault ${vault.uuid}`,
          )
          throw new UnauthorizedException('Paystack customer email does not match target vault')
        }
      }
    }

    if (vault.lockStatus === 'SETTLED' || vault.lockStatus === 'BROKEN_OUT') {
      this.logger.warn(
        `Verified Paystack deposit ${reference} arrived for closed vault ${vault.uuid} (${vault.lockStatus})`,
      )
      return { status: 'vault_closed', vault_id: vault.uuid, reference }
    }

    const effectiveChannel = verification.channel || data?.channel || 'DVA_NIP'
    const customNarration =
      (typeof verification.metadata?.narration === 'string' && verification.metadata.narration.trim()) ||
      (typeof parsedPayloadMeta?.narration === 'string' && parsedPayloadMeta.narration.trim()) ||
      null

    return this.creditVaultAndEnqueueArm({
      vaultId: vault.id,
      reference,
      amountKobo: verifiedAmountKobo,
      channel: effectiveChannel,
      narration: customNarration || `Rent savings deposit via ${effectiveChannel}`,
      source: 'PAYSTACK_WEBHOOK',
      metadata: {
        paystackVerified: true,
        paystackVerifiedAt: new Date().toISOString(),
        paystackPaidAt: verification.paidAt || null,
        paystackCustomerCode: verifiedCustomerCode || null,
        paystackCustomerEmail: verifiedCustomerEmail || null,
        paystackReceiverAccount: verifiedReceiverAccount || payloadDvaAccount || null,
      },
    })
  }

  /**
   * Atomically credits the vault balance, writes the unique deposit ledger entry,
   * and inserts a durable `upward_arm_job` outbox record inside ONE Postgres transaction,
   * then enqueues the ARM purchase onto BullMQ.
   *
   * Zero double-crediting & zero double-firing guarantee:
   * - `FOR UPDATE` row lock serializes concurrent updates to the same vault
   * - `@unique reference` on `upward_rent_vault_transaction` + P2002 handling blocks concurrent duplicates
   * - `@unique idempotencyKey` (`ARM_SUBSCRIBE__${reference}`) on `upward_arm_job` guarantees at most 1 job
   */
  async creditVaultAndEnqueueArm(params: CreditVaultDepositParams) {
    const { vaultId, reference, amountKobo, channel, narration, source, metadata } = params

    if (amountKobo <= 0n) {
      throw new BadRequestException('Deposit amount must be greater than zero')
    }

    const armTransactionId = crypto.randomUUID()
    const idempotencyKey = `ARM_SUBSCRIBE__${reference}`

    let commitResult: {
      alreadyProcessed: boolean
      vaultUuid: string
      vaultId: number
      userId: number
      targetAmountKobo: bigint
      newBalanceKobo: bigint
      armJob: {
        id: number
        uuid: string
        idempotencyKey: string
        jobType: 'SUBSCRIBE'
      } | null
    }

    try {
      commitResult = await this.prisma.$transaction(async (tx) => {
        // 1. Lock the vault row to serialize concurrent deposits cleanly
        if (typeof tx.$queryRaw === 'function') {
          await tx.$queryRaw`SELECT id FROM upward_rent_vault WHERE id = ${vaultId} FOR UPDATE`
        }

        // 2. Re-check idempotency inside the transaction lock
        const existingTx = await tx.upward_rent_vault_transaction.findUnique({
          where: { reference },
        })
        if (existingTx) {
          const lockedVault = await tx.upward_rent_vault.findUnique({
            where: { id: vaultId },
            select: { uuid: true, targetAmountKobo: true, userId: true },
          })
          return {
            alreadyProcessed: true,
            vaultUuid: lockedVault?.uuid || '',
            vaultId,
            userId: existingTx.userId,
            targetAmountKobo: lockedVault?.targetAmountKobo ?? 0n,
            newBalanceKobo: existingTx.balanceAfterKobo,
            armJob: null,
          }
        }

        // 3. Re-read fresh locked vault state
        const freshVault = await tx.upward_rent_vault.findUniqueOrThrow({
          where: { id: vaultId },
        })

        if (freshVault.lockStatus === 'SETTLED' || freshVault.lockStatus === 'BROKEN_OUT') {
          throw new BadRequestException('Cannot credit a closed rent vault')
        }

        const currentBalanceKobo = freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
        const newBalanceKobo = currentBalanceKobo + amountKobo
        const now = new Date()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

        // 3b. Deterministic Deposit Classification (handles direct bank transfers & dual flows):
        //     - INITIAL_DEPOSIT when first deposit on an upfront-deposit vault
        //     - MONTHLY_CONTRIBUTION / PARTIAL_MONTHLY until this calendar month's target is filled (keeps plannedMonthlyDepositKobo fixed)
        //     - EXTRA_TOPUP once this month is already filled (or explicitly chosen) -> reduces future monthly payments
        let currentMonthAppliedKobo = 0n
        if (tx.upward_rent_vault_transaction?.findMany) {
          const monthDeposits = await tx.upward_rent_vault_transaction.findMany({
            where: {
              vaultId: freshVault.id,
              type: 'DEPOSIT',
              createdAt: { gte: monthStart },
            },
            select: { amountKobo: true, metadata: true },
          })
          for (const dep of monthDeposits) {
            const cls = (dep.metadata as any)?.depositClassification
            if (cls === 'MONTHLY_CONTRIBUTION' || cls === 'PARTIAL_MONTHLY' || !cls) {
              currentMonthAppliedKobo += dep.amountKobo
            }
          }
        }

        const existingPlannedMonthlyKobo = BigInt((freshVault as any).plannedMonthlyDepositKobo ?? 0n)
        const classificationResult = RentSavingsCalculatorEngine.classifyDirectDeposit({
          currentPrincipalKobo: freshVault.currentPrincipalKobo,
          initialDepositKobo: freshVault.initialDepositKobo,
          plannedMonthlyDepositKobo: existingPlannedMonthlyKobo,
          currentMonthAppliedKobo,
          depositAmountKobo: amountKobo,
          explicitDepositKind: params.depositKind ?? null,
        })

        let nextPlannedMonthlyKobo: bigint | undefined
        if (classificationResult.shouldRecalculateMonthlyTarget) {
          const annualRateDecimal =
            (freshVault.appliedAnnualRatePct && freshVault.appliedAnnualRatePct > 0
              ? freshVault.appliedAnnualRatePct
              : freshVault.productOption === 'RENT_PROTEC'
                ? 10.0
                : (freshVault as any).lockMode === 'FLEXIBLE'
                  ? 12.0
                  : 16.0) / 100
          nextPlannedMonthlyKobo = RentSavingsCalculatorEngine.recalculateMonthlyTargetKobo({
            targetAmountKobo: freshVault.targetAmountKobo,
            currentBalanceKobo: newBalanceKobo,
            contractualDueDate: freshVault.contractualDueDate,
            annualNetYieldRate: annualRateDecimal,
            currentPlannedMonthlyKobo: existingPlannedMonthlyKobo,
            asOfDate: now,
            paydayDayOfMonth: freshVault.paydayDayOfMonth ?? 28,
            currentMonthAlreadyFulfilled:
              classificationResult.classification === 'EXTRA_TOPUP',
          })
        }

        const classifiedNarration =
          classificationResult.classification === 'INITIAL_DEPOSIT'
            ? 'Initial rent savings deposit'
            : classificationResult.classification === 'MONTHLY_CONTRIBUTION'
              ? classificationResult.surplusForMonthKobo > 0n
                ? `Monthly rent savings contribution (includes ₦${Math.round(Number(classificationResult.surplusForMonthKobo) / 100).toLocaleString()} extra)`
                : 'Monthly rent savings contribution'
              : classificationResult.classification === 'PARTIAL_MONTHLY'
                ? 'Partial monthly rent savings contribution'
                : 'Extra top-up (reduces remaining monthly contributions)'

        // 4. Create unique ledger transaction
        const createdTx = await tx.upward_rent_vault_transaction.create({
          data: {
            vaultId: freshVault.id,
            userId: freshVault.userId,
            type: 'DEPOSIT',
            amountKobo,
            principalDeltaKobo: amountKobo,
            yieldDeltaKobo: 0n,
            balanceAfterKobo: newBalanceKobo,
            reference,
            channel,
            narration: narration && !narration.startsWith('Rent savings deposit via') ? narration : classifiedNarration,
            metadata: {
              ...(metadata || {}),
              source,
              depositClassification: classificationResult.classification,
              surplusForMonthKobo: Number(classificationResult.surplusForMonthKobo),
              ...(nextPlannedMonthlyKobo !== undefined
                ? { updatedPlannedMonthlyDepositKobo: Number(nextPlannedMonthlyKobo) }
                : {}),
              armSyncStatus: freshVault.investmentProvider ? 'QUEUED' : 'NOT_APPLICABLE',
              ...(freshVault.investmentProvider ? { armTransactionId } : {}),
              receivedAt: now.toISOString(),
            } as any,
          },
        })

        // 5. Atomically increment vault principal balance (and update plannedMonthlyDepositKobo ONLY on Extra Top-Up / initial seed)
        await tx.upward_rent_vault.update({
          where: { id: freshVault.id },
          data: {
            currentPrincipalKobo: { increment: amountKobo },
            ...(nextPlannedMonthlyKobo !== undefined
              ? { plannedMonthlyDepositKobo: nextPlannedMonthlyKobo }
              : {}),
          },
        })

        // 5b. Rent Protec 20%/25% Safe Activation Guardrail:
        // Only activate coverage & book Upward's upfront 2% insurer premium obligation
        // once cumulative funded principal reaches the safe threshold (20% for 7+ mo, 25% for 6 mo).
        if (
          freshVault.productOption === 'RENT_PROTEC' &&
          tx.upward_vault_treasury_summary &&
          tx.upward_savings_internal_ledger
        ) {
          const newPrincipalKobo = freshVault.currentPrincipalKobo + amountKobo
          const termDays = Math.max(
            1,
            Math.ceil(
              (freshVault.contractualDueDate.getTime() - freshVault.createdAt.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
          const thresholdPct =
            RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(termDays)
          const thresholdKobo =
            RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
              freshVault.targetAmountKobo,
              termDays,
            )

          if (newPrincipalKobo >= thresholdKobo) {
            const existingSummary = await tx.upward_vault_treasury_summary.findUnique({
              where: { vaultId: freshVault.id },
            })
            if (!existingSummary || existingSummary.upfrontPremiumObligationKobo === 0n) {
              const premPct =
                freshVault.insurancePremiumPct > 0 ? freshVault.insurancePremiumPct : 2.0
              const obligationKobo = BigInt(
                Math.round(Number(freshVault.targetAmountKobo) * (premPct / 100)),
              )
              if (existingSummary) {
                const alreadySpread = existingSummary.platformSpreadAccruedKobo
                const initialRecovered =
                  alreadySpread < obligationKobo ? alreadySpread : obligationKobo
                const initialUnrecovered = obligationKobo - initialRecovered
                const nextMargin =
                  alreadySpread > obligationKobo ? alreadySpread - obligationKobo : 0n
                await tx.upward_vault_treasury_summary.update({
                  where: { vaultId: freshVault.id },
                  data: {
                    upfrontPremiumObligationKobo: obligationKobo,
                    premiumRecoveredKobo: initialRecovered,
                    unrecoveredPremiumKobo: initialUnrecovered,
                    netPlatformMarginKobo: nextMargin,
                  },
                })
              } else {
                await tx.upward_vault_treasury_summary.create({
                  data: {
                    vaultId: freshVault.id,
                    productOption: 'RENT_PROTEC',
                    upfrontPremiumObligationKobo: obligationKobo,
                    unrecoveredPremiumKobo: obligationKobo,
                  },
                })
              }

              await tx.upward_savings_internal_ledger.create({
                data: {
                  vaultId: freshVault.id,
                  entryType: 'PREMIUM_OBLIGATION',
                  productOption: 'RENT_PROTEC',
                  principalBaseKobo: newPrincipalKobo,
                  customerRatePct: freshVault.appliedAnnualRatePct,
                  premiumObligationDeltaKobo: obligationKobo,
                  reference: `PREM_ACT_${freshVault.id}_${reference}`,
                  notes: `Rent Protec coverage activated upon reaching ${thresholdPct}% funding threshold (upfront ${premPct}% insurer premium booked internally)`,
                },
              })
            }
          }
        }

        // 6. Atomically write durable ARM job into Postgres transactional outbox
        let armJob: {
          id: number
          uuid: string
          idempotencyKey: string
          jobType: 'SUBSCRIBE'
        } | null = null

        if (freshVault.investmentProvider) {
          const createdJob = await tx.upward_arm_job.create({
            data: {
              idempotencyKey,
              jobType: 'SUBSCRIBE',
              status: 'QUEUED',
              vaultId: freshVault.id,
              userId: freshVault.userId,
              transactionId: createdTx.id,
              amountKobo,
              reference,
              armTransactionId,
              maxAttempts: 5,
              payload: {
                provider: freshVault.investmentProvider,
                membershipId: freshVault.providerMembershipId || 'OMNIBUS_MASTER',
                productCode: 'ARMMMF',
                amountKobo: amountKobo.toString(),
                armReference: `ARM-${reference}`,
                reInvestDividends: true,
                source,
              } as any,
            },
          })

          armJob = {
            id: createdJob.id,
            uuid: createdJob.uuid,
            idempotencyKey: createdJob.idempotencyKey,
            jobType: 'SUBSCRIBE',
          }
        }

        return {
          alreadyProcessed: false,
          vaultUuid: freshVault.uuid,
          vaultId: freshVault.id,
          userId: freshVault.userId,
          targetAmountKobo: freshVault.targetAmountKobo,
          newBalanceKobo,
          armJob,
        }
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.warn(
          `Concurrent duplicate deposit atomically blocked by DB unique constraint: ${reference}`,
        )
        return { status: 'already_processed', reference }
      }
      throw err
    }

    if (commitResult.alreadyProcessed) {
      this.logger.warn(`Duplicate deposit ignored inside transaction lock: ${reference}`)
      return { status: 'already_processed', reference }
    }

    this.logger.log(
      `Atomically credited vault ${commitResult.vaultUuid} with ₦${Number(amountKobo) / 100} (ref=${reference}, armJob=${commitResult.armJob?.uuid || 'none'})`,
    )

    // 7. Dispatch to BullMQ after Postgres commit (if Redis blips, 2-min outbox reconciler recovers)
    let queuedInRedis = false
    if (commitResult.armJob && this.armJobQueue) {
      queuedInRedis = await this.armJobQueue.enqueueJob(commitResult.armJob)
    }

    // 8. Emit real-time domain event so SSE clients (e.g. FundVaultModal) reflect balance immediately
    if (this.eventBus) {
      try {
        this.eventBus.publish(
          new RentVaultUpdatedEvent(
            commitResult.userId,
            commitResult.vaultUuid,
            Number(amountKobo),
            reference,
          ),
        )
      } catch (err: any) {
        this.logger.warn(`Failed to publish RentVaultUpdatedEvent: ${err?.message}`)
      }
    }

    // 9. For non-ARM vaults only, create immediate in-app notification (ARM vaults notify via ArmNotificationProcessorService after ARM confirms)
    if (!commitResult.armJob && this.prisma?.upward_notification) {
      const amountNaira = Number(amountKobo) / 100
      const balanceNaira = Number(commitResult.newBalanceKobo) / 100
      await this.prisma.upward_notification
        .create({
          data: {
            userId: commitResult.userId,
            title: 'Rent Savings Credited',
            message: `NGN ${amountNaira.toLocaleString()} has been added to your Rent Savings wallet. New balance: NGN ${balanceNaira.toLocaleString()}.`,
            type: 'PAYMENT',
            url: '/dashboard/savings',
          },
        })
        .catch((err: any) => {
          this.logger.warn(`Failed to create rent savings deposit notification: ${err?.message}`)
        })
    }

    // 10. Update savings score asynchronously (non-blocking for ledger consistency)
    await this.updateSavingsScoreOnDeposit(
      commitResult.vaultId,
      commitResult.userId,
      commitResult.targetAmountKobo,
      commitResult.newBalanceKobo,
    )

    return {
      status: 'success',
      vault_id: commitResult.vaultUuid,
      amount_kobo: Number(amountKobo),
      reference,
      arm_job_id: commitResult.armJob?.uuid || null,
      arm_job_status: commitResult.armJob ? (queuedInRedis ? 'QUEUED' : 'OUTBOX_PENDING') : null,
    }
  }

  private async updateSavingsScoreOnDeposit(
    vaultId: number,
    userId: number,
    targetAmountKobo: bigint,
    newBalanceKobo: bigint,
  ) {
    try {
      const currentScore = await this.rentVaultRepo.findSavingsScoreByVaultId(vaultId)
      const targetNum = Number(targetAmountKobo)
      const balanceNum = Number(newBalanceKobo)
      const ratio = targetNum > 0 ? balanceNum / targetNum : 0

      const goalPoints = Math.min(50, Math.round(ratio * 50))
      const currentCadence = currentScore?.cadencePoints ?? 0
      const newCadence = Math.min(50, currentCadence + 10)
      const totalScore = Math.min(100, newCadence + goalPoints)

      await this.rentVaultRepo.upsertSavingsScore(vaultId, userId, {
        cadencePoints: newCadence,
        velocityPoints: goalPoints,
        loanDisciplinePoints: 0,
        totalScore,
        historyLog: [
          ...(currentScore?.historyLog || []),
          {
            reason: `Deposit milestone reached (${Math.round(ratio * 100)}%)`,
            delta: totalScore - (currentScore?.totalScore || 20),
            timestamp: new Date().toISOString(),
          },
        ],
      })
    } catch (err) {
      this.logger.error(`Error updating savings score for vault ${vaultId}`, err)
    }
  }
}
