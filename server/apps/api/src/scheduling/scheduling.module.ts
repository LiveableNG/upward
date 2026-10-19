import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ApplicationModule } from '../application/application.module'
import { ScheduleService } from './schedule.service'
import { S3Module } from '../shared/infrastructure/common/s3/s3.module'
import { PrismaModule } from '../shared/infrastructure/prisma/prisma.module'
import { CommunicationModule } from '../shared/infrastructure/communication/communication.module'
import { SubscriptionBillingScheduler } from './subscription-billing.scheduler'

@Module({
  imports: [ConfigModule, ApplicationModule, S3Module, PrismaModule, CommunicationModule],
  providers: [ScheduleService, SubscriptionBillingScheduler],
  exports: [ScheduleService, SubscriptionBillingScheduler],
})
export class SchedulingModule {}
