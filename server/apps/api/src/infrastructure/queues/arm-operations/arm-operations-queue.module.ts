import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { S3Module } from '../../../shared/infrastructure/common/s3/s3.module'
import {
  ARM_JOB_QUEUE,
  ARM_NOTIFICATION_QUEUE,
} from '../../../domains/rent-savings/arm-job.interface'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { PushNotificationService } from '../../../shared/infrastructure/common/push-notification.service'
import { PrismaDeviceTokenRepository } from '../../../shared/infrastructure/prisma/repositories/prisma-device-token.repository'
import { ArmNotificationQueueService } from './arm-notification-queue.service'
import { ArmNotificationProcessorService } from './arm-notification-processor.service'
import { ArmNotificationWorkerService } from './arm-notification-worker.service'
import { ArmJobQueueService } from './arm-job-queue.service'
import { ArmJobProcessorService } from './arm-job-processor.service'
import { ArmJobWorkerService } from './arm-job-worker.service'

@Global()
@Module({
  imports: [ConfigModule, S3Module],
  providers: [
    PrismaDeviceTokenRepository,
    PushNotificationService,
    NotificationService,
    ArmNotificationQueueService,
    {
      provide: ARM_NOTIFICATION_QUEUE,
      useExisting: ArmNotificationQueueService,
    },
    ArmNotificationProcessorService,
    ArmNotificationWorkerService,
    ArmJobQueueService,
    {
      provide: ARM_JOB_QUEUE,
      useExisting: ArmJobQueueService,
    },
    ArmJobProcessorService,
    ArmJobWorkerService,
  ],
  exports: [
    ARM_JOB_QUEUE,
    ARM_NOTIFICATION_QUEUE,
    ArmJobQueueService,
    ArmJobProcessorService,
    ArmNotificationQueueService,
    ArmNotificationProcessorService,
  ],
})
export class ArmOperationsQueueModule {}
