import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { EmailBatchRetryManager } from './email-batch-retry-manager.service'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

@Injectable()
export class RetryBatchEmailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
    private readonly batchManager: EmailBatchRetryManager,
  ) {}

  async execute(
    query: { email?: string; type?: string; acquisition?: string },
    requesterId: string,
  ) {
    const { email, type, acquisition } = query

    const where: Prisma.upward_email_logWhereInput = {
      status: 'FAILED',
      ...(email ? { email: { contains: email, mode: 'insensitive' as const } } : {}),
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

    const failedLogs = await this.prisma.upward_email_log.findMany({
      where,
      select: {
        id: true,
        userId: true,
        registeredUserId: true,
        email: true,
        subject: true,
        body: true,
        type: true,
      },
    })

    if (failedLogs.length === 0) {
      return { success: false, message: 'No failed logs matching criteria' }
    }

    const jobId = randomUUID()
    this.batchManager.createJob(jobId, failedLogs.length)

    // Trigger the background loop asynchronously
    this.runRetryLoop(jobId, failedLogs, requesterId).catch((err) => {
      console.error(`Error running retry batch job ${jobId}:`, err)
    })

    return { success: true, jobId, total: failedLogs.length }
  }

  private async runRetryLoop(jobId: string, logs: any[], requesterId: string) {
    this.batchManager.updateJob(jobId, { status: 'processing' })

    let successCount = 0
    let failureCount = 0

    for (const log of logs) {
      // Check if job was cancelled or deleted
      const currentJob = this.batchManager.getJob(jobId)
      if (!currentJob) {
        break
      }

      try {
        const userId = log.userId || (log.registeredUserId ? String(log.registeredUserId) : '')
        const result = await this.emailService.sendEmailWithRetry({
          userId: userId || undefined,
          email: log.email || '',
          subject: log.subject,
          html: log.body || '',
          type: `${log.type}_RETRY`,
        })

        if (result.success) {
          successCount++
        } else {
          failureCount++
        }
      } catch (err) {
        failureCount++
        console.error(`Failed to retry log ${log.id} in batch:`, err)
      }

      const progress = this.batchManager.getJob(jobId)
      if (progress) {
        this.batchManager.updateJob(jobId, {
          processed: progress.processed + 1,
        })
      }

      // Introduce a slight delay (e.g. 100ms) to prevent overwhelming Mailgun or rate limits
      await new Promise((resolve) => setTimeout(resolve, 100))
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
  }
}
