import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'

export interface GetPerformanceMetricsOptions {
  startDate?: string
  endDate?: string
  search?: string
  userType?: 'ALL' | 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID' | 'SELF_SIGNED_UP_PENDING'
}

@Injectable()
export class GetPerformanceMetricsUseCase {
  private readonly logger = new Logger(GetPerformanceMetricsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(options: GetPerformanceMetricsOptions = {}) {
    const { startDate, endDate, search, userType } = options

    // 1. Build Date Filters
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }

    // 2. Query Total Accounts (PM & Tenants)
    const [totalTenants, totalPms] = await Promise.all([
      this.prisma.upward_user.count(),
      this.prisma.upward_property_manager.count(),
    ])

    // Accounts created in the filtered period (if filter is set)
    const [periodTenants, periodPms] = await Promise.all([
      this.prisma.upward_user.count({ where: dateFilter }),
      this.prisma.upward_property_manager.count({ where: dateFilter }),
    ])

    // 3. Query Active Users (having more than 1 activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentLogs = await this.prisma.upward_app_activity_log.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        app: true,
        userEmail: true,
        userId: true,
        pmId: true,
      },
    })

    const pmLogCount: Record<string, number> = {}
    const tenantLogCount: Record<string, number> = {}

    recentLogs.forEach((log) => {
      const key = log.userEmail || (log.userId ? `u_${log.userId}` : log.pmId ? `pm_${log.pmId}` : null)
      if (!key) return

      if (log.app === 'upward-pm' || log.pmId) {
        pmLogCount[key] = (pmLogCount[key] || 0) + 1
      } else {
        tenantLogCount[key] = (tenantLogCount[key] || 0) + 1
      }
    })

    const activePmsCount = Object.values(pmLogCount).filter((count) => count > 1).length
    const activeTenantsCount = Object.values(tenantLogCount).filter((count) => count > 1).length

    // 4. Query Paying Users (has successful transaction in period)
    const txPeriodFilter: any = { status: 'SUCCESS' }
    if (startDate || endDate) {
      txPeriodFilter.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    } else {
      // Default period is last 30 days if no date range is selected
      txPeriodFilter.createdAt = { gte: thirtyDaysAgo }
    }

    const payingUsersGroup = await this.prisma.upward_transaction.groupBy({
      by: ['userId'],
      where: txPeriodFilter,
    })
    const payingUsersCount = payingUsersGroup.length

    // 5. Query Recent User Sessions/Activity Logs
    const sessionWhere: any = {}
    if (startDate || endDate) {
      sessionWhere.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }
    if (search) {
      sessionWhere.OR = [
        { userEmail: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ]
    }

    const sessions = await this.prisma.upward_app_activity_log.findMany({
      where: sessionWhere,
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    // 6. Build Detailed Users List (with Decryption)
    const allUsers = await this.prisma.upward_user.findMany({
      include: {
        transactions: {
          where: { status: 'SUCCESS' },
          select: { amount: true },
        },
      },
    })

    const pmTenants = await this.prisma.upward_pm_tenant.findMany({
      where: { inviteStatus: 'PENDING' },
    })

    const decryptedUsers = allUsers.map((u) => {
      let email = ''
      let firstName = ''
      let lastName = ''
      let phone = ''

      try {
        email = this.encryption.decrypt(u.email)
        firstName = this.encryption.decrypt(u.firstName)
        lastName = this.encryption.decrypt(u.lastName)
        phone = u.phone ? this.encryption.decrypt(u.phone) : ''
      } catch (err) {
        email = u.email
        firstName = u.firstName
        lastName = u.lastName
        phone = u.phone || ''
      }

      const totalPaid = u.transactions.reduce((sum, tx) => sum + tx.amount, 0)
      const hasPaid = u.transactions.length > 0

      const isShadow =
        u.passwordHash === PASS_PLACEHOLDERS.INVITED ||
        u.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
        !u.passwordHash.startsWith('$2')

      let status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID' | 'SELF_SIGNED_UP_PENDING' =
        'SELF_SIGNED_UP_PENDING'

      if (u.isFromInvite) {
        if (isShadow) {
          status = hasPaid ? 'GUEST_PAID' : 'INVITED_PENDING'
        } else {
          status = hasPaid ? 'SIGNED_UP_PAID' : 'INVITED_SIGNED_UP'
        }
      } else {
        if (hasPaid) {
          status = 'SIGNED_UP_PAID'
        }
      }

      return {
        id: u.id.toString(),
        uuid: u.uuid,
        email,
        firstName,
        lastName,
        phone,
        isFromInvite: u.isFromInvite,
        isFromWaitlist: u.isFromWaitlist,
        status,
        totalPaid,
        createdAt: u.createdAt,
      }
    })

    // Add PM Tenants who haven't signed up at all
    const userEmails = new Set(decryptedUsers.map((u) => u.email.toLowerCase()))
    const uncreatedInvites = pmTenants
      .map((t) => {
        let email = ''
        let firstName = ''
        let lastName = ''
        let phone = ''

        try {
          email = t.emailEncrypted ? this.encryption.decrypt(t.emailEncrypted) : ''
          firstName = t.firstNameEncrypted ? this.encryption.decrypt(t.firstNameEncrypted) : ''
          lastName = t.lastNameEncrypted ? this.encryption.decrypt(t.lastNameEncrypted) : ''
          phone = t.phoneEncrypted ? this.encryption.decrypt(t.phoneEncrypted) : ''
        } catch (err) {
          email = t.emailEncrypted || ''
          firstName = t.firstNameSearch || ''
          lastName = t.lastNameSearch || ''
          phone = t.phoneEncrypted || ''
        }

        return {
          id: `pm_t_${t.id}`,
          uuid: t.uuid,
          email,
          firstName,
          lastName,
          phone,
          isFromInvite: true,
          isFromWaitlist: false,
          status: 'INVITED_PENDING' as const,
          totalPaid: 0,
          createdAt: t.createdAt,
        }
      })
      .filter((t) => t.email && !userEmails.has(t.email.toLowerCase()))

    // Combine lists
    let combinedUsers = [...decryptedUsers, ...uncreatedInvites]

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      combinedUsers = combinedUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          u.phone.includes(searchLower),
      )
    }

    if (userType && userType !== 'ALL') {
      combinedUsers = combinedUsers.filter((u) => u.status === userType)
    }

    return {
      metrics: {
        totalUsers: {
          tenantCount: totalTenants,
          pmCount: totalPms,
          total: totalTenants + totalPms,
        },
        periodCreated: {
          tenantCount: periodTenants,
          pmCount: periodPms,
          total: periodTenants + periodPms,
        },
        activeUsers: {
          tenantCount: activeTenantsCount,
          pmCount: activePmsCount,
          total: activeTenantsCount + activePmsCount,
        },
        payingUsers: payingUsersCount,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        app: s.app,
        userRole: s.userRole,
        userEmail: s.userEmail || 'Guest / Anon',
        action: s.action,
        description: s.description,
        ipAddress: s.ipAddress || 'unknown',
        userAgent: s.userAgent || 'unknown',
        createdAt: s.createdAt,
      })),
      users: combinedUsers,
    }
  }
}
