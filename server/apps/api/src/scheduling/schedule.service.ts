import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { BulkInviteService } from '../shared/infrastructure/common/bulk-invite.service'
import { WebhookService } from '../shared/infrastructure/common/webhook/webhook.service'
import { UnifiedReminderService } from '../shared/infrastructure/common/reminder.service'
import { RentReminderWorkflowUseCase } from '../application/use-cases/notifications/rent-reminder-workflow.use-case'
import { ProcessHourlySettlementsUseCase } from '../application/use-cases/payments/settlement-cron.use-case'
import { SendHomeRequestDigestUseCase } from '../application/use-cases/home-request/send-home-request-digest.use-case'
import { QueueDailySequencesUseCase } from '../application/use-cases/sequence/queue-daily-sequences.use-case'
import { ApplyDailySavingsInterestUseCase } from '../application/use-cases/payments/wallet.use-cases'
import { NotifyEligibleDeletionAccountsUseCase } from '../application/use-cases/admin/notify-eligible-deletion-accounts.use-case'
import { getZonedParts, Schedule, ScheduledJob } from './schedule.builder'
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../shared/infrastructure/common/s3/s3.service'


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
    private readonly sendHomeRequestDigestUseCase: SendHomeRequestDigestUseCase,
    private readonly queueDailySequencesUseCase: QueueDailySequencesUseCase,
    private readonly applyDailySavingsInterestUseCase: ApplyDailySavingsInterestUseCase,
    private readonly notifyEligibleDeletionAccountsUseCase: NotifyEligibleDeletionAccountsUseCase,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
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

    s.call('homeRequestDigest', () => this.sendHomeRequestDigestUseCase.execute())
      .dailyAt('08:00')
      .withoutOverlapping()
      .description('Daily email digest of prior day\'s home requests, sent to all PMs')

    s.call('savingsInterest', async () => {
      await this.applyDailySavingsInterestUseCase.execute()
    })
      .dailyAt('00:00')
      .withoutOverlapping()
      .description('Apply daily savings interest')

    s.call('deletionDigest', async () => {
      await this.notifyEligibleDeletionAccountsUseCase.execute()
    })
      .dailyAt('09:00')
      .withoutOverlapping()
      .description('Daily digest to admins listing 10, 20, and 30+ day disabled accounts pending deletion')

    s.call('cleanupDevEmails', async () => {
      this.logger.log('Starting daily dev-emails S3 and database cleanup task...')
      try {
        await this.prisma.upward_dev_email_preview.deleteMany()
        await this.s3Service.deleteObjectsWithPrefix('dev-emails/')
        this.logger.log('Daily dev-emails S3 and database cleanup task completed successfully.')
      } catch (err) {
        this.logger.error('Failed to run daily dev-emails S3 and database cleanup task:', err)
      }
    })
      .dailyAt('03:00')
      .withoutOverlapping()
      .description('Daily cleanup of mock dev emails from S3 and database')

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
