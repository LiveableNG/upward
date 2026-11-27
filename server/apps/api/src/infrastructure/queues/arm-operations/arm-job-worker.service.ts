import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Worker } from 'bullmq'
import { ArmJobQueueData } from '../../../domains/rent-savings/arm-job.interface'
import { ArmJobProcessorService } from './arm-job-processor.service'
import {
  ARM_JOB_DEFAULT_MAX_ATTEMPTS,
  ARM_JOB_WORKER_LOCK_DURATION_MS,
  ARM_OPERATIONS_QUEUE_NAME,
  buildRedisConnectionOptions,
  isWorkerDisabledEnvironment,
} from './arm-operations.constants'

@Injectable()
export class ArmJobWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArmJobWorkerService.name)
  private worker: Worker<ArmJobQueueData> | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: ArmJobProcessorService,
  ) {}

  onModuleInit() {
    if (isWorkerDisabledEnvironment()) {
      this.logger.log(
        'BullMQ ARM operations worker skipped (test, serverless, or DISABLE_BULLMQ_WORKER=true)',
      )
      return
    }

    const redisUrl = this.configService.get<string>('REDIS_URL') || process.env['REDIS_URL']
    const connection = buildRedisConnectionOptions(redisUrl, { role: 'worker' })

    this.worker = new Worker<ArmJobQueueData>(
      ARM_OPERATIONS_QUEUE_NAME,
      async (job) => {
        const maxAttempts = job.opts.attempts ?? ARM_JOB_DEFAULT_MAX_ATTEMPTS
        const isFinalBullMqAttempt = job.attemptsMade + 1 >= maxAttempts
        return this.processor.processArmJob(job.data.armJobId, {
          isFinalBullMqAttempt,
        })
      },
      {
        connection,
        concurrency: 3,
        lockDuration: ARM_JOB_WORKER_LOCK_DURATION_MS,
        stalledInterval: 60_000,
      },
    )

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `BullMQ ARM job completed: id=${job.id} armJobUuid=${job.data.armJobUuid} status=${result?.status}`,
      )
    })

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `BullMQ ARM job failed: id=${job?.id} armJobUuid=${job?.data?.armJobUuid} attemptsMade=${job?.attemptsMade}: ${err.message}`,
      )
    })

    this.worker.on('error', (err) => {
      this.logger.error(`BullMQ ARM worker connection error: ${err.message}`)
    })

    this.logger.log(`BullMQ worker listening on queue '${ARM_OPERATIONS_QUEUE_NAME}' (concurrency=3)`)
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close().catch((err) => {
        this.logger.warn(`Error shutting down ARM BullMQ worker: ${err?.message}`)
      })
      this.worker = null
    }
  }
}
