import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetBulkEmailCampaignsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15))
    const skip = (page - 1) * limit

    const where =
      query.status && query.status !== 'All'
        ? { status: query.status }
        : {}

    const [campaigns, total] = await Promise.all([
      this.prisma.upward_bulk_email_campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          targetGroup: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          skippedCount: true,
          createdById: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.upward_bulk_email_campaign.count({ where }),
    ])

    const campaignIds = campaigns.map((c) => c.id)

    // Fetch open counts & permanent failure counts in two lightweight grouped queries
    const [openCounts, recipientStatusCounts] =
      campaignIds.length > 0
        ? await Promise.all([
            this.prisma.upward_communication_log.groupBy({
              by: ['campaignId'],
              where: {
                campaignId: { in: campaignIds },
                isOpened: true,
              },
              _count: { _all: true },
            }),
            this.prisma.upward_bulk_email_recipient.groupBy({
              by: ['campaignId', 'status'],
              where: { campaignId: { in: campaignIds } },
              _count: { _all: true },
            }),
          ])
        : [[], []]

    const openMap = new Map<string, number>()
    for (const row of openCounts) {
      if (row.campaignId) openMap.set(row.campaignId, row._count._all)
    }

    const statusMap = new Map<
      string,
      { pending: number; processing: number; sent: number; failed: number; permanentFailed: number }
    >()
    for (const row of recipientStatusCounts) {
      const entry = statusMap.get(row.campaignId) || {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        permanentFailed: 0,
      }
      if (row.status === 'PENDING') entry.pending = row._count._all
      else if (row.status === 'PROCESSING') entry.processing = row._count._all
      else if (row.status === 'SENT') entry.sent = row._count._all
      else if (row.status === 'FAILED') entry.failed = row._count._all
      else if (row.status === 'PERMANENT_FAILED') entry.permanentFailed = row._count._all
      statusMap.set(row.campaignId, entry)
    }

    const data = campaigns.map((c) => {
      const counts = statusMap.get(c.id) || {
        pending: 0,
        processing: 0,
        sent: c.sentCount,
        failed: c.failedCount,
        permanentFailed: 0,
      }
      const openedCount = openMap.get(c.id) || 0
      const pendingCount = counts.pending + counts.processing
      const totalFailed = counts.failed + counts.permanentFailed

      return {
        ...c,
        sentCount: counts.sent,
        failedCount: totalFailed,
        retryableFailedCount: counts.failed,
        permanentFailedCount: counts.permanentFailed,
        pendingCount,
        openedCount,
        openRate: counts.sent > 0 ? Math.round((openedCount / counts.sent) * 100) : 0,
      }
    })

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
