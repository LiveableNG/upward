import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Worker } from 'bullmq'
import { ArmNotificationJobData } from '../../../domains/rent-savings/arm-job.interface'
import { ArmNotificationProcessorService } from './arm-notification-processor.service'
import {
  ARM_NOTIFICATION_LOCK_DURATION_MS,
  ARM_NOTIFICATIONS_QUEUE_NAME,
  buildRedisConnectionOptions,
  isWorkerDisabledEnvironment,
} from './arm-operations.constants'

@Injectable()
export class ArmNotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArmNotificationWorkerService.name)
  private worker: Worker<ArmNotificationJobData> | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: ArmNotificationProcessorService,
  ) {}

  onModuleInit() {
    if (isWorkerDisabledEnvironment()) {
      this.logger.log(
        'BullMQ ARM notifications worker skipped (test, serverless, or DISABLE_BULLMQ_WORKER=true)',
      )
      return
    }

    const redisUrl = this.configService.get<string>('REDIS_URL') || process.env['REDIS_URL']
    const connection = buildRedisConnectionOptions(redisUrl, { role: 'worker' })

    this.worker = new Worker<ArmNotificationJobData>(
      ARM_NOTIFICATIONS_QUEUE_NAME,
      async (job) => this.processor.processNotification(job.data),
      {
        connection,
        concurrency: 5,
        lockDuration: ARM_NOTIFICATION_LOCK_DURATION_MS,
      },
    )

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `BullMQ ARM notification completed: id=${job.id} kind=${job.data.kind} status=${result?.status}`,
      )
    })

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `BullMQ ARM notification failed: id=${job?.id} kind=${job?.data?.kind} attemptsMade=${job?.attemptsMade}: ${err.message}`,
      )
    })

    this.worker.on('error', (err) => {
      this.logger.error(`BullMQ ARM notifications worker error: ${err.message}`)
    })

    this.logger.log(
      `BullMQ worker listening on queue '${ARM_NOTIFICATIONS_QUEUE_NAME}' (concurrency=5)`,
    )
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close().catch((err) => {
        this.logger.warn(`Error shutting down ARM notifications worker: ${err?.message}`)
      })
      this.worker = null
    }
  }
}
