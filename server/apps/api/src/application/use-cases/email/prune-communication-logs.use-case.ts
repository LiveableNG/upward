import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

/**
 * Industry-standard tiered communication log retention:
 * 1. Warm tier (> 30 days): Strip HTML `body` (reclaims ~70% PostgreSQL TOAST space)
 *    while preserving full metadata (recipient, subject, status, sentAt, opens, errors).
 * 2. Internal noise (> 30 days): Purge high-volume internal SYSTEM_ALERT & AUTH_OTP rows.
 * 3. Cold tier (> 90 days): Purge marketing/bulk/sequence logs while preserving
 *    financial & legal transactional receipts (RENT_RECEIPT, PAYMENT_REQUEST, DATA_DELETION_REQUEST).
 */
@Injectable()
export class PruneCommunicationLogsUseCase {
  private readonly logger = new Logger(PruneCommunicationLogsUseCase.name)

  private readonly PROTECTED_FINANCIAL_TYPES = [
    'RENT_RECEIPT',
    'PAYMENT_REQUEST',
    'COMMERCE_RECEIPT',
    'DATA_DELETION_REQUEST',
  ]

  private readonly SHORT_RETENTION_NOISE_TYPES = ['SYSTEM_ALERT', 'AUTH_OTP']

  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const now = Date.now()
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000)

    // 1. Null out HTML bodies older than 30 days (keeps metadata + opens + errors)
    const bodiesPruned = await this.prisma.upward_communication_log.updateMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        body: { not: null },
      },
      data: {
        body: null,
      },
    })

    // 2. Delete high-volume internal noise (SYSTEM_ALERT, AUTH_OTP) older than 30 days
    const noiseDeleted = await this.prisma.upward_communication_log.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        type: { in: this.SHORT_RETENTION_NOISE_TYPES },
      },
    })

    // 3. Delete non-financial logs older than 90 days
    const oldLogsDeleted = await this.prisma.upward_communication_log.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        type: { notIn: this.PROTECTED_FINANCIAL_TYPES },
      },
    })

    this.logger.log(
      `Communication log retention complete: ${bodiesPruned.count} bodies stripped (>30d), ` +
        `${noiseDeleted.count} internal alert/OTP logs purged (>30d), ` +
        `${oldLogsDeleted.count} non-financial logs purged (>90d).`,
    )

    return {
      bodiesPruned: bodiesPruned.count,
      noiseDeleted: noiseDeleted.count,
      oldLogsDeleted: oldLogsDeleted.count,
    }
  }
}
