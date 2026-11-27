import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import {
  ARM_NOTIFICATION_QUEUE,
  ArmJobQueueData,
  ArmJobQueueDescriptor,
  ArmReconciliationSummary,
  IArmJobQueue,
  IArmNotificationQueue,
} from '../../../domains/rent-savings/arm-job.interface'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ArmJobProcessorService } from './arm-job-processor.service'
import { ArmNotificationProcessorService } from './arm-notification-processor.service'
import {
  ARM_FALLBACK_BATCH_SIZE,
  ARM_FALLBACK_NOTIFICATION_BATCH_SIZE,
  ARM_FALLBACK_RETRY_COOLDOWN_MS,
  ARM_JOB_DEFAULT_MAX_ATTEMPTS,
  ARM_JOB_INITIAL_BACKOFF_MS,
  ARM_JOB_OUTBOX_GRACE_MS,
  ARM_JOB_STALE_PROCESSING_MS,
  ARM_OPERATIONS_QUEUE_NAME,
  ARM_QUEUE_ENQUEUE_TIMEOUT_MS,
  ARM_REDIS_PING_TIMEOUT_MS,
  buildRedisConnectionOptions,
  isQueueDisabledEnvironment,
  isRedisFallbackCronEnabled,
  toBullMqJobId,
  withTimeout,
} from './arm-operations.constants'

@Injectable()
export class ArmJobQueueService implements IArmJobQueue, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArmJobQueueService.name)
  private queue: Queue<ArmJobQueueData> | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ARM_NOTIFICATION_QUEUE)
    private readonly notificationQueue?: IArmNotificationQueue,
    @Optional()
    private readonly jobProcessor?: ArmJobProcessorService,
    @Optional()
    private readonly notificationProcessor?: ArmNotificationProcessorService,
  ) {}

  onModuleInit() {
    if (isQueueDisabledEnvironment()) {
      this.logger.log('BullMQ ARM operations queue disabled in test environment')
      return
    }
    this.ensureQueue()
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close().catch((err) => {
        this.logger.warn(`Error closing ARM BullMQ queue: ${err?.message}`)
      })
      this.queue = null
    }
  }

  private ensureQueue(): Queue<ArmJobQueueData> | null {
    if (isQueueDisabledEnvironment()) return null
    if (this.queue) return this.queue

    const redisUrl = this.configService.get<string>('REDIS_URL') || process.env['REDIS_URL']
    const connection = buildRedisConnectionOptions(redisUrl, { role: 'producer' })

    this.queue = new Queue<ArmJobQueueData>(ARM_OPERATIONS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: ARM_JOB_DEFAULT_MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ARM_JOB_INITIAL_BACKOFF_MS,
        },
        removeOnComplete: {
          count: 500,
          age: 7 * 24 * 60 * 60, // 7 days
        },
        removeOnFail: false,
      },
    })

    this.queue.on('error', (err) => {
      this.logger.error(`BullMQ queue error (${ARM_OPERATIONS_QUEUE_NAME}): ${err.message}`)
    })

    this.logger.log(`BullMQ queue '${ARM_OPERATIONS_QUEUE_NAME}' initialized (fail-fast producer)`)
    return this.queue
  }

  async isRedisReachable(): Promise<boolean> {
    const queue = this.ensureQueue()
    if (!queue) return false

    try {
      await withTimeout(queue.isPaused(), ARM_REDIS_PING_TIMEOUT_MS, 'arm-queue-redis-ping')
      return true
    } catch {
      return false
    }
  }

  async enqueueJob(
    job: ArmJobQueueDescriptor,
    options?: { allowReplaceFailed?: boolean },
  ): Promise<boolean> {
    const queue = this.ensureQueue()
    if (!queue) {
      return false
    }

    const bullJobId = toBullMqJobId(job.idempotencyKey)

    try {
      const outcome = await withTimeout<'enqueued' | 'already_present' | 'requires_retry'>(
        (async () => {
          const existing = await queue.getJob(bullJobId)
          if (existing) {
            const state = await existing.getState()
            if (
              state === 'waiting' ||
              state === 'active' ||
              state === 'delayed' ||
              state === 'prioritized'
            ) {
              this.logger.debug(
                `BullMQ job ${bullJobId} already in state '${state}'; skipping duplicate enqueue`,
              )
              return 'already_present'
            }
            if (state === 'completed') {
              this.logger.debug(
                `BullMQ job ${bullJobId} already completed; skipping duplicate enqueue`,
              )
              return 'already_present'
            }
            if (state === 'failed') {
              if (options?.allowReplaceFailed) {
                await existing.remove()
              } else {
                this.logger.debug(
                  `BullMQ job ${bullJobId} is in failed state; requires explicit retry`,
                )
                return 'requires_retry'
              }
            }
          }

          await queue.add(
            job.jobType,
            {
              armJobId: job.id,
              armJobUuid: job.uuid,
              idempotencyKey: job.idempotencyKey,
              jobType: job.jobType,
            },
            {
              jobId: bullJobId,
              attempts: ARM_JOB_DEFAULT_MAX_ATTEMPTS,
              backoff: {
                type: 'exponential',
                delay: ARM_JOB_INITIAL_BACKOFF_MS,
              },
            },
          )
          return 'enqueued'
        })(),
        ARM_QUEUE_ENQUEUE_TIMEOUT_MS,
        `enqueueJob(${bullJobId})`,
      )

      if (outcome === 'requires_retry') {
        return false
      }
      if (outcome === 'enqueued') {
        this.logger.log(
          `Enqueued ARM background job ${job.uuid} [${job.jobType}] (bullJobId=${bullJobId})`,
        )
      }
      return true
    } catch (err: any) {
      // Never fail or hang the caller: job is already durably committed in Postgres upward_arm_job
      // and the outbox reconciler (or direct cron fallback while Redis is down) will safely recover.
      this.logger.error(
        `Failed to enqueue ARM job ${job.uuid} to Redis (durable outbox will recover): ${err?.message}`,
      )
      return false
    }
  }

  /**
   * Safety-net Postgres Transactional Outbox reconciler.
   * 1) Recovers stale PROCESSING jobs locked for >10 minutes (worker crash / OOM)
   *    ONLY if armInstructionId IS NULL.
   * 2) When Redis is healthy: re-enqueues QUEUED jobs older than 90s + unsent notifications onto BullMQ.
   * 3) When Redis is unreachable and ARM_REDIS_FALLBACK_CRON_ENABLED !== 'false':
   *    processes bounded batches directly from Postgres through ArmJobProcessorService
   *    (still guarded by atomic Postgres CAS lock + armInstructionId + ARM TxId lookup on retry).
   */
  async reconcilePendingJobs(): Promise<ArmReconciliationSummary> {
    const now = new Date()
    const outboxCutoff = new Date(now.getTime() - ARM_JOB_OUTBOX_GRACE_MS)
    const staleLockCutoff = new Date(now.getTime() - ARM_JOB_STALE_PROCESSING_MS)
    const retryCooldownCutoff = new Date(now.getTime() - ARM_FALLBACK_RETRY_COOLDOWN_MS)

    let requeued = 0
    let recoveredStale = 0
    let failedStale = 0
    let requeuedNotifications = 0
    let processedViaFallback = 0
    let processedNotificationsViaFallback = 0

    const redisReachable = await this.isRedisReachable()
    const useDirectFallback = !redisReachable && isRedisFallbackCronEnabled()

    // 1. Recover stale PROCESSING locks from crashed workers (only when armInstructionId is still null)
    const staleJobs = await this.prisma.upward_arm_job.findMany({
      where: {
        status: 'PROCESSING',
        armInstructionId: null,
        lockedAt: { lt: staleLockCutoff },
      },
      take: 25,
      orderBy: { lockedAt: 'asc' },
    })

    for (const stale of staleJobs) {
      if (stale.attempts >= stale.maxAttempts) {
        const timeoutErr =
          stale.lastError ||
          'ARM job timed out in PROCESSING state and exhausted maximum retry attempts'
        const updated = await this.prisma.upward_arm_job.updateMany({
          where: {
            id: stale.id,
            status: 'PROCESSING',
            armInstructionId: null,
          },
          data: {
            status: 'FAILED',
            failedAt: now,
            lockedAt: null,
            lastError: timeoutErr,
          },
        })
        if (updated.count > 0) {
          failedStale++
          if (!stale.notifiedAdminAt) {
            if (redisReachable && this.notificationQueue) {
              await this.notificationQueue.enqueueNotification({
                armJobId: stale.id,
                armJobUuid: stale.uuid,
                kind: 'ADMIN_FAILURE',
                errorMessage: timeoutErr,
                attemptCount: stale.attempts,
              })
            } else if (useDirectFallback && this.notificationProcessor) {
              await this.notificationProcessor
                .processNotification({
                  armJobId: stale.id,
                  armJobUuid: stale.uuid,
                  kind: 'ADMIN_FAILURE',
                  errorMessage: timeoutErr,
                  attemptCount: stale.attempts,
                })
                .then((res) => {
                  if (res?.status === 'sent') processedNotificationsViaFallback++
                })
                .catch((err) => {
                  this.logger.warn(
                    `Fallback ADMIN_FAILURE notification failed for stale job ${stale.uuid}: ${err?.message}`,
                  )
                })
            }
          }
        }
      } else {
        const reset = await this.prisma.upward_arm_job.updateMany({
          where: {
            id: stale.id,
            status: 'PROCESSING',
            armInstructionId: null,
          },
          data: {
            status: 'QUEUED',
            lockedAt: null,
            lastError: 'Recovered from stale PROCESSING lock; verifying ARM status before retry',
          },
        })
        if (reset.count > 0) {
          recoveredStale++
          if (redisReachable) {
            await this.enqueueJob(
              {
                id: stale.id,
                uuid: stale.uuid,
                idempotencyKey: stale.idempotencyKey,
                jobType: stale.jobType as ArmJobQueueDescriptor['jobType'],
              },
              { allowReplaceFailed: true },
            )
          }
        }
      }
    }

    // 2. Process or re-enqueue durable QUEUED outbox jobs that haven't been picked up yet
    if (redisReachable) {
      const queuedJobs = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'QUEUED',
          armInstructionId: null,
          createdAt: { lt: outboxCutoff },
        },
        take: 50,
        orderBy: { createdAt: 'asc' },
      })

      for (const job of queuedJobs) {
        const ok = await this.enqueueJob(
          {
            id: job.id,
            uuid: job.uuid,
            idempotencyKey: job.idempotencyKey,
            jobType: job.jobType as ArmJobQueueDescriptor['jobType'],
          },
          { allowReplaceFailed: true },
        )
        if (ok) requeued++
      }
    } else if (useDirectFallback && this.jobProcessor) {
      // Redis is down: execute bounded Postgres outbox batch directly via ArmJobProcessorService
      // (protected by atomic Postgres CAS lock + armInstructionId guard + ARM TxId lookup on retry)
      const fallbackCandidates = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'QUEUED',
          armInstructionId: null,
        },
        take: ARM_FALLBACK_BATCH_SIZE * 2,
        orderBy: { createdAt: 'asc' },
      })

      const eligibleJobs = fallbackCandidates
        .filter((job) => {
          if (job.attempts >= job.maxAttempts) return false
          if (job.attempts > 0 && job.updatedAt && job.updatedAt > retryCooldownCutoff) {
            return false
          }
          return true
        })
        .slice(0, ARM_FALLBACK_BATCH_SIZE)

      if (eligibleJobs.length > 0) {
        this.logger.warn(
          `Redis unreachable — running direct Postgres outbox fallback for ${eligibleJobs.length} queued ARM job(s)`,
        )
      }

      for (const job of eligibleJobs) {
        try {
          const result = await this.jobProcessor.processArmJob(job.id, {
            isFinalBullMqAttempt: false,
          })
          if (result.status === 'completed' || result.status === 'already_completed') {
            processedViaFallback++
          }
        } catch (err: any) {
          this.logger.warn(
            `Fallback execution failed for ARM job ${job.uuid} (will retry on next cron tick if retryable): ${err?.message}`,
          )
        }
      }
    }

    // 3. Reconcile any COMPLETED / FAILED jobs whose decoupled notifications haven't been confirmed yet
    if (redisReachable && this.notificationQueue) {
      const unnotifiedCompleted = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { lt: outboxCutoff },
          OR: [{ notifiedUserAt: null }, { notifiedAdminAt: null }],
        },
        take: 30,
        orderBy: { completedAt: 'asc' },
      })

      for (const job of unnotifiedCompleted) {
        if (
          !job.notifiedUserAt &&
          job.userId &&
          (job.jobType === 'SUBSCRIBE' || job.jobType === 'REDEEM')
        ) {
          const ok = await this.notificationQueue.enqueueNotification({
            armJobId: job.id,
            armJobUuid: job.uuid,
            kind: 'USER_SUCCESS',
          })
          if (ok) requeuedNotifications++
        }
        if (!job.notifiedAdminAt) {
          const ok = await this.notificationQueue.enqueueNotification({
            armJobId: job.id,
            armJobUuid: job.uuid,
            kind: 'ADMIN_SUCCESS',
          })
          if (ok) requeuedNotifications++
        }
      }

      const unnotifiedFailed = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'FAILED',
          failedAt: { lt: outboxCutoff },
          notifiedAdminAt: null,
        },
        take: 30,
        orderBy: { failedAt: 'asc' },
      })

      for (const job of unnotifiedFailed) {
        const ok = await this.notificationQueue.enqueueNotification({
          armJobId: job.id,
          armJobUuid: job.uuid,
          kind: 'ADMIN_FAILURE',
          errorMessage: job.lastError || undefined,
          attemptCount: job.attempts,
        })
        if (ok) requeuedNotifications++
      }
    } else if (useDirectFallback && this.notificationProcessor) {
      const unnotifiedCompleted = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'COMPLETED',
          OR: [{ notifiedUserAt: null }, { notifiedAdminAt: null }],
        },
        take: ARM_FALLBACK_NOTIFICATION_BATCH_SIZE,
        orderBy: { completedAt: 'asc' },
      })

      for (const job of unnotifiedCompleted) {
        if (
          !job.notifiedUserAt &&
          job.userId &&
          (job.jobType === 'SUBSCRIBE' || job.jobType === 'REDEEM')
        ) {
          const res = await this.notificationProcessor
            .processNotification({
              armJobId: job.id,
              armJobUuid: job.uuid,
              kind: 'USER_SUCCESS',
            })
            .catch(() => null)
          if (res?.status === 'sent') processedNotificationsViaFallback++
        }
        if (!job.notifiedAdminAt) {
          const res = await this.notificationProcessor
            .processNotification({
              armJobId: job.id,
              armJobUuid: job.uuid,
              kind: 'ADMIN_SUCCESS',
            })
            .catch(() => null)
          if (res?.status === 'sent') processedNotificationsViaFallback++
        }
      }

      const unnotifiedFailed = await this.prisma.upward_arm_job.findMany({
        where: {
          status: 'FAILED',
          notifiedAdminAt: null,
        },
        take: ARM_FALLBACK_NOTIFICATION_BATCH_SIZE,
        orderBy: { failedAt: 'asc' },
      })

      for (const job of unnotifiedFailed) {
        const res = await this.notificationProcessor
          .processNotification({
            armJobId: job.id,
            armJobUuid: job.uuid,
            kind: 'ADMIN_FAILURE',
            errorMessage: job.lastError || undefined,
            attemptCount: job.attempts,
          })
          .catch(() => null)
        if (res?.status === 'sent') processedNotificationsViaFallback++
      }
    }

    if (
      requeued > 0 ||
      recoveredStale > 0 ||
      failedStale > 0 ||
      requeuedNotifications > 0 ||
      processedViaFallback > 0 ||
      processedNotificationsViaFallback > 0
    ) {
      this.logger.log(
        `ARM outbox reconciler complete (redisReachable=${redisReachable}): requeued=${requeued}, recoveredStale=${recoveredStale}, failedStale=${failedStale}, requeuedNotifications=${requeuedNotifications}, processedViaFallback=${processedViaFallback}, processedNotificationsViaFallback=${processedNotificationsViaFallback}`,
      )
    }

    return {
      requeued,
      recoveredStale,
      failedStale,
      requeuedNotifications,
      processedViaFallback,
      processedNotificationsViaFallback,
      redisReachable,
    }
  }
}
