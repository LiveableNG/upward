import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { BulkInviteService } from '../shared/infrastructure/common/bulk-invite.service'
import { WebhookService } from '../shared/infrastructure/common/webhook/webhook.service'
import { UnifiedReminderService } from '../shared/infrastructure/common/reminder.service'
import { RentReminderWorkflowUseCase } from '../application/use-cases/notifications/rent-reminder-workflow.use-case'
import { ProcessHourlySettlementsUseCase } from '../application/use-cases/payments/settlement-cron.use-case'
import { QueueDailySequencesUseCase } from '../application/use-cases/sequence/queue-daily-sequences.use-case'
import { getZonedParts, Schedule, ScheduledJob } from './schedule.builder'

/**
 * Laravel Kernel equivalent for Nest.
 *
 * - `defineSchedule()` is the single source of truth for what runs when
 * - A 1-minute tick (`@Cron EVERY_MINUTE`) asks each job if it is due
 * - `withoutOverlapping()` skips a job still running from a previous tick
 * - Manual runs go through `runTask()` / `runDue()` (used by CronController)
 */
@Injectable()
export class ScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleService.name)
  private jobs: ScheduledJob[] = []
  private readonly running = new Set<string>()
  private readonly timeZone: string

  constructor(
    private readonly config: ConfigService,
    private readonly bulkInviteService: BulkInviteService,
    private readonly webhookService: WebhookService,
    private readonly unifiedReminderService: UnifiedReminderService,
    private readonly rentReminderUseCase: RentReminderWorkflowUseCase,
    private readonly processHourlySettlementsUseCase: ProcessHourlySettlementsUseCase,
    private readonly queueDailySequencesUseCase: QueueDailySequencesUseCase,
  ) {
    this.timeZone =
      this.config.get<string>('SCHEDULE_TIMEZONE') ||
      this.config.get<string>('TZ') ||
      'Africa/Lagos'
  }

  onModuleInit() {
    this.jobs = this.defineSchedule().build()
    this.logger.log(
      `Schedule kernel ready (tz=${this.timeZone}): ${this.jobs.map((j) => j.name).join(', ')}`,
    )
  }

  /**
   * Kernel::schedule() — register every recurring job here.
   * Do not put @Cron on the underlying services; this is the only schedule.
   */
  private defineSchedule(): Schedule {
    const s = new Schedule()

    s.call('bulkInvites', () => this.bulkInviteService.processPendingInvites())
      .everyMinute()
      .withoutOverlapping()
      .description('Process pending bulk tenant invites')

    s.call('webhooks', () => this.webhookService.retryFailedWebhooks())
      .everyFifteenMinutes()
      .withoutOverlapping()
      .description('Retry failed outbound webhooks')

    s.call('reminders', () => this.unifiedReminderService.handleReminders())
      .hourly()
      .withoutOverlapping()
      .description('Payment reminders + scheduled requests / sequences')

    s.call('settlements', () => this.processHourlySettlementsUseCase.execute())
      .hourly()
      .withoutOverlapping()
      .description('Hourly settlements and automated refunds')

    s.call('rentReminders', () => this.rentReminderUseCase.execute())
      .dailyAt('08:00')
      .withoutOverlapping()
      .description('Daily tenant rent-end reminders')

    s.call('dailySequences', () => this.queueDailySequencesUseCase.execute())
      .dailyAt('08:00')
      .withoutOverlapping()
      .description('Queue daily WhatsApp / email sequences')

    s.call('pmDailyDigest', () => this.unifiedReminderService.processPmDailyCrons())
      .dailyAt('09:00')
      .withoutOverlapping()
      .description('PM daily rent digests')

    return s
  }

  /** Fired every minute — Laravel's `schedule:run`. */
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.config.get<string>('DISABLE_INTERNAL_CRON') === 'true') {
      return
    }
    await this.runDue()
  }

  /** Run every job whose schedule matches "now" in the configured timezone. */
  async runDue(now: Date = new Date()): Promise<Record<string, string>> {
    const parts = getZonedParts(now, this.timeZone)
    const results: Record<string, string> = {}

    for (const job of this.jobs) {
      if (!job.isDue(parts)) continue
      results[job.name] = await this.execute(job)
    }

    return results
  }

  /** Manually run one named job (or all if name omitted). */
  async runTask(name?: string): Promise<Record<string, string>> {
    const results: Record<string, string> = {}

    if (!name) {
      for (const job of this.jobs) {
        results[job.name] = await this.execute(job)
      }
      return results
    }

    const job = this.jobs.find((j) => j.name.toLowerCase() === name.toLowerCase())
    if (!job) {
      results[name] = `unknown task (known: ${this.jobs.map((j) => j.name).join(', ')})`
      return results
    }

    // Aliases kept for the old cron.controller query params
    results[job.name] = await this.execute(job)
    return results
  }

  listJobs(): Array<{ name: string; description?: string }> {
    return this.jobs.map((j) => ({ name: j.name, description: j.description }))
  }

  private async execute(job: ScheduledJob): Promise<string> {
    if (job.withoutOverlapping && this.running.has(job.name)) {
      this.logger.warn(`[schedule] Skipping ${job.name} — previous run still in progress`)
      return 'skipped: overlapping'
    }

    this.running.add(job.name)
    const started = Date.now()
    this.logger.log(`[schedule] Running ${job.name}...`)

    try {
      await job.handler()
      const ms = Date.now() - started
      this.logger.log(`[schedule] ${job.name} completed in ${ms}ms`)
      return 'completed'
    } catch (err: any) {
      this.logger.error(`[schedule] ${job.name} failed: ${err?.message || err}`, err?.stack)
      return `failed: ${err?.message || String(err)}`
    } finally {
      this.running.delete(job.name)
    }
  }
}
