import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { EmailBatchRetryManager } from './email-batch-retry-manager.service'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

const PERMANENT_ERROR_REGEX =
  /bad request|invalid.*address|is not a valid|suppress|unsubscribed|template name does not exist|number of parameters does not match/i

@Injectable()
export class RetryBatchEmailsUseCase {
  private readonly logger = new Logger(RetryBatchEmailsUseCase.name)
  private isBatchRunning = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
    private readonly batchManager: EmailBatchRetryManager,
  ) {}

  async execute(
    query: {
      email?: string
      type?: string
      acquisition?: string
      channel?: string
      date?: string
    },
    requesterId: string,
  ) {
    if (this.isBatchRunning) {
      return {
        success: false,
        message: 'A batch retry job is already running. Please wait for it to finish.',
      }
    }

    const { email, type, acquisition, channel, date } = query

    const where: Prisma.upward_communication_logWhereInput = {
      status: 'FAILED',
      channel: channel && channel !== 'All' ? channel : 'EMAIL',
      ...(email
        ? {
            OR: [
              { email: { contains: email, mode: 'insensitive' as const } },
              { recipient: { contains: email, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(date
        ? {
            createdAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lte: new Date(`${date}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(type && type !== 'All'
        ? type === 'CAMPAIGN'
          ? { type: { startsWith: 'CAMPAIGN' } }
          : { type }
        : {}),
      ...(acquisition && acquisition !== 'All'
        ? acquisition === 'waitlist_converted'
          ? { registeredUser: { isFromWaitlist: true } }
          : acquisition === 'invited'
            ? { registeredUser: { isFromInvite: true } }
            : acquisition === 'self_signup'
              ? { registeredUser: { isFromWaitlist: false, isFromInvite: false } }
              : {}
        : {}),
    }

    const failedLogs = await this.prisma.upward_communication_log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        registeredUserId: true,
        email: true,
        subject: true,
        body: true,
        type: true,
        lastError: true,
        campaignId: true,
        campaign: {
          select: { htmlTemplate: true },
        },
      },
    })

    if (failedLogs.length === 0) {
      return { success: false, message: 'No failed email logs matching criteria' }
    }

    // 1. Filter out permanent errors (e.g. 400 Bad Request) & deduplicate by (email, subject)
    const permanentIds: string[] = []
    const dedupMap = new Map<string, (typeof failedLogs)[number]>()
    const duplicateFailedIds: string[] = []

    for (const log of failedLogs) {
      const normalizedEmail = (log.email || '').trim().toLowerCase()
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        permanentIds.push(log.id)
        continue
      }
      if (log.lastError && PERMANENT_ERROR_REGEX.test(log.lastError)) {
        permanentIds.push(log.id)
        continue
      }
      const key = `${normalizedEmail}::${log.subject}`
      if (dedupMap.has(key)) {
        duplicateFailedIds.push(log.id)
        continue
      }
      dedupMap.set(key, log)
    }

    // Mark permanent failures so they aren't picked up again
    if (permanentIds.length > 0) {
      await this.prisma.upward_communication_log.updateMany({
        where: { id: { in: permanentIds } },
        data: { status: 'PERMANENT_FAILED' },
      })
    }

    // Mark duplicate failed rows as SUPERSEDED so only one retry goes out per (email, subject)
    if (duplicateFailedIds.length > 0) {
      await this.prisma.upward_communication_log.updateMany({
        where: { id: { in: duplicateFailedIds } },
        data: { status: 'SUPERSEDED' },
      })
    }

    // 2. Skip any (email, subject) that ALREADY succeeded previously — prevents double emails!
    const candidates = Array.from(dedupMap.values())
    const eligibleLogs: typeof candidates = []
    const alreadySentIds: string[] = []

    for (const log of candidates) {
      const existingSent = await this.prisma.upward_communication_log.findFirst({
        where: {
          email: { equals: log.email || '', mode: 'insensitive' },
          subject: log.subject,
          status: 'SENT',
        },
        select: { id: true },
      })
      if (existingSent) {
        alreadySentIds.push(log.id)
      } else {
        eligibleLogs.push(log)
      }
    }

    if (alreadySentIds.length > 0) {
      await this.prisma.upward_communication_log.updateMany({
        where: { id: { in: alreadySentIds } },
        data: { status: 'RETRIED_SUCCESS' },
      })
    }

    if (eligibleLogs.length === 0) {
      return {
        success: false,
        message: `No retryable failed emails found (${alreadySentIds.length} already delivered, ${permanentIds.length} permanent errors skipped).`,
      }
    }

    const jobId = randomUUID()
    this.batchManager.createJob(jobId, eligibleLogs.length)
    this.isBatchRunning = true

    this.runRetryLoop(jobId, eligibleLogs, requesterId).catch((err) => {
      this.logger.error(`Error running retry batch job ${jobId}:`, err)
    })

    return {
      success: true,
      jobId,
      total: eligibleLogs.length,
      skippedAlreadySent: alreadySentIds.length,
      skippedPermanent: permanentIds.length,
    }
  }

  private async runRetryLoop(
    jobId: string,
    logs: Array<{
      id: string
      userId: string | null
      registeredUserId: number | null
      email: string | null
      subject: string
      body: string | null
      type: string
      campaignId: string | null
      campaign: { htmlTemplate: string } | null
    }>,
    requesterId: string,
  ) {
    this.batchManager.updateJob(jobId, { status: 'processing' })

    let successCount = 0
    let failureCount = 0

    try {
      for (const log of logs) {
        const currentJob = this.batchManager.getJob(jobId)
        if (!currentJob) break

        try {
          const userId = log.userId || (log.registeredUserId ? String(log.registeredUserId) : '')
          const baseType = log.type.replace(/(_RETRY)+$/i, '')
          const htmlBody = log.body || log.campaign?.htmlTemplate || ''

          const result = await this.emailService.sendEmailWithRetry({
            userId: userId || undefined,
            email: log.email || '',
            subject: log.subject,
            html: htmlBody,
            type: `${baseType}_RETRY`,
            campaignId: log.campaignId || undefined,
            retriedFromLogId: log.id,
            omitLogBody: Boolean(log.campaignId),
            skipPmLookup: baseType === 'BULK',
            maxRetriesOverride: 2,
          })

          if (result.success) {
            successCount++
            // Mark original FAILED log as resolved so it can NEVER be retried again!
            await this.prisma.upward_communication_log.update({
              where: { id: log.id },
              data: { status: 'RETRIED_SUCCESS' },
            })
          } else {
            failureCount++
            await this.prisma.upward_communication_log.update({
              where: { id: log.id },
              data: {
                status: result.isPermanentError ? 'PERMANENT_FAILED' : 'FAILED',
                lastError: result.error || 'Retry failed',
                retries: { increment: 1 },
              },
            })
          }
        } catch (err) {
          failureCount++
          this.logger.error(`Failed to retry log ${log.id} in batch:`, err)
        }

        const progress = this.batchManager.getJob(jobId)
        if (progress) {
          this.batchManager.updateJob(jobId, {
            processed: progress.processed + 1,
          })
        }

        // Gentle pacing for Mailgun
        await new Promise((resolve) => setTimeout(resolve, 150))
      }

      this.batchManager.updateJob(jobId, {
        status: 'completed',
        message: `Completed retrying emails. Successes: ${successCount}, Failures: ${failureCount}`,
      })

      await this.adminLogService.logAction(
        requesterId,
        'RESEND_EMAIL_BATCH',
        `Manually retried failed emails batch (job: ${jobId}). Total: ${logs.length}. Successes: ${successCount}, Failures: ${failureCount}`,
      )
    } finally {
      this.isBatchRunning = false
    }
  }
}
