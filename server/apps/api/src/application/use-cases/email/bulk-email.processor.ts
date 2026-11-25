import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job, UnrecoverableError } from 'bullmq'
import { formatName } from '@upward/common-utils'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { wrapInBaseTemplate } from '../../../shared/infrastructure/email/templates'
import {
  BULK_EMAIL_QUEUE,
  BulkEmailRecipientJobData,
} from '../../../shared/infrastructure/queue/queue.constants'
import { BulkEmailWorkerService } from './bulk-email-worker.service'

/**
 * BullMQ Worker Processor for bulk email campaigns.
 * - Concurrency: 5 parallel sends
 * - Native Redis Rate Limiter: max 18 emails / second (~1,080/min) to protect Mailgun & Node
 * - Source of truth stays in PostgreSQL (upward_bulk_email_campaign + upward_bulk_email_recipient)
 */
@Processor(BULK_EMAIL_QUEUE, {
  concurrency: 5,
  limiter: {
    max: 18,
    duration: 1000,
  },
})
export class BulkEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkEmailProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly bulkEmailWorker: BulkEmailWorkerService,
  ) {
    super()
  }

  async process(job: Job<BulkEmailRecipientJobData>): Promise<{ status: string }> {
    const { campaignId, recipientId } = job.data

    const recipient = await this.prisma.upward_bulk_email_recipient.findUnique({
      where: { id: recipientId },
      include: {
        campaign: {
          select: {
            id: true,
            subject: true,
            htmlTemplate: true,
            status: true,
            startedAt: true,
          },
        },
      },
    })

    if (!recipient || !recipient.campaign) {
      return { status: 'MISSING' }
    }

    // Idempotency guard: already delivered or permanently failed
    if (recipient.status === 'SENT' || recipient.status === 'PERMANENT_FAILED') {
      return { status: 'ALREADY_TERMINAL' }
    }

    // Respect Pause / Cancel controls immediately
    if (recipient.campaign.status === 'CANCELLED') {
      await this.prisma.upward_bulk_email_recipient.update({
        where: { id: recipient.id },
        data: { status: 'CANCELLED' },
      })
      return { status: 'CANCELLED' }
    }

    if (recipient.campaign.status === 'PAUSED') {
      // Leave recipient PENDING so Resume re-enqueues it cleanly
      await this.prisma.upward_bulk_email_recipient.update({
        where: { id: recipient.id },
        data: { status: 'PENDING' },
      })
      return { status: 'PAUSED' }
    }

    // Transition campaign QUEUED -> SENDING on first processed recipient
    if (recipient.campaign.status === 'QUEUED') {
      await this.prisma.upward_bulk_email_campaign.updateMany({
        where: { id: campaignId, status: 'QUEUED' },
        data: {
          status: 'SENDING',
          startedAt: recipient.campaign.startedAt || new Date(),
        },
      })
    }

    // Mark recipient PROCESSING
    const attemptNumber = (job.attemptsMade || 0) + 1
    await this.prisma.upward_bulk_email_recipient.update({
      where: { id: recipient.id },
      data: {
        status: 'PROCESSING',
        attempts: attemptNumber,
      },
    })

    const customizedContent = recipient.campaign.htmlTemplate
      .replace(
        /{{first\s*name}}|{{firstName}}|{{first_name}}/gi,
        recipient.firstName ? formatName(recipient.firstName) : 'there',
      )
      .replace(
        /{{last\s*name}}|{{lastName}}|{{last_name}}/gi,
        recipient.lastName ? formatName(recipient.lastName) : '',
      )
      .replace(/{{email}}/gi, recipient.email)

    const finalHtml = wrapInBaseTemplate(customizedContent, recipient.campaign.subject, recipient.email)

    const result = await this.emailService.sendEmailWithRetry({
      userId: recipient.recipientUserId || undefined,
      email: recipient.email,
      subject: recipient.campaign.subject,
      html: finalHtml,
      type: 'BULK',
      campaignId: recipient.campaignId,
      omitLogBody: true, // HTML template stored once on upward_bulk_email_campaign
      skipPmLookup: true, // Skip per-email PM/user lookups for platform bulk sends
      maxRetriesOverride: 1, // BullMQ manages exponential backoff retries natively
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
      await this.bulkEmailWorker.scheduleCampaignSync(campaignId)
      return { status: 'SENT' }
    }

    // Permanent 4xx error (invalid email, suppressed, etc.) -> never retry
    if (result.isPermanentError) {
      await this.prisma.upward_bulk_email_recipient.update({
        where: { id: recipient.id },
        data: {
          status: 'PERMANENT_FAILED',
          lastError: result.error || 'Permanent delivery failure',
          nextRetryAt: null,
        },
      })
      await this.bulkEmailWorker.scheduleCampaignSync(campaignId)
      throw new UnrecoverableError(result.error || 'Permanent email delivery failure')
    }

    // Transient error (429 / 5xx / network) -> let BullMQ retry with exponential backoff
    const maxAttempts = job.opts.attempts || recipient.maxAttempts || 3
    const isFinalAttempt = attemptNumber >= maxAttempts

    await this.prisma.upward_bulk_email_recipient.update({
      where: { id: recipient.id },
      data: {
        status: isFinalAttempt ? 'FAILED' : 'PENDING',
        lastError: result.error || 'Temporary delivery error',
      },
    })

    if (isFinalAttempt) {
      await this.bulkEmailWorker.scheduleCampaignSync(campaignId)
    }

    throw new Error(result.error || 'Transient email delivery error')
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<BulkEmailRecipientJobData> | undefined, err: Error) {
    if (!job) return
    const isFinal =
      err instanceof UnrecoverableError ||
      (job.attemptsMade || 0) >= (job.opts.attempts || 3)
    if (isFinal) {
      this.logger.warn(
        `Bulk email job ${job.id} permanently failed after ${job.attemptsMade} attempt(s): ${err.message}`,
      )
    }
  }
}
