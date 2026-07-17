import { Controller, Get, Query, UnauthorizedException, Logger } from '@nestjs/common'
import { ScheduleService } from '../../../scheduling/schedule.service'

/**
 * Manual / external trigger for the schedule Kernel.
 * Preferred path in production is the in-process ScheduleService tick;
 * this endpoint is for ops recovery and one-off runs.
 *
 * GET /api/v1/public/cron/run?secret=...&tasks=settlements,reminders
 * Omit `tasks` to run every registered job once.
 */
@Controller('public/cron')
export class CronController {
  private readonly logger = new Logger(CronController.name)

  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('run')
  async runCron(
    @Query('secret') secret: string,
    @Query('tasks') tasks?: string,
  ) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      throw new UnauthorizedException('CRON_SECRET is not configured')
    }
    if (secret !== cronSecret) {
      throw new UnauthorizedException('Invalid cron secret')
    }

    this.logger.log(`Manual cron trigger (tasks: ${tasks || 'all'})`)

    const results: Record<string, string> = {}

    if (!tasks) {
      Object.assign(results, await this.scheduleService.runTask())
    } else {
      // Map legacy aliases → Kernel job names
      const alias: Record<string, string> = {
        paymentreminders: 'reminders',
        processscheduledrequests: 'reminders',
        refunds: 'settlements',
      }

      for (const raw of tasks.split(',').map((t) => t.trim()).filter(Boolean)) {
        const name = alias[raw.toLowerCase()] || raw
        Object.assign(results, await this.scheduleService.runTask(name))
      }
    }

    if (shouldRun('savingsInterest')) {
      try {
        await this.applyDailySavingsInterestUseCase.execute();
        results.savingsInterest = 'completed';
      } catch (e: any) {
        this.logger.error('Error in applyDailySavingsInterestUseCase.execute', e);
        results.savingsInterest = 'failed: ' + e.message;
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      jobs: this.scheduleService.listJobs(),
      results,
    }
  }
}
