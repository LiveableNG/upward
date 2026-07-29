import { Module } from '@nestjs/common'
import { ApplicationModule } from '../application/application.module'
import { ScheduleService } from './schedule.service'
import { S3Module } from '../shared/infrastructure/common/s3/s3.module'
import { PrismaModule } from '../shared/infrastructure/prisma/prisma.module'
import { SubscriptionBillingScheduler } from './subscription-billing.scheduler'

@Module({
  imports: [ApplicationModule, S3Module, PrismaModule],
  providers: [ScheduleService, SubscriptionBillingScheduler],
  exports: [ScheduleService],
})
export class SchedulingModule {}
