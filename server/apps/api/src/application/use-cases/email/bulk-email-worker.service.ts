import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { wrapInBaseTemplate } from '../../../shared/infrastructure/email/templates'
import { formatName } from '@upward/common-utils'

interface ClaimedRecipientRow {
  id: string
  campaignId: string
  email: string
  firstName: string | null
  lastName: string | null
  recipientUserId: string | null
  attempts: number
  maxAttempts: number
  subject: string
  htmlTemplate: string
}

@Injectable()
export class BulkEmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BulkEmailWorkerService.name)
  private isDraining = false
  private stopped = false
  private startupTimer?: ReturnType<typeof setTimeout>

  // Tuned to keep Mailgun and Node healthy: ~15-20 emails/sec (~1,000/min)
  private readonly CLAIM_BATCH_SIZE = 10
  private readonly CONCURRENCY = 5
  private readonly CHUNK_DELAY_MS = 250

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    // Delay startup recovery slightly so Prisma & Nest are fully ready
    this.startupTimer = setTimeout(() => {
      this.processQueueTick().catch((err) => {
        this.logger.error('Startup bulk email recovery failed:', err)
      })
    }, 3000)
  }

  onModuleDestroy() {
    this.stopped = true
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
    }
  }

  /**
   * Non-blocking wakeup called whenever a new campaign is queued or retried.
   */
  kick() {
    if (this.isDraining || this.stopped) return
    void this.drainLoop()
  }

  /**
   * Periodic safety tick (called every minute by ScheduleService) to recover
   * any stale PROCESSING rows after a crash/restart and resume delayed retries.
   */
  async processQueueTick() {
    if (this.stopped) return

    try {
      // Recover recipients stuck in PROCESSING for > 5 minutes (e.g. PM2 restart)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
      const recovered = await this.prisma.upward_bulk_email_recipient.updateMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: fiveMinsAgo },
        },
        data: {
          status: 'PENDING',
          nextRetryAt: null,
        },
      })

      if (recovered.count > 0) {
        this.logger.warn(
          `Recovered ${recovered.count} stale PROCESSING bulk email recipient(s) after restart`,
        )
      }

      // Check if there are any active campaigns with ready work
      const activeCount = await this.prisma.upward_bulk_email_campaign.count({
        where: { status: { in: ['QUEUED', 'SENDING'] } },
      })

      if (activeCount > 0) {
        this.kick()
      }
    } catch (err) {
      this.logger.error('BulkEmailWorkerService tick error:', err)
    }
  }

  private async drainLoop() {
    if (this.isDraining || this.stopped) return
    this.isDraining = true

    try {
      while (!this.stopped) {
        const batch = await this.claimNextBatch()
        if (batch.length === 0) {
          await this.finalizeCompletedCampaigns()
          break
        }

        // Mark touched campaigns as SENDING
        const campaignIds = Array.from(new Set(batch.map((r) => r.campaignId)))
        await this.prisma.upward_bulk_email_campaign.updateMany({
          where: {
            id: { in: campaignIds },
            status: 'QUEUED',
          },
          data: {
            status: 'SENDING',
            startedAt: new Date(),
          },
        })

        // Process claimed rows with bounded concurrency
        for (let i = 0; i < batch.length; i += this.CONCURRENCY) {
          if (this.stopped) break
          const chunk = batch.slice(i, i + this.CONCURRENCY)
          await Promise.allSettled(chunk.map((recipient) => this.processRecipient(recipient)))

          if (i + this.CONCURRENCY < batch.length && !this.stopped) {
            await new Promise((resolve) => setTimeout(resolve, this.CHUNK_DELAY_MS))
          }
        }

        // Reconcile counters & completion state for touched campaigns
        await this.syncCampaignCounters(campaignIds)

        // Short pause between batches to yield event loop & respect Mailgun rate limits
        await new Promise((resolve) => setTimeout(resolve, this.CHUNK_DELAY_MS))
      }
    } catch (err) {
      this.logger.error('BulkEmailWorkerService drainLoop error:', err)
    } finally {
      this.isDraining = false
    }
  }

  /**
   * Atomically claims the next batch of PENDING recipients using PostgreSQL
   * FOR UPDATE SKIP LOCKED — zero Redis needed, completely race-free.
   */
  private async claimNextBatch(): Promise<ClaimedRecipientRow[]> {
    return this.prisma.$queryRaw<ClaimedRecipientRow[]>`
      WITH next_rows AS (
        SELECT r.id
        FROM "upward_bulk_email_recipient" r
        INNER JOIN "upward_bulk_email_campaign" c ON c.id = r."campaignId"
        WHERE c.status IN ('QUEUED', 'SENDING')
          AND r.status = 'PENDING'
          AND (r."nextRetryAt" IS NULL OR r."nextRetryAt" <= NOW())
        ORDER BY c."createdAt" ASC, r."createdAt" ASC
        LIMIT ${this.CLAIM_BATCH_SIZE}
        FOR UPDATE OF r SKIP LOCKED
      ),
      claimed AS (
        UPDATE "upward_bulk_email_recipient" r
        SET
          status = 'PROCESSING',
          attempts = r.attempts + 1,
          "updatedAt" = NOW()
        FROM next_rows
        WHERE r.id = next_rows.id
        RETURNING r.id, r."campaignId", r.email, r."firstName", r."lastName", r."recipientUserId", r.attempts, r."maxAttempts"
      )
      SELECT
        cl.id,
        cl."campaignId",
        cl.email,
        cl."firstName",
        cl."lastName",
        cl."recipientUserId",
        cl.attempts,
        cl."maxAttempts",
        c.subject,
        c."htmlTemplate"
      FROM claimed cl
      INNER JOIN "upward_bulk_email_campaign" c ON c.id = cl."campaignId"
    `
  }

  private async processRecipient(recipient: ClaimedRecipientRow) {
    try {
      const customizedContent = recipient.htmlTemplate
        .replace(
          /{{first\s*name}}|{{firstName}}|{{first_name}}/gi,
          recipient.firstName ? formatName(recipient.firstName) : 'there',
        )
        .replace(
          /{{last\s*name}}|{{lastName}}|{{last_name}}/gi,
          recipient.lastName ? formatName(recipient.lastName) : '',
        )
        .replace(/{{email}}/gi, recipient.email)

      const finalHtml = wrapInBaseTemplate(customizedContent, recipient.subject, recipient.email)

      const result = await this.emailService.sendEmailWithRetry({
        userId: recipient.recipientUserId || undefined,
        email: recipient.email,
        subject: recipient.subject,
        html: finalHtml,
        type: 'BULK',
        campaignId: recipient.campaignId,
        omitLogBody: true, // HTML template is already stored once on upward_bulk_email_campaign
        skipPmLookup: true, // Platform bulk email — skip per-email PM/user DB lookups
        maxRetriesOverride: 1, // Queue handles retries with clean backoff
      })

      if (result.success) {
        await this.prisma.upward_bulk_email_recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            mailgunId: result.mailgunId || null,
            lastError: null,
            nextRetryAt: null,
            sentAt: new Date(),
          },
        })
      } else if (result.isPermanentError || recipient.attempts >= recipient.maxAttempts) {
        await this.prisma.upward_bulk_email_recipient.update({
          where: { id: recipient.id },
          data: {
            status: result.isPermanentError ? 'PERMANENT_FAILED' : 'FAILED',
            lastError: result.error || 'Delivery failed',
            nextRetryAt: null,
          },
        })
      } else {
        // Transient error (429, 5xx, network timeout) -> schedule backoff retry: 30s, 2m, 10m
        const backoffSeconds = recipient.attempts === 1 ? 30 : recipient.attempts === 2 ? 120 : 600
        await this.prisma.upward_bulk_email_recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'PENDING',
            lastError: result.error || 'Temporary error — scheduled for retry',
            nextRetryAt: new Date(Date.now() + backoffSeconds * 1000),
          },
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected worker error'
      this.logger.error(`Unexpected error processing campaign recipient ${recipient.id}: ${msg}`)

      if (recipient.attempts >= recipient.maxAttempts) {
        await this.prisma.upward_bulk_email_recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            lastError: msg,
            nextRetryAt: null,
          },
        })
      } else {
        await this.prisma.upward_bulk_email_recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'PENDING',
            lastError: msg,
            nextRetryAt: new Date(Date.now() + 30 * 1000),
          },
        })
      }
    }
  }

  async syncCampaignCounters(campaignIds: string[]) {
    for (const campaignId of campaignIds) {
      const counts = await this.prisma.upward_bulk_email_recipient.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { _all: true },
      })

      let sentCount = 0
      let failedCount = 0
      let remaining = 0

      for (const row of counts) {
        if (row.status === 'SENT') sentCount += row._count._all
        else if (row.status === 'FAILED' || row.status === 'PERMANENT_FAILED') {
          failedCount += row._count._all
        } else if (row.status === 'PENDING' || row.status === 'PROCESSING') {
          remaining += row._count._all
        }
      }

      const currentCampaign = await this.prisma.upward_bulk_email_campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      })

      if (!currentCampaign) continue

      const isTerminal =
        remaining === 0 &&
        currentCampaign.status !== 'PAUSED' &&
        currentCampaign.status !== 'CANCELLED'

      await this.prisma.upward_bulk_email_campaign.update({
        where: { id: campaignId },
        data: {
          sentCount,
          failedCount,
          ...(isTerminal
            ? {
                status: failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
                completedAt: new Date(),
              }
            : {}),
        },
      })
    }
  }

  private async finalizeCompletedCampaigns() {
    const activeCampaigns = await this.prisma.upward_bulk_email_campaign.findMany({
      where: { status: { in: ['QUEUED', 'SENDING'] } },
      select: { id: true },
    })

    if (activeCampaigns.length > 0) {
      await this.syncCampaignCounters(activeCampaigns.map((c) => c.id))
    }
  }
}
