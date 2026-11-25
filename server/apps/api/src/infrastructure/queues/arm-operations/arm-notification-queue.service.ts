import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import {
  ArmNotificationJobData,
  IArmNotificationQueue,
} from '../../../domains/rent-savings/arm-job.interface'
import {
  ARM_NOTIFICATION_INITIAL_BACKOFF_MS,
  ARM_NOTIFICATION_MAX_ATTEMPTS,
  ARM_NOTIFICATIONS_QUEUE_NAME,
  buildRedisConnectionOptions,
  isQueueDisabledEnvironment,
  toBullMqJobId,
} from './arm-operations.constants'

@Injectable()
export class ArmNotificationQueueService
  implements IArmNotificationQueue, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ArmNotificationQueueService.name)
  private queue: Queue<ArmNotificationJobData> | null = null

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (isQueueDisabledEnvironment()) {
      this.logger.log('BullMQ ARM notifications queue disabled in test environment')
      return
    }
    this.ensureQueue()
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close().catch((err) => {
        this.logger.warn(`Error closing ARM notifications BullMQ queue: ${err?.message}`)
      })
      this.queue = null
    }
  }

  private ensureQueue(): Queue<ArmNotificationJobData> | null {
    if (isQueueDisabledEnvironment()) return null
    if (this.queue) return this.queue

    const redisUrl = this.configService.get<string>('REDIS_URL') || process.env['REDIS_URL']
    const connection = buildRedisConnectionOptions(redisUrl)

    this.queue = new Queue<ArmNotificationJobData>(ARM_NOTIFICATIONS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: ARM_NOTIFICATION_MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ARM_NOTIFICATION_INITIAL_BACKOFF_MS,
        },
        removeOnComplete: {
          count: 500,
          age: 7 * 24 * 60 * 60,
        },
        removeOnFail: false,
      },
    })

    this.queue.on('error', (err) => {
      this.logger.error(`BullMQ queue error (${ARM_NOTIFICATIONS_QUEUE_NAME}): ${err.message}`)
    })

    this.logger.log(`BullMQ queue '${ARM_NOTIFICATIONS_QUEUE_NAME}' initialized`)
    return this.queue
  }

  async enqueueNotification(data: ArmNotificationJobData): Promise<boolean> {
    const queue = this.ensureQueue()
    if (!queue) return false

    const bullJobId = toBullMqJobId(`ARM_NOTIFY__${data.armJobUuid}__${data.kind}`)

    try {
      const existing = await queue.getJob(bullJobId)
      if (existing) {
        const state = await existing.getState()
        if (
          state === 'waiting' ||
          state === 'active' ||
          state === 'delayed' ||
          state === 'prioritized' ||
          state === 'completed'
        ) {
          return true
        }
        // If previously failed after outage, allow outbox reconciler or retry to re-enqueue
        if (state === 'failed') {
          await existing.remove().catch(() => {})
        }
      }

      await queue.add(data.kind, data, {
        jobId: bullJobId,
        attempts: ARM_NOTIFICATION_MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ARM_NOTIFICATION_INITIAL_BACKOFF_MS,
        },
      })

      this.logger.log(
        `Enqueued ARM notification [${data.kind}] for job ${data.armJobUuid} (bullJobId=${bullJobId})`,
      )
      return true
    } catch (err: any) {
      this.logger.error(
        `Failed to enqueue ARM notification [${data.kind}] for job ${data.armJobUuid} (outbox reconciler will recover): ${err?.message}`,
      )
      return false
    }
  }
}
