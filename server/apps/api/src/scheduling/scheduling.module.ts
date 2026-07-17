import { Module } from '@nestjs/common'
import { ApplicationModule } from '../application/application.module'
import { ScheduleService } from './schedule.service'

/**
 * Central cron kernel (Laravel-style).
 * Depends on ApplicationModule for the job handlers.
 */
@Module({
  imports: [ApplicationModule],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class SchedulingModule {}
