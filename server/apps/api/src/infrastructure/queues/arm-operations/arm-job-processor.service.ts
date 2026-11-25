import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { UnrecoverableError } from 'bullmq'
import * as fs from 'fs/promises'
import * as path from 'path'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { AssetManagementProviderRegistry } from '../../providers/asset-management/asset-management-provider.registry'
import { ArmConnectInvestmentProvider } from '../../providers/asset-management/arm-connect-investment.provider'
import {
  ArmOperationError,
  InvestorOnboardingRequest,
  OnboardingDocumentAsset,
} from '../../../domains/rent-savings/asset-management.provider'
import {
  ARM_NOTIFICATION_QUEUE,
  IArmNotificationQueue,
} from '../../../domains/rent-savings/arm-job.interface'
import { ArmNotificationProcessorService } from './arm-notification-processor.service'

export interface ArmJobProcessResult {
  status: 'completed' | 'already_completed' | 'skipped_locked_or_done' | 'not_found'
  armInstructionId?: string | null
  reconciledExisting?: boolean
}

@Injectable()
export class ArmJobProcessorService {
  private readonly logger = new Logger(ArmJobProcessorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetManagementProviderRegistry,
    @Optional()
    @Inject(ARM_NOTIFICATION_QUEUE)
    private readonly notificationQueue?: IArmNotificationQueue,
    @Optional()
    private readonly notificationProcessor?: ArmNotificationProcessorService,
    @Optional()
    private readonly s3Service?: S3Service,
  ) {}

  /**
   * Atomically claims and executes a durable ARM job from `upward_arm_job`.
   * Guarantees:
   * 1. Never executes if `armInstructionId` is already persisted or status is `COMPLETED`.
   * 2. Only ONE concurrent worker can transition `QUEUED -> PROCESSING` via Postgres CAS lock.
   * 3. On retries (attempt > 1), queries ARM `GET /product/Transactions?TransactionId=...`
   *    (both primary and omnibus-fallback deterministic UUIDs) BEFORE ever re-submitting.
   * 4. On success -> enqueues independent `USER_SUCCESS` + `ADMIN_SUCCESS` jobs onto `arm-notifications`
   *    (so email outages retry independently and NEVER re-run ARM).
   * 5. On terminal failure -> enqueues `ADMIN_FAILURE` ONLY onto `arm-notifications` (never alarms user).
   */
  async processArmJob(
    armJobId: number,
    options?: { isFinalBullMqAttempt?: boolean },
  ): Promise<ArmJobProcessResult> {
    const job = await this.prisma.upward_arm_job.findUnique({
      where: { id: armJobId },
    })

    if (!job) {
      this.logger.warn(`ARM job ID ${armJobId} not found in database; skipping.`)
      return { status: 'not_found' }
    }

    // Hard Guard #1: Never re-execute an already-completed or instruction-assigned job
    if (job.status === 'COMPLETED' || job.armInstructionId) {
      this.logger.log(
        `ARM job ${job.uuid} (${job.idempotencyKey}) already completed with instructionId=${job.armInstructionId}; skipping duplicate execution.`,
      )
      await this.dispatchSuccessNotifications(job)
      return {
        status: 'already_completed',
        armInstructionId: job.armInstructionId,
      }
    }

    // Hard Guard #2: Atomic Postgres Compare-And-Swap lock (QUEUED -> PROCESSING)
    const claim = await this.prisma.upward_arm_job.updateMany({
      where: {
        id: job.id,
        status: 'QUEUED',
        armInstructionId: null,
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        lockedAt: new Date(),
      },
    })

    if (claim.count === 0) {
      this.logger.warn(
        `ARM job ${job.uuid} (${job.idempotencyKey}) could not be claimed (already PROCESSING, COMPLETED, or FAILED); skipping.`,
      )
      return { status: 'skipped_locked_or_done' }
    }

    const currentAttempt = job.attempts + 1
    const payload = (job.payload as Record<string, any>) || {}
    const providerKey = String(payload.provider || 'ARM')
    const provider = this.providerRegistry.getProvider(providerKey)

    this.logger.log(
      `Processing ARM job ${job.uuid} [${job.jobType}] ref=${job.reference} attempt=${currentAttempt}/${job.maxAttempts} armTxId=${job.armTransactionId}`,
    )

    try {
      // Hard Guard #3: Before retrying a SUBSCRIBE or REDEEM call, verify with ARM whether
      // the previous attempt already succeeded before crashing/timing out!
      if (
        currentAttempt > 1 &&
        (job.jobType === 'SUBSCRIBE' || job.jobType === 'REDEEM') &&
        provider.getTransactionStatus
      ) {
        const recovered = await this.checkExistingArmExecution(
          provider,
          job.jobType,
          job.armTransactionId,
        )
        if (recovered) {
          this.logger.log(
            `Recovered already-executed ARM instruction for job ${job.uuid} on retry (instructionId=${recovered.armInstructionId}); avoiding duplicate ARM call!`,
          )
          await this.finalizeSuccess(job, {
            armInstructionId: recovered.armInstructionId,
            armTransactionId: recovered.armTransactionId,
            result: {
              reconciledOnRetry: true,
              ...recovered,
            },
          })
          return {
            status: 'completed',
            armInstructionId: recovered.armInstructionId,
            reconciledExisting: true,
          }
        }
      }

      // Execute the authoritative ARM call using the pre-committed armTransactionId
      if (job.jobType === 'SUBSCRIBE') {
        const amountKobo = job.amountKobo ?? BigInt(payload.amountKobo || 0)
        if (amountKobo <= 0n) {
          throw new ArmOperationError('Invalid subscription amount (<= 0)', 400, false)
        }

        const purchaseRes = await provider.subscribe({
          membershipId: String(payload.membershipId || 'OMNIBUS_MASTER'),
          productCode: String(payload.productCode || 'ARMMMF'),
          amountKobo,
          reference: String(payload.armReference || `ARM-${job.reference}`),
          reInvestDividends: payload.reInvestDividends !== false,
          transactionId: job.armTransactionId,
        })

        const instructionId =
          purchaseRes.purchaseId || purchaseRes.transactionId || job.armTransactionId
        await this.finalizeSuccess(job, {
          armInstructionId: instructionId,
          armTransactionId: purchaseRes.transactionId || job.armTransactionId,
          result: {
            purchaseId: purchaseRes.purchaseId || null,
            transactionId: purchaseRes.transactionId || job.armTransactionId,
            membershipId: purchaseRes.membershipId || null,
            accountNumber: purchaseRes.accountNumber || null,
            unitsAllocated: purchaseRes.unitsAllocated ?? null,
            message: purchaseRes.message || 'ARM subscription completed',
          },
        })

        return {
          status: 'completed',
          armInstructionId: instructionId,
        }
      }

      if (job.jobType === 'REDEEM') {
        const amountKobo = job.amountKobo ?? BigInt(payload.amountKobo || 0)
        if (amountKobo <= 0n) {
          throw new ArmOperationError('Invalid redemption amount (<= 0)', 400, false)
        }

        const redeemRes = await provider.redeem({
          membershipId: String(payload.membershipId || 'OMNIBUS_MASTER'),
          productCode: String(payload.productCode || 'ARMMMF'),
          productAccountNumber: String(payload.productAccountNumber || 'OMNIBUS_FLOAT_01'),
          amountKobo,
          reference: String(payload.armReference || `RED-${job.reference}`),
          transactionId: job.armTransactionId,
        })

        const instructionId =
          redeemRes.withdrawalId || redeemRes.transactionId || job.armTransactionId
        await this.finalizeSuccess(job, {
          armInstructionId: instructionId,
          armTransactionId: redeemRes.transactionId || job.armTransactionId,
          result: {
            withdrawalId: redeemRes.withdrawalId || null,
            transactionId: redeemRes.transactionId || job.armTransactionId,
            membershipId: redeemRes.membershipId || null,
            accountNumber: redeemRes.accountNumber || null,
            message: redeemRes.message || 'ARM redemption completed',
            reason: payload.reason || 'SETTLEMENT',
          },
        })

        return {
          status: 'completed',
          armInstructionId: instructionId,
        }
      }

      if (job.jobType === 'ONBOARD') {
        if (!provider.onboardInvestor) {
          throw new ArmOperationError(
            `Provider ${provider.providerName} does not support investor onboarding`,
            400,
            false,
          )
        }
        const onboardingPayload = payload.onboardingRequest as InvestorOnboardingRequest
        if (!onboardingPayload) {
          throw new ArmOperationError('Missing onboardingRequest payload on ARM job', 400, false)
        }

        const hydratedPayload = await this.hydrateOnboardingDocuments(onboardingPayload)
        const onboardRes = await provider.onboardInvestor(hydratedPayload)
        if (!onboardRes.success) {
          const reason = onboardRes.failureReason || 'ARM onboarding rejected'
          const isTransient = /timeout|temporar|unavailable|rate limit|502|503|504|network/i.test(
            reason,
          )
          throw new ArmOperationError(reason, isTransient ? 503 : 400, isTransient)
        }

        const instructionId =
          onboardRes.customerMembershipId || onboardRes.customerId || job.armTransactionId
        await this.finalizeSuccess(job, {
          armInstructionId: instructionId,
          armTransactionId: job.armTransactionId,
          result: {
            status: onboardRes.status,
            customerId: onboardRes.customerId || null,
            trackingId: onboardRes.trackingId || null,
            customerMembershipId: onboardRes.customerMembershipId || null,
            crmAccountNumber: onboardRes.crmAccountNumber || null,
            completedSections: onboardRes.completedSections ?? 63,
          },
        })

        return {
          status: 'completed',
          armInstructionId: instructionId,
        }
      }

      throw new ArmOperationError(`Unsupported ARM jobType: ${job.jobType}`, 400, false)
    } catch (err: any) {
      const errorMessage = err?.message || String(err)
      const isNonRetryable = err instanceof ArmOperationError && !err.retryable
      const exhausted =
        isNonRetryable ||
        currentAttempt >= job.maxAttempts ||
        Boolean(options?.isFinalBullMqAttempt)

      if (!exhausted) {
        this.logger.warn(
          `Transient failure on ARM job ${job.uuid} (attempt ${currentAttempt}/${job.maxAttempts}); releasing lock to QUEUED for backoff retry: ${errorMessage}`,
        )
        await this.prisma.upward_arm_job.updateMany({
          where: {
            id: job.id,
            status: 'PROCESSING',
            armInstructionId: null,
          },
          data: {
            status: 'QUEUED',
            lockedAt: null,
            lastError: errorMessage,
          },
        })
        throw err
      }

      this.logger.error(
        `ARM job ${job.uuid} [${job.jobType}] terminally FAILED after attempt ${currentAttempt}/${job.maxAttempts} (nonRetryable=${isNonRetryable}): ${errorMessage}`,
      )

      await this.finalizeFailure(job, currentAttempt, errorMessage)

      if (isNonRetryable) {
        throw new UnrecoverableError(errorMessage)
      }
      throw err
    }
  }

  private async hydrateOnboardingDocuments(
    request: InvestorOnboardingRequest,
  ): Promise<InvestorOnboardingRequest> {
    if (!request.documents) return request

    const hydrateOne = async (
      doc?: string | OnboardingDocumentAsset,
    ): Promise<string | OnboardingDocumentAsset | undefined> => {
      if (!doc || typeof doc === 'string') return doc
      if (doc.base64) return doc
      if (!doc.s3Key) return doc

      if (doc.s3Key.startsWith('local:')) {
        const relPath = doc.s3Key.slice('local:'.length).replace(/^\/+/, '')
        const absPath = path.resolve(process.cwd(), '.uploads', relPath)
        const buf = await fs.readFile(absPath)
        return { ...doc, base64: buf.toString('base64') }
      }

      if (!this.s3Service) {
        throw new ArmOperationError(
          `Cannot hydrate ARM onboarding document (${doc.s3Key}): S3Service unavailable`,
          500,
          true,
        )
      }
      const buf = await this.s3Service.getFileBuffer(doc.s3Key)
      return { ...doc, base64: buf.toString('base64') }
    }

    const [passport, bvn_passport, id_card, utility_bill] = await Promise.all([
      hydrateOne(request.documents.passport),
      hydrateOne(request.documents.bvn_passport),
      hydrateOne(request.documents.id_card),
      hydrateOne(request.documents.utility_bill),
    ])

    return {
      ...request,
      documents: {
        passport,
        bvn_passport,
        id_card,
        utility_bill,
      },
    }
  }

  private async checkExistingArmExecution(
    provider: ReturnType<AssetManagementProviderRegistry['getProvider']>,
    jobType: string,
    primaryTransactionId: string,
  ): Promise<{ armInstructionId: string; armTransactionId: string; message?: string } | null> {
    if (!provider.getTransactionStatus) return null

    const candidateTxIds = [
      primaryTransactionId,
      ArmConnectInvestmentProvider.deriveOmnibusTransactionId(primaryTransactionId),
    ]

    for (const txId of candidateTxIds) {
      try {
        const items = await provider.getTransactionStatus({ transactionId: txId })
        for (const item of items) {
          const instructionId = jobType === 'SUBSCRIBE' ? item.purchaseId : item.withdrawalId
          if (instructionId) {
            return {
              armInstructionId: instructionId,
              armTransactionId: item.transactionId || txId,
              message: item.message,
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Pre-retry ARM status lookup failed for txId=${txId} (will proceed carefully): ${err?.message}`,
        )
      }
    }

    return null
  }

  private async finalizeSuccess(
    job: {
      id: number
      uuid: string
      idempotencyKey: string
      jobType: string
      vaultId: number | null
      userId: number | null
      transactionId: number | null
      amountKobo: bigint | null
      reference: string
      armTransactionId: string
      payload: unknown
      notifiedUserAt: Date | null
      notifiedAdminAt: Date | null
    },
    outcome: {
      armInstructionId: string
      armTransactionId: string
      result: Record<string, unknown>
    },
  ) {
    const completedAt = new Date()

    await this.prisma.$transaction(async (tx) => {
      await tx.upward_arm_job.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          armInstructionId: outcome.armInstructionId,
          result: outcome.result as any,
          completedAt,
          lockedAt: null,
          lastError: null,
        },
      })

      const resolvedMembershipId =
        typeof outcome.result.membershipId === 'string' && /^\d+$/.test(outcome.result.membershipId)
          ? outcome.result.membershipId
          : null
      const resolvedAccountNumber =
        typeof outcome.result.accountNumber === 'string' && outcome.result.accountNumber.trim()
          ? outcome.result.accountNumber.trim()
          : null

      if (job.jobType === 'SUBSCRIBE') {
        if (job.vaultId) {
          const currentVault = await tx.upward_rent_vault
            .findUnique({
              where: { id: job.vaultId },
              select: { providerMembershipId: true, providerAccountNumber: true },
            })
            .catch(() => null)
          const needsMembershipBackfill =
            resolvedMembershipId &&
            (!currentVault?.providerMembershipId || !/^\d+$/.test(currentVault.providerMembershipId))

          await tx.upward_rent_vault.update({
            where: { id: job.vaultId },
            data: {
              armPurchaseId: outcome.armInstructionId,
              ...(needsMembershipBackfill
                ? {
                    providerMembershipId: resolvedMembershipId,
                    providerAccountNumber:
                      resolvedAccountNumber || `${resolvedMembershipId}-ARMMMF-01`,
                    providerCrmStatus: 'Approved',
                  }
                : {}),
            },
          })
        }
        if (job.transactionId) {
          const existingTx = await tx.upward_rent_vault_transaction.findUnique({
            where: { id: job.transactionId },
            select: { metadata: true },
          })
          const prevMeta = (existingTx?.metadata as Record<string, unknown>) || {}
          await tx.upward_rent_vault_transaction.update({
            where: { id: job.transactionId },
            data: {
              metadata: {
                ...prevMeta,
                armSyncStatus: 'COMPLETED',
                armPurchaseId: outcome.armInstructionId,
                armTransactionId: outcome.armTransactionId,
                ...(resolvedMembershipId ? { armMembershipId: resolvedMembershipId } : {}),
                ...(resolvedAccountNumber ? { armAccountNumber: resolvedAccountNumber } : {}),
                armCompletedAt: completedAt.toISOString(),
              } as any,
            },
          })
        }
      } else if (job.jobType === 'REDEEM') {
        if (job.vaultId) {
          const currentVault = await tx.upward_rent_vault
            .findUnique({
              where: { id: job.vaultId },
              select: { providerMembershipId: true },
            })
            .catch(() => null)
          const needsMembershipBackfill =
            resolvedMembershipId &&
            (!currentVault?.providerMembershipId || !/^\d+$/.test(currentVault.providerMembershipId))

          await tx.upward_rent_vault.update({
            where: { id: job.vaultId },
            data: {
              armWithdrawalId: outcome.armInstructionId,
              ...(needsMembershipBackfill
                ? {
                    providerMembershipId: resolvedMembershipId,
                    providerAccountNumber:
                      resolvedAccountNumber || `${resolvedMembershipId}-ARMMMF-01`,
                    providerCrmStatus: 'Approved',
                  }
                : {}),
            },
          })
        }
        if (job.transactionId) {
          const existingTx = await tx.upward_rent_vault_transaction.findUnique({
            where: { id: job.transactionId },
            select: { metadata: true },
          })
          const prevMeta = (existingTx?.metadata as Record<string, unknown>) || {}
          await tx.upward_rent_vault_transaction.update({
            where: { id: job.transactionId },
            data: {
              metadata: {
                ...prevMeta,
                armSyncStatus: 'COMPLETED',
                armWithdrawalId: outcome.armInstructionId,
                armTransactionId: outcome.armTransactionId,
                ...(resolvedMembershipId ? { armMembershipId: resolvedMembershipId } : {}),
                ...(resolvedAccountNumber ? { armAccountNumber: resolvedAccountNumber } : {}),
                armCompletedAt: completedAt.toISOString(),
              } as any,
            },
          })
        }
      } else if (job.jobType === 'ONBOARD') {
        const membershipId = outcome.result.customerMembershipId
          ? String(outcome.result.customerMembershipId)
          : outcome.result.customerId
            ? String(outcome.result.customerId)
            : null
        const crmAccount = outcome.result.crmAccountNumber
          ? String(outcome.result.crmAccountNumber)
          : null
        const statusStr = outcome.result.status ? String(outcome.result.status) : 'Submitted'

        if (job.userId) {
          await tx.upward_kyc_verification.updateMany({
            where: { userId: job.userId },
            data: {
              armCustomerMembershipId: membershipId,
              armCrmAccountNumber: crmAccount,
              armSyncStatus: statusStr,
              armCompletedSections: Number(outcome.result.completedSections ?? 63),
            },
          })
        }
        if (job.vaultId) {
          await tx.upward_rent_vault.update({
            where: { id: job.vaultId },
            data: {
              investmentProvider: 'ARM',
              providerMembershipId: membershipId,
              providerAccountNumber: crmAccount,
              providerCrmStatus: statusStr,
            },
          })
        }
      }
    })

    // Dispatch decoupled notifications AFTER DB commit — notification errors can NEVER fail ARM!
    await this.dispatchSuccessNotifications(job)
  }

  private async dispatchSuccessNotifications(job: {
    id: number
    uuid: string
    jobType: string
    userId: number | null
    notifiedUserAt: Date | null
    notifiedAdminAt: Date | null
  }) {
    // 1. User notification (for SUBSCRIBE & REDEEM)
    if (!job.notifiedUserAt && job.userId && (job.jobType === 'SUBSCRIBE' || job.jobType === 'REDEEM')) {
      const payload = {
        armJobId: job.id,
        armJobUuid: job.uuid,
        kind: 'USER_SUCCESS' as const,
      }
      if (this.notificationQueue) {
        await this.notificationQueue.enqueueNotification(payload).catch((err) => {
          this.logger.warn(
            `Could not enqueue USER_SUCCESS notification for job ${job.uuid} (reconciler will retry): ${err?.message}`,
          )
        })
      } else if (this.notificationProcessor) {
        await this.notificationProcessor.processNotification(payload).catch((err) => {
          this.logger.error(
            `Direct USER_SUCCESS notification failed for job ${job.uuid}: ${err?.message}`,
          )
        })
      }
    } else if (!job.notifiedUserAt && job.jobType === 'ONBOARD') {
      await this.prisma.upward_arm_job
        .updateMany({
          where: { id: job.id, notifiedUserAt: null },
          data: { notifiedUserAt: new Date() },
        })
        .catch(() => {})
    }

    // 2. Admin success alert
    if (!job.notifiedAdminAt) {
      const payload = {
        armJobId: job.id,
        armJobUuid: job.uuid,
        kind: 'ADMIN_SUCCESS' as const,
      }
      if (this.notificationQueue) {
        await this.notificationQueue.enqueueNotification(payload).catch((err) => {
          this.logger.warn(
            `Could not enqueue ADMIN_SUCCESS notification for job ${job.uuid} (reconciler will retry): ${err?.message}`,
          )
        })
      } else if (this.notificationProcessor) {
        await this.notificationProcessor.processNotification(payload).catch((err) => {
          this.logger.error(
            `Direct ADMIN_SUCCESS notification failed for job ${job.uuid}: ${err?.message}`,
          )
        })
      }
    }
  }

  private async finalizeFailure(
    job: {
      id: number
      uuid: string
      transactionId: number | null
      notifiedAdminAt: Date | null
    },
    attemptCount: number,
    errorMessage: string,
  ) {
    const failedAt = new Date()

    await this.prisma.$transaction(async (tx) => {
      await tx.upward_arm_job.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          failedAt,
          lockedAt: null,
          lastError: errorMessage,
        },
      })

      if (job.transactionId) {
        const existingTx = await tx.upward_rent_vault_transaction.findUnique({
          where: { id: job.transactionId },
          select: { metadata: true },
        })
        const prevMeta = (existingTx?.metadata as Record<string, unknown>) || {}
        await tx.upward_rent_vault_transaction.update({
          where: { id: job.transactionId },
          data: {
            metadata: {
              ...prevMeta,
              armSyncStatus: 'FAILED',
              armLastError: errorMessage,
              armFailedAt: failedAt.toISOString(),
            } as any,
          },
        })
      }
    })

    // Notify ADMIN ONLY onto independent `arm-notifications` queue — NEVER notify the user!
    if (!job.notifiedAdminAt) {
      const payload = {
        armJobId: job.id,
        armJobUuid: job.uuid,
        kind: 'ADMIN_FAILURE' as const,
        errorMessage,
        attemptCount,
      }
      if (this.notificationQueue) {
        await this.notificationQueue.enqueueNotification(payload).catch((err) => {
          this.logger.warn(
            `Could not enqueue ADMIN_FAILURE alert for job ${job.uuid} (reconciler will retry): ${err?.message}`,
          )
        })
      } else if (this.notificationProcessor) {
        await this.notificationProcessor.processNotification(payload).catch((err) => {
          this.logger.error(
            `Direct ADMIN_FAILURE alert failed for job ${job.uuid}: ${err?.message}`,
          )
        })
      }
    }
  }
}
