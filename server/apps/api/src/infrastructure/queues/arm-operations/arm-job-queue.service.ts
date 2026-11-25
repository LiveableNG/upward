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
import {
  ARM_JOB_DEFAULT_MAX_ATTEMPTS,
  ARM_JOB_INITIAL_BACKOFF_MS,
  ARM_JOB_OUTBOX_GRACE_MS,
  ARM_JOB_STALE_PROCESSING_MS,
  ARM_OPERATIONS_QUEUE_NAME,
  buildRedisConnectionOptions,
  isQueueDisabledEnvironment,
  toBullMqJobId,
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
    const connection = buildRedisConnectionOptions(redisUrl)

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

    this.logger.log(`BullMQ queue '${ARM_OPERATIONS_QUEUE_NAME}' initialized`)
    return this.queue
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
      const existing = await queue.getJob(bullJobId)
      if (existing) {
        const state = await existing.getState()
        if (state === 'waiting' || state === 'active' || state === 'delayed' || state === 'prioritized') {
          this.logger.debug(
            `BullMQ job ${bullJobId} already in state '${state}'; skipping duplicate enqueue`,
          )
          return true
        }
        if (state === 'completed') {
          this.logger.debug(`BullMQ job ${bullJobId} already completed; skipping duplicate enqueue`)
          return true
        }
        if (state === 'failed') {
          if (options?.allowReplaceFailed) {
            await existing.remove()
          } else {
            this.logger.debug(
              `BullMQ job ${bullJobId} is in failed state; requires explicit retry`,
            )
            return false
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

      this.logger.log(
        `Enqueued ARM background job ${job.uuid} [${job.jobType}] (bullJobId=${bullJobId})`,
      )
      return true
    } catch (err: any) {
      // Never fail the caller: job is already durably committed in Postgres upward_arm_job
      // and the outbox reconciler will safely re-enqueue when Redis recovers.
      this.logger.error(
        `Failed to enqueue ARM job ${job.uuid} to Redis (durable outbox will recover): ${err?.message}`,
      )
      return false
    }
  }

  /**
   * Safety-net Postgres Transactional Outbox reconciler.
   * 1) Re-enqueues QUEUED jobs older than 90s (e.g. if Redis blipped during commit).
   * 2) Recovers stale PROCESSING jobs locked for >10 minutes (worker crash / OOM)
   *    ONLY if armInstructionId IS NULL.
   */
  async reconcilePendingJobs(): Promise<ArmReconciliationSummary> {
    const now = new Date()
    const outboxCutoff = new Date(now.getTime() - ARM_JOB_OUTBOX_GRACE_MS)
    const staleLockCutoff = new Date(now.getTime() - ARM_JOB_STALE_PROCESSING_MS)

    let requeued = 0
    let recoveredStale = 0
    let failedStale = 0
    let requeuedNotifications = 0

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
          if (!stale.notifiedAdminAt && this.notificationQueue) {
            await this.notificationQueue.enqueueNotification({
              armJobId: stale.id,
              armJobUuid: stale.uuid,
              kind: 'ADMIN_FAILURE',
              errorMessage: timeoutErr,
              attemptCount: stale.attempts,
            })
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

    // 2. Re-enqueue durable QUEUED outbox jobs that haven't been picked up yet
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

    // 3. Reconcile any COMPLETED / FAILED jobs whose decoupled notifications haven't been confirmed yet
    if (this.notificationQueue) {
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
    }

    if (requeued > 0 || recoveredStale > 0 || failedStale > 0 || requeuedNotifications > 0) {
      this.logger.log(
        `ARM outbox reconciler complete: requeued=${requeued}, recoveredStale=${recoveredStale}, failedStale=${failedStale}, requeuedNotifications=${requeuedNotifications}`,
      )
    }

    return { requeued, recoveredStale, failedStale, requeuedNotifications }
  }
}
