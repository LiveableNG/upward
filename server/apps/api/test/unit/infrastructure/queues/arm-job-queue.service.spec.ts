import { ArmJobQueueService } from '../../../../src/infrastructure/queues/arm-operations/arm-job-queue.service'
import {
  buildRedisConnectionOptions,
  withTimeout,
} from '../../../../src/infrastructure/queues/arm-operations/arm-operations.constants'

describe('ArmJobQueueService — Fail-Fast Producer & Redis-Down Cron Fallback', () => {
  const buildService = (opts?: {
    staleJobs?: any[]
    queuedJobs?: any[]
    completedUnnotified?: any[]
    failedUnnotified?: any[]
    redisReachable?: boolean
  }) => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as any

    const prisma = {
      upward_arm_job: {
        findMany: jest.fn().mockImplementation(async (args: any) => {
          const status = args?.where?.status
          if (status === 'PROCESSING') return opts?.staleJobs ?? []
          if (status === 'QUEUED') return opts?.queuedJobs ?? []
          if (status === 'COMPLETED') return opts?.completedUnnotified ?? []
          if (status === 'FAILED') return opts?.failedUnnotified ?? []
          return []
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any

    const notificationQueue = {
      enqueueNotification: jest.fn().mockResolvedValue(true),
    } as any

    const jobProcessor = {
      processArmJob: jest.fn().mockResolvedValue({
        status: 'completed',
        armInstructionId: 'ARM-INSTR-100',
      }),
    } as any

    const notificationProcessor = {
      processNotification: jest.fn().mockResolvedValue({
        status: 'sent',
        kind: 'USER_SUCCESS',
      }),
    } as any

    const service = new ArmJobQueueService(
      configService,
      prisma,
      notificationQueue,
      jobProcessor,
      notificationProcessor,
    )

    if (opts?.redisReachable !== undefined) {
      jest.spyOn(service, 'isRedisReachable').mockResolvedValue(opts.redisReachable)
    }

    return { service, prisma, notificationQueue, jobProcessor, notificationProcessor }
  }

  describe('buildRedisConnectionOptions', () => {
    it('configures producers to fail fast (enableOfflineQueue: false, maxRetriesPerRequest: 1, bounded timeouts)', () => {
      const producerOpts = buildRedisConnectionOptions('redis://127.0.0.1:6379/0', {
        role: 'producer',
      }) as any

      expect(producerOpts.enableOfflineQueue).toBe(false)
      expect(producerOpts.maxRetriesPerRequest).toBe(1)
      expect(producerOpts.connectTimeout).toBe(2000)
      expect(producerOpts.commandTimeout).toBe(2500)
      expect(typeof producerOpts.retryStrategy).toBe('function')
    })

    it('keeps workers configured with maxRetriesPerRequest: null for BullMQ blocking commands', () => {
      const workerOpts = buildRedisConnectionOptions('redis://127.0.0.1:6379/0', {
        role: 'worker',
      }) as any

      expect(workerOpts.maxRetriesPerRequest).toBeNull()
      expect(workerOpts.enableOfflineQueue).toBeUndefined()
    })
  })

  describe('withTimeout & fail-fast enqueueJob', () => {
    it('rejects cleanly when a stalled Redis promise exceeds the timeout', async () => {
      const neverResolving = new Promise<string>(() => {})
      await expect(withTimeout(neverResolving, 25, 'stalled-redis')).rejects.toThrow(
        /timed out after 25ms/i,
      )
    })

    it('returns false without throwing when Redis producer rejects immediately', async () => {
      const { service } = buildService()
      const fakeQueue = {
        getJob: jest.fn().mockRejectedValue(new Error("Stream isn't writeable and enableOfflineQueue options is false")),
        add: jest.fn(),
      }
      jest.spyOn(service as any, 'ensureQueue').mockReturnValue(fakeQueue)

      const ok = await service.enqueueJob({
        id: 1,
        uuid: 'arm-job-1',
        idempotencyKey: 'ARM_SUB:ref_1',
        jobType: 'SUBSCRIBE',
      })

      expect(ok).toBe(false)
      expect(fakeQueue.add).not.toHaveBeenCalled()
    })
  })

  describe('reconcilePendingJobs', () => {
    it('re-enqueues to BullMQ (and does NOT invoke direct fallback) when Redis is reachable', async () => {
      const oldDate = new Date(Date.now() - 5 * 60 * 1000)
      const { service, jobProcessor, notificationQueue } = buildService({
        redisReachable: true,
        queuedJobs: [
          {
            id: 11,
            uuid: 'arm-job-11',
            idempotencyKey: 'ARM_SUB:ref_11',
            jobType: 'SUBSCRIBE',
            attempts: 0,
            maxAttempts: 5,
            createdAt: oldDate,
            updatedAt: oldDate,
          },
        ],
        completedUnnotified: [
          {
            id: 12,
            uuid: 'arm-job-12',
            jobType: 'SUBSCRIBE',
            userId: 42,
            notifiedUserAt: null,
            notifiedAdminAt: null,
          },
        ],
      })
      const enqueueSpy = jest.spyOn(service, 'enqueueJob').mockResolvedValue(true)

      const summary = await service.reconcilePendingJobs()

      expect(summary.redisReachable).toBe(true)
      expect(summary.requeued).toBe(1)
      expect(summary.requeuedNotifications).toBe(2)
      expect(summary.processedViaFallback).toBe(0)
      expect(enqueueSpy).toHaveBeenCalledTimes(1)
      expect(jobProcessor.processArmJob).not.toHaveBeenCalled()
      expect(notificationQueue.enqueueNotification).toHaveBeenCalledTimes(2)
    })

    it('processes queued jobs and unsent notifications via Postgres outbox fallback when Redis is unreachable', async () => {
      const prevFlag = process.env.ARM_REDIS_FALLBACK_CRON_ENABLED
      delete process.env.ARM_REDIS_FALLBACK_CRON_ENABLED

      try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
        const fiveSecondsAgo = new Date(Date.now() - 5 * 1000)

        const { service, jobProcessor, notificationProcessor } = buildService({
          redisReachable: false,
          queuedJobs: [
            // Eligible fresh deposit job
            {
              id: 21,
              uuid: 'arm-job-21',
              idempotencyKey: 'ARM_SUB:ref_21',
              jobType: 'SUBSCRIBE',
              attempts: 0,
              maxAttempts: 5,
              createdAt: fiveSecondsAgo,
              updatedAt: fiveSecondsAgo,
            },
            // Recently retried job -> should wait for retry cooldown
            {
              id: 22,
              uuid: 'arm-job-22',
              idempotencyKey: 'ARM_SUB:ref_22',
              jobType: 'SUBSCRIBE',
              attempts: 2,
              maxAttempts: 5,
              createdAt: twoMinutesAgo,
              updatedAt: fiveSecondsAgo,
            },
            // Retryable job past cooldown -> eligible
            {
              id: 23,
              uuid: 'arm-job-23',
              idempotencyKey: 'ARM_REDEEM:ref_23',
              jobType: 'REDEEM',
              attempts: 1,
              maxAttempts: 5,
              createdAt: twoMinutesAgo,
              updatedAt: twoMinutesAgo,
            },
            // Exhausted attempts -> skipped
            {
              id: 24,
              uuid: 'arm-job-24',
              idempotencyKey: 'ARM_SUB:ref_24',
              jobType: 'SUBSCRIBE',
              attempts: 5,
              maxAttempts: 5,
              createdAt: twoMinutesAgo,
              updatedAt: twoMinutesAgo,
            },
          ],
          completedUnnotified: [
            {
              id: 25,
              uuid: 'arm-job-25',
              jobType: 'SUBSCRIBE',
              userId: 7,
              notifiedUserAt: null,
              notifiedAdminAt: null,
            },
          ],
        })

        const summary = await service.reconcilePendingJobs()

        expect(summary.redisReachable).toBe(false)
        expect(summary.requeued).toBe(0)
        expect(summary.processedViaFallback).toBe(2)
        expect(summary.processedNotificationsViaFallback).toBe(2)
        expect(jobProcessor.processArmJob).toHaveBeenCalledTimes(2)
        expect(jobProcessor.processArmJob).toHaveBeenCalledWith(21, { isFinalBullMqAttempt: false })
        expect(jobProcessor.processArmJob).toHaveBeenCalledWith(23, { isFinalBullMqAttempt: false })
        expect(notificationProcessor.processNotification).toHaveBeenCalledTimes(2)
      } finally {
        if (prevFlag === undefined) delete process.env.ARM_REDIS_FALLBACK_CRON_ENABLED
        else process.env.ARM_REDIS_FALLBACK_CRON_ENABLED = prevFlag
      }
    })

    it('skips direct fallback when ARM_REDIS_FALLBACK_CRON_ENABLED=false', async () => {
      const prevFlag = process.env.ARM_REDIS_FALLBACK_CRON_ENABLED
      process.env.ARM_REDIS_FALLBACK_CRON_ENABLED = 'false'

      try {
        const oldDate = new Date(Date.now() - 5 * 60 * 1000)
        const { service, jobProcessor, notificationProcessor } = buildService({
          redisReachable: false,
          queuedJobs: [
            {
              id: 31,
              uuid: 'arm-job-31',
              idempotencyKey: 'ARM_SUB:ref_31',
              jobType: 'SUBSCRIBE',
              attempts: 0,
              maxAttempts: 5,
              createdAt: oldDate,
              updatedAt: oldDate,
            },
          ],
        })

        const summary = await service.reconcilePendingJobs()

        expect(summary.redisReachable).toBe(false)
        expect(summary.processedViaFallback).toBe(0)
        expect(jobProcessor.processArmJob).not.toHaveBeenCalled()
        expect(notificationProcessor.processNotification).not.toHaveBeenCalled()
      } finally {
        if (prevFlag === undefined) delete process.env.ARM_REDIS_FALLBACK_CRON_ENABLED
        else process.env.ARM_REDIS_FALLBACK_CRON_ENABLED = prevFlag
      }
    })
  })
})
