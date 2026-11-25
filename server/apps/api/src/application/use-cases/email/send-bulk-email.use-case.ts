import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { BulkEmailWorkerService } from './bulk-email-worker.service'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ResolvedRecipient {
  email: string
  firstName?: string | null
  lastName?: string | null
  recipientUserId?: string | null
}

@Injectable()
export class SendBulkEmailUseCase {
  private readonly logger = new Logger(SendBulkEmailUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
    private readonly encryption: EncryptionService,
    private readonly bulkEmailWorker: BulkEmailWorkerService,
  ) {}

  async execute(payload: {
    userIds: string[]
    subject: string
    content: string
    targetGroup?: 'TENANTS' | 'PMS' | 'WAITLIST' | 'RAW'
    sessionId?: string
    requesterId?: string
    idempotencyKey?: string
  }) {
    const target = payload.targetGroup || 'TENANTS'
    const subject = (payload.subject || '').trim()
    const content = (payload.content || '').trim()

    if (!subject) throw new BadRequestException('Subject is required')
    if (!content) throw new BadRequestException('Email content is required')
    if (!payload.userIds || payload.userIds.length === 0) {
      throw new BadRequestException('At least one recipient is required')
    }

    // 1. Idempotency check: prevent accidental double-submits
    if (payload.idempotencyKey) {
      const existing = await this.prisma.upward_bulk_email_campaign.findUnique({
        where: { idempotencyKey: payload.idempotencyKey },
      })
      if (existing) {
        this.logger.warn(
          `Duplicate bulk email submit blocked via idempotencyKey=${payload.idempotencyKey} (campaignId=${existing.id})`,
        )
        return {
          campaignId: existing.id,
          status: existing.status,
          totalQueued: existing.totalRecipients,
          duplicatesRemoved: existing.skippedCount,
          invalidRemoved: 0,
          deduplicatedSubmission: true,
        }
      }
    }

    // 2. Resolve, validate, and deduplicate recipients
    const rawResolved: ResolvedRecipient[] = []

    if (target === 'PMS') {
      const pms = await this.prisma.upward_property_manager.findMany({
        where: { uuid: { in: payload.userIds } },
        select: { uuid: true, email: true, firstName: true, lastName: true },
      })
      for (const pm of pms) {
        let email = ''
        let firstName = ''
        let lastName = ''
        try {
          email = this.encryption.decrypt(pm.email)
          firstName = this.encryption.decrypt(pm.firstName)
          lastName = this.encryption.decrypt(pm.lastName)
        } catch {
          email = pm.email
          firstName = pm.firstName
          lastName = pm.lastName
        }
        rawResolved.push({ email, firstName, lastName, recipientUserId: pm.uuid })
      }
    } else if (target === 'WAITLIST') {
      const entries = await this.prisma.upward_waitlist.findMany({
        where: {
          OR: [{ uuid: { in: payload.userIds } }, { id: { in: payload.userIds } }],
          unsubscribed: false,
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      for (const entry of entries) {
        rawResolved.push({
          email: entry.email,
          firstName: entry.firstName,
          lastName: entry.lastName,
          recipientUserId: entry.id,
        })
      }
    } else if (target === 'RAW') {
      for (const rawEmail of payload.userIds) {
        rawResolved.push({ email: rawEmail || '' })
      }
    } else {
      // TENANTS (default)
      const users = await this.prisma.upward_user.findMany({
        where: { uuid: { in: payload.userIds }, unsubscribed: false },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      for (const user of users) {
        let email = ''
        let firstName = ''
        let lastName = ''
        try {
          email = this.encryption.decrypt(user.email)
          firstName = this.encryption.decrypt(user.firstName)
          lastName = this.encryption.decrypt(user.lastName)
        } catch {
          email = user.email
          firstName = user.firstName
          lastName = user.lastName
        }
        rawResolved.push({
          email,
          firstName,
          lastName,
          recipientUserId: String(user.id),
        })
      }
    }

    const uniqueMap = new Map<string, ResolvedRecipient>()
    let duplicatesRemoved = 0
    let invalidRemoved = 0

    for (const r of rawResolved) {
      const normalized = (r.email || '').trim().toLowerCase()
      if (!normalized || !EMAIL_REGEX.test(normalized)) {
        invalidRemoved++
        continue
      }
      if (uniqueMap.has(normalized)) {
        duplicatesRemoved++
        continue
      }
      uniqueMap.set(normalized, {
        ...r,
        email: normalized,
      })
    }

    const uniqueRecipients = Array.from(uniqueMap.values())
    if (uniqueRecipients.length === 0) {
      throw new BadRequestException('No valid email addresses found in the recipient list')
    }

    // Secondary double-send guard: identical subject + targetGroup + recipient count queued in last 3 minutes
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)
    const recentDuplicate = await this.prisma.upward_bulk_email_campaign.findFirst({
      where: {
        subject,
        targetGroup: target,
        totalRecipients: uniqueRecipients.length,
        createdAt: { gte: threeMinutesAgo },
        status: { in: ['QUEUED', 'SENDING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentDuplicate) {
      this.logger.warn(
        `Blocked probable duplicate bulk campaign "${subject}" (${uniqueRecipients.length} recipients) within 3 minutes of campaign ${recentDuplicate.id}`,
      )
      return {
        campaignId: recentDuplicate.id,
        status: recentDuplicate.status,
        totalQueued: recentDuplicate.totalRecipients,
        duplicatesRemoved,
        invalidRemoved,
        deduplicatedSubmission: true,
      }
    }

    // 3. Persist campaign + recipients in PostgreSQL queue (fast bulk insert)
    const campaign = await this.prisma.upward_bulk_email_campaign.create({
      data: {
        subject,
        htmlTemplate: content,
        targetGroup: target,
        status: 'QUEUED',
        idempotencyKey: payload.idempotencyKey || null,
        totalRecipients: uniqueRecipients.length,
        skippedCount: duplicatesRemoved + invalidRemoved,
        createdById: payload.requesterId || null,
      },
    })

    const INSERT_CHUNK_SIZE = 500
    for (let i = 0; i < uniqueRecipients.length; i += INSERT_CHUNK_SIZE) {
      const slice = uniqueRecipients.slice(i, i + INSERT_CHUNK_SIZE)
      await this.prisma.upward_bulk_email_recipient.createMany({
        data: slice.map((r) => ({
          campaignId: campaign.id,
          email: r.email,
          firstName: r.firstName || null,
          lastName: r.lastName || null,
          recipientUserId: r.recipientUserId || null,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      })
    }

    if (payload.requesterId) {
      await this.adminLogService.logAction(
        payload.requesterId,
        'SEND_EMAIL',
        `Queued bulk email campaign (${campaign.id}) for ${uniqueRecipients.length} unique recipients (${target}, ${duplicatesRemoved} duplicates removed). Subject: ${subject}`,
      )
    }

    // 4. Enqueue recipients into BullMQ (non-blocking)
    this.bulkEmailWorker.kick(campaign.id)

    return {
      campaignId: campaign.id,
      status: 'QUEUED',
      totalQueued: uniqueRecipients.length,
      duplicatesRemoved,
      invalidRemoved,
      deduplicatedSubmission: false,
    }
  }
}
