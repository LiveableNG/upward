import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export function humanizeEmailError(rawError?: string | null): string | null {
  if (!rawError) return null
  const lower = rawError.toLowerCase()
  if (lower.includes('bad request') || lower.includes('not a valid') || lower.includes('invalid')) {
    return 'Invalid email address or malformed recipient (cannot be retried)'
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return 'Email provider temporarily busy — auto-retry scheduled'
  }
  if (lower.includes('suppress') || lower.includes('unsubscribed') || lower.includes('bounce')) {
    return 'Recipient previously bounced or unsubscribed'
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Email provider authentication error — check Mailgun credentials'
  }
  if (lower.includes('timeout') || lower.includes('econnreset') || lower.includes('network')) {
    return 'Temporary network timeout — safe to retry'
  }
  return rawError.length > 140 ? `${rawError.slice(0, 140)}…` : rawError
}

@Injectable()
export class GetBulkEmailCampaignDetailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    campaignId: string,
    query: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const campaign = await this.prisma.upward_bulk_email_campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new NotFoundException('Bulk email campaign not found')
    }

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))
    const skip = (page - 1) * limit

    const where: any = {
      campaignId,
      ...(query.search
        ? { email: { contains: query.search.trim(), mode: 'insensitive' as const } }
        : {}),
      ...(query.status && query.status !== 'ALL'
        ? query.status === 'FAILED'
          ? { status: { in: ['FAILED', 'PERMANENT_FAILED'] } }
          : query.status === 'PENDING'
            ? { status: { in: ['PENDING', 'PROCESSING'] } }
            : { status: query.status }
        : {}),
    }

    const [recipients, total, statusBreakdown] = await Promise.all([
      this.prisma.upward_bulk_email_recipient.findMany({
        where,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          lastError: true,
          sentAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.upward_bulk_email_recipient.count({ where }),
      this.prisma.upward_bulk_email_recipient.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { _all: true },
      }),
    ])

    const counts = {
      sent: 0,
      failed: 0,
      permanentFailed: 0,
      pending: 0,
      processing: 0,
      cancelled: 0,
    }
    for (const row of statusBreakdown) {
      if (row.status === 'SENT') counts.sent = row._count._all
      else if (row.status === 'FAILED') counts.failed = row._count._all
      else if (row.status === 'PERMANENT_FAILED') counts.permanentFailed = row._count._all
      else if (row.status === 'PENDING') counts.pending = row._count._all
      else if (row.status === 'PROCESSING') counts.processing = row._count._all
      else if (row.status === 'CANCELLED') counts.cancelled = row._count._all
    }

    return {
      campaign: {
        ...campaign,
        sentCount: counts.sent,
        failedCount: counts.failed + counts.permanentFailed,
        retryableFailedCount: counts.failed,
        permanentFailedCount: counts.permanentFailed,
        pendingCount: counts.pending + counts.processing,
      },
      recipients: recipients.map((r) => ({
        ...r,
        friendlyError: humanizeEmailError(r.lastError),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
