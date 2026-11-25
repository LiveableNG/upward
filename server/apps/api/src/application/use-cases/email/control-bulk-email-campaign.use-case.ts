import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { BulkEmailWorkerService } from './bulk-email-worker.service'

@Injectable()
export class ControlBulkEmailCampaignUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
    private readonly bulkEmailWorker: BulkEmailWorkerService,
  ) {}

  async execute(
    campaignId: string,
    action: 'PAUSE' | 'RESUME' | 'CANCEL',
    requesterId?: string,
  ) {
    const campaign = await this.prisma.upward_bulk_email_campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new NotFoundException('Bulk email campaign not found')
    }

    if (action === 'PAUSE') {
      if (!['QUEUED', 'SENDING'].includes(campaign.status)) {
        throw new BadRequestException(`Cannot pause a campaign in ${campaign.status} status`)
      }
      await this.prisma.upward_bulk_email_campaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      })
    } else if (action === 'RESUME') {
      if (campaign.status !== 'PAUSED') {
        throw new BadRequestException('Only PAUSED campaigns can be resumed')
      }
      await this.prisma.upward_bulk_email_campaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING' },
      })
      this.bulkEmailWorker.kick(campaignId, true)
    } else if (action === 'CANCEL') {
      if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
        throw new BadRequestException(`Campaign is already ${campaign.status}`)
      }
      await this.prisma.$transaction([
        this.prisma.upward_bulk_email_recipient.updateMany({
          where: { campaignId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        }),
        this.prisma.upward_bulk_email_campaign.update({
          where: { id: campaignId },
          data: { status: 'CANCELLED', completedAt: new Date() },
        }),
      ])
    } else {
      throw new BadRequestException('Invalid campaign action')
    }

    if (requesterId) {
      await this.adminLogService.logAction(
        requesterId,
        'BULK_EMAIL_CAMPAIGN_CONTROL',
        `${action} bulk email campaign "${campaign.subject}" (${campaignId})`,
      )
    }

    return { success: true, campaignId, action }
  }
}
