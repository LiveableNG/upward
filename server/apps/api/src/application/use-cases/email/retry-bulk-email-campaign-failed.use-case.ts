import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { BulkEmailWorkerService } from './bulk-email-worker.service'

@Injectable()
export class RetryBulkEmailCampaignFailedUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
    private readonly bulkEmailWorker: BulkEmailWorkerService,
  ) {}

  async execute(campaignId: string, requesterId?: string) {
    const campaign = await this.prisma.upward_bulk_email_campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new NotFoundException('Bulk email campaign not found')
    }

    // Only re-queue transient FAILED recipients (never SENT and never PERMANENT_FAILED)
    const updated = await this.prisma.upward_bulk_email_recipient.updateMany({
      where: {
        campaignId,
        status: 'FAILED',
      },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
      },
    })

    if (updated.count === 0) {
      return {
        success: false,
        requeuedCount: 0,
        message: 'No retryable failed recipients found for this campaign',
      }
    }

    await this.prisma.upward_bulk_email_campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        completedAt: null,
      },
    })

    if (requesterId) {
      await this.adminLogService.logAction(
        requesterId,
        'RESEND_EMAIL_BATCH',
        `Re-queued ${updated.count} failed recipients for bulk campaign "${campaign.subject}" (${campaignId})`,
      )
    }

    this.bulkEmailWorker.kick()

    return {
      success: true,
      requeuedCount: updated.count,
      message: `Re-queued ${updated.count} failed recipient(s) for delivery`,
    }
  }
}
