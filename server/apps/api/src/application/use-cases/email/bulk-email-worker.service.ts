import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import {
  BULK_EMAIL_QUEUE,
  BULK_EMAIL_JOBS,
  BulkEmailRecipientJobData,
} from '../../../shared/infrastructure/queue/queue.constants'

/**
 * BullMQ Producer & Self-Healing Reconciler for bulk email campaigns.
 * - Enqueues recipient jobs into Redis/BullMQ with deterministic jobId = recipient.id
 *   (guaranteeing zero duplicate jobs even across retries or restarts).
 * - Debounces PostgreSQL campaign counter syncs so 1,787 sends don't hammer Postgres.
 * - 1-minute safety tick recovers any stale PROCESSING rows or re-enqueues PENDING rows
 *   if Redis was ever flushed/restarted.
 */
@Injectable()
export class BulkEmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BulkEmailWorkerService.name)
  private readonly syncTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private startupTimer?: ReturnType<typeof setTimeout>
  private stopped = false

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BULK_EMAIL_QUEUE)
    private readonly bulkEmailQueue: Queue<BulkEmailRecipientJobData>,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return
    this.startupTimer = setTimeout(() => {
      this.processQueueTick().catch((err) => {
        this.logger.error('Startup BullMQ bulk email reconciliation failed:', err)
      })
    }, 3000)
  }

  onModuleDestroy() {
    this.stopped = true
    if (this.startupTimer) clearTimeout(this.startupTimer)
    for (const timer of this.syncTimers.values()) {
      clearTimeout(timer)
    }
    this.syncTimers.clear()
  }

  /**
   * Non-blocking wakeup called whenever a campaign is created, resumed, or retried.
   */
  kick(campaignId?: string, clearPreviousJobs = false) {
    if (this.stopped) return
    if (campaignId) {
      void this.enqueueCampaign(campaignId, clearPreviousJobs).catch((err) => {
        this.logger.error(`Failed to enqueue campaign ${campaignId} into BullMQ:`, err)
      })
    } else {
      void this.processQueueTick()
    }
  }

  /**
   * Enqueues all PENDING recipients of a campaign into BullMQ in chunks of 500.
   * Uses `jobId: bulk-${recipient.id}` so BullMQ automatically deduplicates already-queued jobs.
   */
  async enqueueCampaign(campaignId: string, clearPreviousJobs = false): Promise<number> {
    if (this.stopped) return 0

    const pendingRecipients = await this.prisma.upward_bulk_email_recipient.findMany({
      where: {
        campaignId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, maxAttempts: true },
    })

    if (pendingRecipients.length === 0) {
      await this.syncCampaignCounters([campaignId])
      return 0
    }

    if (clearPreviousJobs) {
      await Promise.allSettled(
        pendingRecipients.map(async (r) => {
          const existing = await this.bulkEmailQueue.getJob(`bulk-${r.id}`)
          if (existing) {
            await existing.remove()
          }
        }),
      )
    }

    const CHUNK_SIZE = 500
    for (let i = 0; i < pendingRecipients.length; i += CHUNK_SIZE) {
      const slice = pendingRecipients.slice(i, i + CHUNK_SIZE)
      await this.bulkEmailQueue.addBulk(
        slice.map((r) => ({
          name: BULK_EMAIL_JOBS.SEND_RECIPIENT,
          data: {
            campaignId,
            recipientId: r.id,
          },
          opts: {
            jobId: `bulk-${r.id}`,
            attempts: r.maxAttempts || 3,
            backoff: {
              type: 'exponential',
              delay: 30_000,
            },
          },
        })),
      )
    }

    this.logger.log(
      `Enqueued ${pendingRecipients.length} recipient job(s) for campaign ${campaignId} into BullMQ`,
    )
    return pendingRecipients.length
  }

  /**
   * Debounces campaign counter + completion syncs to at most once every 1.5 seconds per campaign.
   */
  async scheduleCampaignSync(campaignId: string) {
    if (this.syncTimers.has(campaignId)) return
    const timer = setTimeout(() => {
      this.syncTimers.delete(campaignId)
      this.syncCampaignCounters([campaignId]).catch((err) => {
        this.logger.error(`Failed to sync counters for campaign ${campaignId}:`, err)
      })
    }, 1500)
    this.syncTimers.set(campaignId, timer)
  }

  /**
   * Periodic self-healing tick (called every minute by ScheduleService):
   * 1. Recovers any recipients stuck in PROCESSING for > 5 minutes (e.g., hard kill).
   * 2. Re-enqueues any PENDING recipients of active campaigns in case Redis was restarted/flushed.
   * 3. Finalizes any campaigns whose recipients have all finished.
   */
  async processQueueTick() {
    if (this.stopped) return

    try {
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
          `Recovered ${recovered.count} stale PROCESSING bulk email recipient(s)`,
        )
      }

      const activeCampaigns = await this.prisma.upward_bulk_email_campaign.findMany({
        where: { status: { in: ['QUEUED', 'SENDING'] } },
        select: { id: true },
      })

      if (activeCampaigns.length === 0) return

      for (const campaign of activeCampaigns) {
        await this.enqueueCampaign(campaign.id)
      }

      await this.syncCampaignCounters(activeCampaigns.map((c) => c.id))
    } catch (err) {
      this.logger.error('BulkEmailWorkerService tick error:', err)
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
}
