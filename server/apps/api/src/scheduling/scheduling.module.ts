import { Module } from '@nestjs/common'
import { ApplicationModule } from '../application/application.module'
import { ScheduleService } from './schedule.service'
import { S3Module } from '../shared/infrastructure/common/s3/s3.module'

@Module({
  imports: [ApplicationModule, S3Module],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class SchedulingModule {}
