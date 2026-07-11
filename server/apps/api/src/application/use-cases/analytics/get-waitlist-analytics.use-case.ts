import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetWaitlistAnalyticsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private buildUserWhereClause(options: {
    search?: string
    isWaitlist?: string
    isInvited?: string
    unsubscribed?: string
    createdFrom?: string
    createdTo?: string
  }) {
    const {
      search,
      isWaitlist,
      isInvited,
      unsubscribed,
      createdFrom,
      createdTo,
    } = options
    const where: Prisma.upward_userWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isWaitlist === 'true') {
      where.isFromWaitlist = true
    } else if (isWaitlist === 'false') {
      where.isFromWaitlist = false
    }

    if (isInvited === 'true') {
      where.isFromInvite = true
    } else if (isInvited === 'false') {
      where.isFromInvite = false
    }

    if (unsubscribed === 'true') {
      where.unsubscribed = true
    } else if (unsubscribed === 'false') {
      where.unsubscribed = false
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom && { gte: new Date(createdFrom) }),
        ...(createdTo && { lte: new Date(createdTo) }),
      }
    }

    return where
  }

  async execute(
    options: {
      search?: string
      isWaitlist?: string
      isInvited?: string
      unsubscribed?: string
      createdFrom?: string
      createdTo?: string
    } = {},
  ) {
    const totalUsers = await this.prisma.upward_user.count()

    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const joinedLast24h = await this.prisma.upward_user.count({
      where: { createdAt: { gte: last24hStart } },
    })

    const [convertedCount, joinedFromInviteCount, selfSignupCount, launchEmailsSent, launchEmailsFailed, waitlistCount] = await Promise.all([
      this.prisma.upward_user.count({ where: { isFromWaitlist: true } }),
      this.prisma.upward_user.count({ where: { isFromInvite: true } }),
      this.prisma.upward_user.count({ where: { isFromWaitlist: false, isFromInvite: false } }),
      this.prisma.upward_communication_log.count({ where: { type: 'LAUNCH_BROADCAST', status: 'SENT' } }),
      this.prisma.upward_communication_log.count({ where: { type: 'LAUNCH_BROADCAST', status: 'FAILED' } }),
      this.prisma.upward_waitlist.count(),
    ])

    const conversionRate = waitlistCount > 0 ? (convertedCount / waitlistCount) * 100 : 0

    const interactionStats: { date: Date; count: number }[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*)::int as count
      FROM upward_user
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `

    const last10Users = await this.prisma.upward_user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    const decryptedLast10 = last10Users.map((user) => ({
      ...user,
      email: this.encryption.decrypt(user.email),
      firstName: this.encryption.decrypt(user.firstName),
      lastName: this.encryption.decrypt(user.lastName),
      phone: user.phone ? this.encryption.decrypt(user.phone) : user.phone,
    }))

    return {
      totalUsers,
      totalWaitlist: totalUsers, // Map for backward compatibility if needed by layout
      joinedLast24h,
      convertedCount,
      joinedFromInviteCount,
      selfSignupCount,
      launchEmailsSent,
      launchEmailsFailed,
      conversionRate,
      interactionStats,
      last10Users: decryptedLast10,
      distributions: {
        roles: [],
        countries: [],
        cities: [],
        benefits: [],
        roleBenefits: {},
        roleTotals: {},
        roleTotalWithBenefits: {},
        customBenefits: {
          count: 0,
          items: [],
        },
      },
    }
  }
}
